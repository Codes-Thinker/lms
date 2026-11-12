import 'package:flutter/foundation.dart';
import '../models/fee_payment.dart';

class FeeProvider extends ChangeNotifier {
  /// Admin payment details shown to students for online transfer.
  String adminName = 'Ayaz Aslam';
  String adminPhone = '+92 300 0000001';
  String jazzCash = '0300-0000001';
  String easyPaisa = '0300-0000001';
  String bankTitle = "Code's Thinker";
  String bankAccount = 'PK00 CTBK 0000 0000 0001';

  bool _loading = false;
  List<FeePaymentCase> _cases = [
    FeePaymentCase(
      id: 'fee-case-1',
      courseId: 'c-flutter-1',
      courseTitle: 'Flutter Development Internship',
      month: 'Nov 2026',
      amount: 12000,
      status: 'DUE',
      chat: [
        FeeChatMessage(
          id: 'fc1',
          senderName: 'Ayaz Aslam',
          senderRole: 'ADMIN',
          text:
              'Assalam o Alaikum. Online fee transfer JazzCash / EasyPaisa: 0300-0000001 (Ayaz Aslam). Screenshot yahan bhejo, approve ke baad Paid ho jayega.',
          sentAt: '09:00',
        ),
      ],
    ),
    FeePaymentCase(
      id: 'fee-case-2',
      courseId: 'c-mern-1',
      courseTitle: 'MERN Stack Development',
      month: 'Nov 2026',
      amount: 15000,
      status: 'DUE',
      chat: [
        FeeChatMessage(
          id: 'fc2',
          senderName: 'Ayaz Aslam',
          senderRole: 'ADMIN',
          text: 'MERN Nov fee Rs 15,000. Same JazzCash number pe transfer karke screenshot attach karo.',
          sentAt: '09:05',
        ),
      ],
    ),
  ];

  bool get loading => _loading;
  List<FeePaymentCase> get cases => List.unmodifiable(_cases);
  int get pendingAmount => _cases
      .where((c) => c.status != 'APPROVED')
      .fold(0, (s, c) => s + c.amount);

  FeePaymentCase? byId(String id) {
    try {
      return _cases.firstWhere((c) => c.id == id);
    } catch (_) {
      return null;
    }
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
    await Future<void>.delayed(const Duration(milliseconds: 350));
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
      final nextStatus = withScreenshot ? 'SENT' : c.status;
      return c.copyWith(
        status: nextStatus == 'APPROVED' ? c.status : nextStatus,
        chat: [...c.chat, msg],
      );
    }).toList();
    _loading = false;
    notifyListeners();
  }

  /// Simulates admin approve (also used from fee chat demo “request review”).
  Future<void> markSent(String caseId) async {
    _cases = _cases
        .map((c) => c.id == caseId && c.status == 'DUE' ? c.copyWith(status: 'SENT') : c)
        .toList();
    notifyListeners();
  }

  Future<void> approve(String caseId, {String adminName = 'Ayaz Aslam'}) async {
    _loading = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 400));
    final now = DateTime.now();
    final stamp =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    _cases = _cases.map((c) {
      if (c.id != caseId) return c;
      return c.copyWith(
        status: 'APPROVED',
        chat: [
          ...c.chat,
          FeeChatMessage(
            id: 'fa-${now.millisecondsSinceEpoch}',
            senderName: adminName,
            senderRole: 'ADMIN',
            text: 'Payment verified. Fee marked PAID / Done ✓',
            sentAt: stamp,
          ),
        ],
      );
    }).toList();
    _loading = false;
    notifyListeners();
  }
}
