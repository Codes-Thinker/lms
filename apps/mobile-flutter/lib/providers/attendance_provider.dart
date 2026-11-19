import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import '../services/api_client.dart';
import '../services/local_cache.dart';

class AttendanceMark {
  final String id;
  final String personId;
  final String personName;
  final String role;
  final String status; // PRESENT | LATE | ABSENT | CHECKED_OUT
  final DateTime checkInAt;
  final DateTime? checkOutAt;
  final String source;
  final String? courseTitle;

  AttendanceMark({
    required this.id,
    required this.personId,
    required this.personName,
    required this.role,
    required this.status,
    required this.checkInAt,
    this.checkOutAt,
    this.source = 'APP',
    this.courseTitle,
  });

  DateTime get markedAt => checkInAt;

  bool get isCheckedIn => checkOutAt == null && status != 'ABSENT';
  bool get isCheckedOut => checkOutAt != null;

  String get durationLabel {
    final end = checkOutAt ?? DateTime.now();
    final mins = end.difference(checkInAt).inMinutes;
    final h = mins ~/ 60;
    final m = mins % 60;
    if (h <= 0) return '${m}m';
    return '${h}h ${m}m';
  }

  AttendanceMark copyWith({
    String? status,
    DateTime? checkOutAt,
  }) {
    return AttendanceMark(
      id: id,
      personId: personId,
      personName: personName,
      role: role,
      status: status ?? this.status,
      checkInAt: checkInAt,
      checkOutAt: checkOutAt ?? this.checkOutAt,
      source: source,
      courseTitle: courseTitle,
    );
  }

  factory AttendanceMark.fromApi(Map<String, dynamic> json) {
    return AttendanceMark(
      id: json['id'] as String,
      personId: json['personId'] as String? ?? '',
      personName: json['personName'] as String? ?? '',
      role: json['role'] as String? ?? '',
      status: json['status'] as String? ?? 'PRESENT',
      checkInAt: (DateTime.tryParse(json['checkInAt'] as String? ?? '') ??
              DateTime.tryParse(json['markedAt'] as String? ?? '') ??
              DateTime.now())
          .toLocal(),
      checkOutAt:
          DateTime.tryParse(json['checkOutAt'] as String? ?? '')?.toLocal(),
      source: json['source'] as String? ?? 'APP',
      courseTitle: json['courseTitle'] as String?,
    );
  }
}

class AttendanceProvider extends ChangeNotifier {
  final List<AttendanceMark> _today = [];
  final List<AttendanceMark> _history = [];
  bool _loading = false;

  // Geofence state
  bool _insideGeofence = false;
  int _distanceFromOffice = -1;
  bool _checkingLocation = false;
  bool _hasGpsFix = false;
  double? _officeLat;
  double? _officeLng;
  int _geofenceRadius = 50;
  /// Hysteresis streaks to absorb GPS jitter at the boundary.
  int _outsideStreak = 0;
  int _insideStreak = 0;
  static const _outsideFlipThreshold = 4;
  static const _insideFlipThreshold = 2;
  /// Extra meters beyond radius before we treat a sample as "left".
  static const _leaveBufferMeters = 28;

  bool get insideGeofence => _insideGeofence;
  int get distanceFromOffice => _distanceFromOffice;
  bool get checkingLocation => _checkingLocation;
  bool get hasGpsFix => _hasGpsFix;
  int get geofenceRadius => _geofenceRadius;
  double? get officeLat => _officeLat;
  double? get officeLng => _officeLng;

  static double haversineMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const r = 6371000.0;
    double toRad(double d) => d * math.pi / 180;
    final dLat = toRad(lat2 - lat1);
    final dLon = toRad(lon2 - lon1);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(toRad(lat1)) *
            math.cos(toRad(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  }

  /// Pull admin office pin once so UI works without waiting on every verify.
  Future<void> loadOfficeConfig() async {
    if (_officeLat != null && _officeLng != null) return;
    try {
      final data = await ApiClient.instance.get('/system/office-config');
      if (data is Map<String, dynamic>) {
        _officeLat = (data['latitude'] as num?)?.toDouble();
        _officeLng = (data['longitude'] as num?)?.toDouble();
        _geofenceRadius = (data['radiusMeters'] as num?)?.toInt() ?? 50;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Office config load failed: $e');
    }
  }

  void _applyHysteresis(bool rawInside) {
    if (rawInside) {
      _outsideStreak = 0;
      if (_insideGeofence) {
        _insideStreak = 0;
        return;
      }
      _insideStreak += 1;
      // First GPS fix can enter immediately; later edges need 2 samples.
      final need = _hasGpsFix ? _insideFlipThreshold : 1;
      if (_insideStreak >= need) {
        _insideGeofence = true;
        _insideStreak = 0;
      }
    } else {
      _insideStreak = 0;
      if (_insideGeofence) {
        _outsideStreak += 1;
        if (_outsideStreak >= _outsideFlipThreshold) {
          _insideGeofence = false;
          _outsideStreak = 0;
        }
      } else {
        _outsideStreak = 0;
      }
    }
  }

  /// Local geofence update (stable UI). Optionally sync with backend.
  Future<void> applyGpsSample(
    double lat,
    double lng, {
    double? accuracyMeters,
    bool silent = true,
    bool syncApi = true,
  }) async {
    if (_officeLat == null || _officeLng == null) {
      await loadOfficeConfig();
    }

    if (_officeLat != null && _officeLng != null) {
      final dist = haversineMeters(lat, lng, _officeLat!, _officeLng!);
      final accuracy = (accuracyMeters ?? 15).clamp(8, 45);
      // Soft enter: allow GPS error so indoor users near the pin count as inside.
      final enterLimit = _geofenceRadius + accuracy;
      final leaveLimit = _geofenceRadius + _leaveBufferMeters + accuracy * 0.5;
      final rawInside = _insideGeofence ? dist <= leaveLimit : dist <= enterLimit;

      final prevInside = _insideGeofence;
      final prevDist = _distanceFromOffice;
      _applyHysteresis(rawInside);
      _distanceFromOffice = dist.round();
      _hasGpsFix = true;

      if (!silent ||
          prevInside != _insideGeofence ||
          prevDist != _distanceFromOffice) {
        notifyListeners();
      }
    } else if (!silent) {
      _checkingLocation = true;
      notifyListeners();
    }

    if (syncApi) {
      await verifyLocation(lat, lng, silent: true, updateHysteresis: false);
    } else if (!silent) {
      _checkingLocation = false;
      notifyListeners();
    }
  }

  List<AttendanceMark> get today => List.unmodifiable(_today);
  List<AttendanceMark> get history => List.unmodifiable(_history);
  bool get loading => _loading;

  AttendanceMark? todayFor(String personId) {
    try {
      return _today.firstWhere((m) => m.personId == personId);
    } catch (_) {
      return null;
    }
  }

  String autoStatus([DateTime? now]) {
    final n = now ?? DateTime.now();
    final cutoff = DateTime(n.year, n.month, n.day, 10, 5);
    if (n.isAfter(cutoff)) return 'LATE';
    return 'PRESENT';
  }

  Future<void> loadMine() async {
    _loading = true;
    notifyListeners();

    final cached = await LocalCache.getMap(LocalCache.attendanceMine);
    if (cached != null) {
      _today
        ..clear()
        ..addAll(
          ((cached['today'] as List?) ?? const [])
              .whereType<Map>()
              .map((e) => AttendanceMark.fromApi(Map<String, dynamic>.from(e))),
        );
      _history
        ..clear()
        ..addAll(
          ((cached['history'] as List?) ?? const [])
              .whereType<Map>()
              .map((e) => AttendanceMark.fromApi(Map<String, dynamic>.from(e))),
        );
      _loading = false;
      notifyListeners();
    }

    try {
      final today = await ApiClient.instance.get('/attendance/today');
      final hist = await ApiClient.instance.get('/attendance/me');
      _today.clear();
      if (today is Map<String, dynamic>) {
        _today.add(AttendanceMark.fromApi(today));
      }
      final histList = (hist as List?) ?? const [];
      _history
        ..clear()
        ..addAll(
          histList
              .map((e) => AttendanceMark.fromApi(e as Map<String, dynamic>)),
        );
      await LocalCache.setJson(LocalCache.attendanceMine, {
        'today': today is Map ? [today] : <dynamic>[],
        'history': histList,
      });
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  void clearMemory() {
    _today.clear();
    _history.clear();
    notifyListeners();
  }

  Future<AttendanceMark> checkIn({
    required String personId,
    required String personName,
    required String role,
    double? lat,
    double? lng,
  }) async {
    if (lat == null || lng == null) {
      throw Exception('Location required for check-in');
    }
    _loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.post(
        '/attendance/check-in',
        body: {'lat': lat, 'lng': lng},
      ) as Map<String, dynamic>;
      final mark = AttendanceMark.fromApi(data);
      _today
        ..removeWhere((m) => m.personId == personId)
        ..insert(0, mark);
      _loading = false;
      notifyListeners();
      return mark;
    } catch (e) {
      _loading = false;
      notifyListeners();
      rethrow;
    }
  }

  /// Verify geofence location — calls backend to check distance.
  /// [silent] skips loading flicker + keeps last good fix on network blips.
  /// When [updateHysteresis] is false, only refreshes office pin/radius cache
  /// (local [applyGpsSample] already owns inside/outside state).
  Future<void> verifyLocation(
    double lat,
    double lng, {
    bool silent = false,
    bool updateHysteresis = true,
  }) async {
    if (!silent) {
      _checkingLocation = true;
      notifyListeners();
    }
    try {
      final data = await ApiClient.instance.post('/attendance/verify-location',
          body: {'lat': lat, 'lng': lng}) as Map<String, dynamic>;
      final rawInside = data['inside'] as bool? ?? false;
      final dist = (data['distance'] as num?)?.toInt() ?? -1;
      final officeLat = (data['officeLat'] as num?)?.toDouble();
      final officeLng = (data['officeLng'] as num?)?.toDouble();
      final radius = (data['radius'] as num?)?.toInt() ?? 50;

      _officeLat = officeLat ?? _officeLat;
      _officeLng = officeLng ?? _officeLng;
      _geofenceRadius = radius;
      if (dist >= 0) _distanceFromOffice = dist;
      _hasGpsFix = true;

      if (updateHysteresis) {
        _applyHysteresis(rawInside);
      }

      if (!silent) _checkingLocation = false;
      notifyListeners();
    } catch (e) {
      debugPrint('Location verify failed: $e');
      // Keep last good geofence state on silent/network errors — no flicker.
      if (!silent) {
        _checkingLocation = false;
        notifyListeners();
      }
    }
  }

  /// Process arrival reminder — sends at most one per day.
  Future<bool> processArrivalReminder(double lat, double lng) async {
    try {
      final data = await ApiClient.instance.post(
        '/attendance/arrival-reminder',
        body: {'lat': lat, 'lng': lng},
      ) as Map<String, dynamic>;
      return data['reminderSent'] == true;
    } catch (e) {
      debugPrint('Arrival reminder failed: $e');
      return false;
    }
  }

  /// Left office while still checked in — server pushes once/day.
  Future<bool> processExitReminder(double lat, double lng) async {
    try {
      final data = await ApiClient.instance.post(
        '/attendance/exit-reminder',
        body: {'lat': lat, 'lng': lng},
      ) as Map<String, dynamic>;
      return data['reminderSent'] == true;
    } catch (e) {
      debugPrint('Exit reminder failed: $e');
      return false;
    }
  }

  Future<AttendanceMark> markSelf({
    required String personId,
    required String personName,
    required String role,
  }) =>
      checkIn(personId: personId, personName: personName, role: role);

  Future<AttendanceMark?> checkOut(String personId) async {
    final existing = todayFor(personId);
    if (existing == null || existing.checkOutAt != null) return existing;
    _loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.post('/attendance/check-out')
          as Map<String, dynamic>;
      final updated = AttendanceMark.fromApi(data);
      final idx = _today.indexWhere((m) => m.personId == personId);
      if (idx >= 0) _today[idx] = updated;
      _loading = false;
      notifyListeners();
      return updated;
    } catch (_) {
      final at = DateTime.now();
      final updated = existing.copyWith(status: 'CHECKED_OUT', checkOutAt: at);
      final idx = _today.indexWhere((m) => m.personId == personId);
      if (idx >= 0) _today[idx] = updated;
      _loading = false;
      notifyListeners();
      return updated;
    }
  }
}
