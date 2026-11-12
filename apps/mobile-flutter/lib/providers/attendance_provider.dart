import 'package:flutter/foundation.dart';

class AttendanceMark {
  final String id;
  final String personId;
  final String personName;
  final String role;
  final String status; // PRESENT | LATE | ABSENT | CHECKED_OUT
  final DateTime checkInAt;
  final DateTime? checkOutAt;
  final String source;

  AttendanceMark({
    required this.id,
    required this.personId,
    required this.personName,
    required this.role,
    required this.status,
    required this.checkInAt,
    this.checkOutAt,
    this.source = 'APP',
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
    );
  }
}

class AttendanceProvider extends ChangeNotifier {
  final List<AttendanceMark> _today = [];
  bool _loading = false;

  List<AttendanceMark> get today => List.unmodifiable(_today);
  bool get loading => _loading;

  AttendanceMark? todayFor(String personId) {
    try {
      return _today.firstWhere((m) => m.personId == personId);
    } catch (_) {
      return null;
    }
  }

  /// Auto status from real device time: after 10:05 = LATE
  String autoStatus([DateTime? now]) {
    final n = now ?? DateTime.now();
    final cutoff = DateTime(n.year, n.month, n.day, 10, 5);
    if (n.isAfter(cutoff)) return 'LATE';
    return 'PRESENT';
  }

  Future<AttendanceMark> checkIn({
    required String personId,
    required String personName,
    required String role,
  }) async {
    _loading = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 450));
    final at = DateTime.now();
    final status = autoStatus(at);
    _today.removeWhere((m) => m.personId == personId);
    final mark = AttendanceMark(
      id: 'att-${at.millisecondsSinceEpoch}',
      personId: personId,
      personName: personName,
      role: role,
      status: status,
      checkInAt: at,
    );
    _today.insert(0, mark);
    _loading = false;
    notifyListeners();
    return mark;
  }

  /// Back-compat alias
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
    await Future<void>.delayed(const Duration(milliseconds: 400));
    final at = DateTime.now();
    final updated = existing.copyWith(status: 'CHECKED_OUT', checkOutAt: at);
    final idx = _today.indexWhere((m) => m.personId == personId);
    if (idx >= 0) _today[idx] = updated;
    _loading = false;
    notifyListeners();
    return updated;
  }
}
