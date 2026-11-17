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
      checkInAt: DateTime.tryParse(json['checkInAt'] as String? ?? '') ??
          DateTime.tryParse(json['markedAt'] as String? ?? '') ??
          DateTime.now(),
      checkOutAt: DateTime.tryParse(json['checkOutAt'] as String? ?? ''),
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
  double? _officeLat;
  double? _officeLng;
  int _geofenceRadius = 50;

  bool get insideGeofence => _insideGeofence;
  int get distanceFromOffice => _distanceFromOffice;
  bool get checkingLocation => _checkingLocation;
  int get geofenceRadius => _geofenceRadius;
  double? get officeLat => _officeLat;
  double? get officeLng => _officeLng;

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
  /// [silent] skips loading flicker + skips notify when nothing changed
  /// (used by GPS stream so Attend tab does not blink).
  Future<void> verifyLocation(
    double lat,
    double lng, {
    bool silent = false,
  }) async {
    if (!silent) {
      _checkingLocation = true;
      notifyListeners();
    }
    try {
      final data = await ApiClient.instance.post('/attendance/verify-location',
          body: {'lat': lat, 'lng': lng}) as Map<String, dynamic>;
      final inside = data['inside'] as bool? ?? false;
      final dist = (data['distance'] as num?)?.toInt() ?? -1;
      final officeLat = (data['officeLat'] as num?)?.toDouble();
      final officeLng = (data['officeLng'] as num?)?.toDouble();
      final radius = (data['radius'] as num?)?.toInt() ?? 50;
      final changed = inside != _insideGeofence ||
          dist != _distanceFromOffice ||
          radius != _geofenceRadius ||
          officeLat != _officeLat ||
          officeLng != _officeLng;
      _insideGeofence = inside;
      _distanceFromOffice = dist;
      _officeLat = officeLat;
      _officeLng = officeLng;
      _geofenceRadius = radius;
      if (!silent) _checkingLocation = false;
      if (changed || !silent) notifyListeners();
    } catch (e) {
      debugPrint('Location verify failed: $e');
      final changed = _insideGeofence || _distanceFromOffice != -1;
      _insideGeofence = false;
      _distanceFromOffice = -1;
      if (!silent) _checkingLocation = false;
      if (changed || !silent) notifyListeners();
    }
  }

  /// Process arrival reminder — sends at most one per day.
  Future<void> processArrivalReminder(double lat, double lng) async {
    try {
      await ApiClient.instance
          .post('/attendance/arrival-reminder', body: {'lat': lat, 'lng': lng});
    } catch (e) {
      debugPrint('Arrival reminder failed: $e');
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
