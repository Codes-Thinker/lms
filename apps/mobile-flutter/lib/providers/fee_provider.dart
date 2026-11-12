import 'package:flutter/foundation.dart';
import '../models/fee_payment.dart';
import '../services/api_client.dart';
import '../services/local_cache.dart';

class FeeProvider extends ChangeNotifier {
  String adminName = 'Ayaz Aslam';
  String adminPhone = '+92 300 0000001';
  String jazzCash = '0300-0000001';
  String easyPaisa = '0300-0000001';
  String bankTitle = "Code's Thinker";
  String bankAccount = 'PK00 CTBK 0000 0000 0001';

  bool _loading = false;
  List<FeePaymentCase> _cases = [];

  bool get loading => _loading;
  List<FeePaymentCase> get cases => List.unmodifiable(_cases);
  int get pendingAmount => _cases
      .where((c) => c.status != 'APPROVED' && c.status != 'PAID')
      .fold(0, (s, c) => s + c.amount);

  FeePaymentCase? byId(String id) {
    try {
      return _cases.firstWhere((c) => c.id == id);
    } catch (_) {
      return null;
    }
  }

  String _mapStatus(String? s) {
    if (s == 'PAID') return 'APPROVED';
    return s ?? 'DUE';
  }

  List<FeePaymentCase> _mapCases(List<dynamic> data) {
    return data.map((e) {
      final j = Map<String, dynamic>.from(e as Map);
      final chat = ((j['chat'] as List?) ?? const []).map((m) {
        final msg = Map<String, dynamic>.from(m as Map);
        return FeeChatMessage(
          id: msg['id'] as String? ?? '',
          senderName: msg['senderName'] as String? ?? '',
          senderRole: msg['senderRole'] as String? ?? 'ADMIN',
          text: msg['text'] as String? ?? '',
          sentAt: msg['sentAt'] as String? ?? '',
          hasScreenshot: msg['hasScreenshot'] as bool? ?? false,
        );
      }).toList();
      return FeePaymentCase(
        id: j['id'] as String,
        courseId: '',
        courseTitle: j['courseTitle'] as String? ?? '',
        month: j['month'] as String? ?? '',
        amount: (j['amount'] as num?)?.toInt() ?? 0,
        status: _mapStatus(j['status'] as String?),
        chat: chat,
      );
    }).toList();
  }

  void _applyPaymentInfo(Map<String, dynamic> pay) {
    adminName = pay['adminName'] as String? ?? adminName;
    adminPhone = pay['phone'] as String? ?? adminPhone;
    jazzCash = pay['jazzCash'] as String? ?? jazzCash;
    easyPaisa = pay['easyPaisa'] as String? ?? easyPaisa;
    bankTitle = pay['bankTitle'] as String? ?? bankTitle;
    bankAccount = pay['bankAccount'] as String? ?? bankAccount;
  }

  Future<void> load() async {
    _loading = true;
    notifyListeners();

    final cachedPay = await LocalCache.getMap(LocalCache.feePaymentInfo);
    final cachedFees = await LocalCache.getList(LocalCache.fees);
    if (cachedPay != null) _applyPaymentInfo(cachedPay);
    if (cachedFees.isNotEmpty) {
      _cases = _mapCases(cachedFees);
      _loading = false;
      notifyListeners();
    }

    try {
      final pay = await ApiClient.instance.get('/fees/payment-info');
      if (pay is Map<String, dynamic>) {
        _applyPaymentInfo(pay);
        await LocalCache.setJson(LocalCache.feePaymentInfo, pay);
      }
      final data = await ApiClient.instance.get('/fees/me');
      if (data is List) {
        _cases = _mapCases(data);
        await LocalCache.setJson(LocalCache.fees, data);
      }
    } catch (_) {
      // keep cache / previous
    }
    _loading = false;
    notifyListeners();
  }

  void clearMemory() {
    _cases = [];
    adminName = 'Ayaz Aslam';
    notifyListeners();
  }

  Future<void> sendMessage({
    required String caseId,
    required String senderName,
    required String text,
    bool withScreenshot = false,
  }) async {
    if (text.trim().isEmpty && !withScreenshot) return;
    _loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.post(
        '/fees/$caseId/messages',
        body: {
          'text': text.trim().isEmpty
              ? 'Payment screenshot attached'
              : text.trim(),
          'hasScreenshot': withScreenshot,
        },
      ) as Map<String, dynamic>;
      final chat = ((data['chat'] as List?) ?? const []).map((m) {
        final msg = m as Map<String, dynamic>;
        return FeeChatMessage(
          id: msg['id'] as String? ?? '',
          senderName: msg['senderName'] as String? ?? '',
          senderRole: msg['senderRole'] as String? ?? 'STUDENT',
          text: msg['text'] as String? ?? '',
          sentAt: msg['sentAt'] as String? ?? '',
          hasScreenshot: msg['hasScreenshot'] as bool? ?? false,
        );
      }).toList();
      _cases = _cases.map((c) {
        if (c.id != caseId) return c;
        return c.copyWith(
          status: _mapStatus(data['status'] as String?),
          chat: chat,
        );
      }).toList();
    } catch (_) {
      final now = DateTime.now();
      final stamp =
          '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
      _cases = _cases.map((c) {
        if (c.id != caseId) return c;
        final msg = FeeChatMessage(
          id: 'fm-${now.millisecondsSinceEpoch}',
          senderName: senderName,
          senderRole: 'STUDENT',
          text: text.trim().isEmpty
              ? 'Payment screenshot attached'
              : text.trim(),
          sentAt: stamp,
          hasScreenshot: withScreenshot,
          screenshotLabel: withScreenshot ? 'payment_screenshot.jpg' : null,
        );
        return c.copyWith(
          status: withScreenshot ? 'SENT' : c.status,
          chat: [...c.chat, msg],
        );
      }).toList();
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> approve(String caseId) async {
    _loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.patch(
        '/fees/$caseId/status',
        body: {'status': 'PAID'},
      ) as Map<String, dynamic>;
      _cases = _cases.map((c) {
        if (c.id != caseId) return c;
        return c.copyWith(status: 'APPROVED');
      }).toList();
      // keep chat from response if present
      if (data['chat'] is List) {
        final chat = (data['chat'] as List).map((m) {
          final msg = m as Map<String, dynamic>;
          return FeeChatMessage(
            id: msg['id'] as String? ?? '',
            senderName: msg['senderName'] as String? ?? '',
            senderRole: msg['senderRole'] as String? ?? 'ADMIN',
            text: msg['text'] as String? ?? '',
            sentAt: msg['sentAt'] as String? ?? '',
            hasScreenshot: msg['hasScreenshot'] as bool? ?? false,
          );
        }).toList();
        _cases = _cases.map((c) {
          if (c.id != caseId) return c;
          return c.copyWith(status: 'APPROVED', chat: chat);
        }).toList();
      }
    } catch (_) {
      _cases = _cases.map((c) {
        if (c.id != caseId) return c;
        return c.copyWith(status: 'APPROVED');
      }).toList();
    }
    _loading = false;
    notifyListeners();
  }

}
