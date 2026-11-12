import 'package:flutter/foundation.dart';
import '../services/api_client.dart';

class ReportCourseRow {
  final String id;
  final String title;
  final String? batch;
  final double progressPercent;
  final String? feeStatus;
  final int paidAmount;
  final int totalFee;
  final int topicsDone;
  final int topicsTotal;
  final String? nextTopic;

  ReportCourseRow({
    required this.id,
    required this.title,
    this.batch,
    required this.progressPercent,
    this.feeStatus,
    required this.paidAmount,
    required this.totalFee,
    required this.topicsDone,
    required this.topicsTotal,
    this.nextTopic,
  });
}

class ReportProvider extends ChangeNotifier {
  bool _disposed = false;
  bool _loading = false;
  String? _error;
  double attendancePercent = 0;
  int feesPending = 0;
  List<ReportCourseRow> courses = [];

  bool get loading => _loading;
  String? get error => _error;

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  Future<void> loadMe() async {
    _loading = true;
    _error = null;
    _notify();
    try {
      final data =
          await ApiClient.instance.get('/reports/me') as Map<String, dynamic>;
      if (_disposed) return;
      attendancePercent =
          (data['attendancePercent'] as num?)?.toDouble() ?? 0;
      feesPending = (data['feesPending'] as num?)?.toInt() ?? 0;
      final list = (data['courses'] as List?) ?? const [];
      courses = list.map((e) {
        final c = e as Map<String, dynamic>;
        final outline = (c['outline'] as List?) ?? const [];
        var done = 0;
        var total = 0;
        String? next;
        for (final s in outline) {
          final topics = ((s as Map)['topics'] as List?) ?? const [];
          for (final t in topics) {
            total++;
            final tm = t as Map;
            if (tm['completed'] == true) {
              done++;
            } else {
              next ??= tm['title'] as String?;
            }
          }
        }
        return ReportCourseRow(
          id: c['id'] as String,
          title: c['title'] as String? ?? '',
          batch: c['batch'] as String?,
          progressPercent: (c['progressPercent'] as num?)?.toDouble() ?? 0,
          feeStatus: c['feeStatus'] as String?,
          paidAmount: (c['paidAmount'] as num?)?.toInt() ?? 0,
          totalFee: (c['totalFee'] as num?)?.toInt() ?? 0,
          topicsDone: done,
          topicsTotal: total,
          nextTopic: next,
        );
      }).toList();
    } catch (e) {
      if (_disposed) return;
      _error = e.toString();
    }
    if (_disposed) return;
    _loading = false;
    _notify();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
