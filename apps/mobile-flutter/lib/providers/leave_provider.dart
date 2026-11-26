import 'package:flutter/foundation.dart';
import '../models/leave_request.dart';
import '../services/api_client.dart';

class LeaveProvider extends ChangeNotifier {
  bool _loading = false;
  String? _error;
  LeaveBalance? _balance;
  List<LeaveRequest> _requests = [];

  bool get loading => _loading;
  String? get error => _error;
  LeaveBalance? get balance => _balance;
  List<LeaveRequest> get requests => List.unmodifiable(_requests);

  Future<void> load({bool silent = false}) async {
    if (!silent) {
      _loading = true;
      _error = null;
      notifyListeners();
    }
    try {
      final bal = await ApiClient.instance.get('/leave/me/balance');
      if (bal is Map<String, dynamic>) {
        _balance = LeaveBalance.fromApi(bal);
      }
      final list = await ApiClient.instance.get('/leave/me');
      if (list is List) {
        _requests = list
            .whereType<Map>()
            .map((e) => LeaveRequest.fromApi(Map<String, dynamic>.from(e)))
            .toList();
      }
      _error = null;
    } catch (e) {
      _error = e.toString();
      debugPrint('Leave load failed: $e');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<LeaveRequest> submit({
    required String leaveDate,
    required double durationDays,
    required String reason,
  }) async {
    final data = await ApiClient.instance.post(
      '/leave/me',
      body: {
        'leaveDate': leaveDate,
        'durationDays': durationDays,
        'reason': reason,
      },
    ) as Map<String, dynamic>;
    final created = LeaveRequest.fromApi(data);
    await load(silent: true);
    return created;
  }

  void clearMemory() {
    _balance = null;
    _requests = [];
    _error = null;
    _loading = false;
    notifyListeners();
  }
}
