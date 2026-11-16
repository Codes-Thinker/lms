import 'dart:convert';

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

  List<FeeChatMessage> _mapChat(List? raw) {
    return (raw ?? const []).map((m) {
      final msg = Map<String, dynamic>.from(m as Map);
      return FeeChatMessage(
        id: msg['id'] as String? ?? '',
        senderName: msg['senderName'] as String? ?? '',
        senderRole: msg['senderRole'] as String? ?? 'ADMIN',
        text: msg['text'] as String? ?? '',
        sentAt: msg['sentAt'] as String? ?? '',
        hasScreenshot: msg['hasScreenshot'] as bool? ?? false,
        screenshotData: msg['screenshotData'] as String?,
      );
    }).toList();
  }

  List<FeePaymentCase> _mapCases(List<dynamic> data) {
    return data.map((e) {
      final j = Map<String, dynamic>.from(e as Map);
      return FeePaymentCase(
        id: j['id'] as String,
        courseId: j['courseId'] as String? ?? '',
        courseTitle: j['courseTitle'] as String? ?? '',
        month: j['month'] as String? ?? '',
        amount: (j['amount'] as num?)?.toInt() ?? 0,
        status: _mapStatus(j['status'] as String?),
        chat: _mapChat(j['chat'] as List?),
        paymentScreenshotData: j['paymentScreenshotData'] as String?,
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

  void _applyCaseResponse(String caseId, Map<String, dynamic> data) {
    final chat = _mapChat(data['chat'] as List?);
    _cases = _cases.map((c) {
      if (c.id != caseId) return c;
      return c.copyWith(
        status: _mapStatus(data['status'] as String?),
        chat: chat,
        paymentScreenshotData:
            data['paymentScreenshotData'] as String? ?? c.paymentScreenshotData,
      );
    }).toList();
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
  }) async {
    if (text.trim().isEmpty) return;
    _loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.post(
        '/fees/$caseId/messages',
        body: {'text': text.trim(), 'hasScreenshot': false},
      ) as Map<String, dynamic>;
      _applyCaseResponse(caseId, data);
    } catch (e) {
      debugPrint('Fee message failed: $e');
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Upload a real payment screenshot (JPEG bytes) for admin review.
  Future<void> submitPaymentScreenshot({
    required String caseId,
    required Uint8List imageBytes,
    String fileName = 'payment_screenshot.jpg',
  }) async {
    final fee = byId(caseId);
    if (fee == null) throw StateError('Fee case not found');

    _loading = true;
    notifyListeners();
    try {
      final dataUrl =
          'data:image/jpeg;base64,${base64Encode(imageBytes)}';
      final data = await ApiClient.instance.post(
        '/fees/$caseId/submit-payment',
        body: {
          'amount': fee.amount,
          'screenshotData': dataUrl,
          'screenshotName': fileName,
        },
      ) as Map<String, dynamic>;
      _applyCaseResponse(caseId, data);
      // Refresh list so admin-side status stays in sync next poll.
      await load();
    } catch (e) {
      debugPrint('Fee screenshot upload failed: $e');
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
