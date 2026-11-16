class FeeChatMessage {
  final String id;
  final String senderName;
  final String senderRole; // STUDENT | ADMIN
  final String text;
  final String sentAt;
  final bool hasScreenshot;
  final String? screenshotLabel;
  final String? screenshotData;

  const FeeChatMessage({
    required this.id,
    required this.senderName,
    required this.senderRole,
    required this.text,
    required this.sentAt,
    this.hasScreenshot = false,
    this.screenshotLabel,
    this.screenshotData,
  });
}

class FeePaymentCase {
  final String id;
  final String courseId;
  final String courseTitle;
  final String month;
  final int amount;
  final String status; // DUE | SENT | APPROVED | REJECTED
  final List<FeeChatMessage> chat;
  final String? paymentScreenshotData;

  const FeePaymentCase({
    required this.id,
    required this.courseId,
    required this.courseTitle,
    required this.month,
    required this.amount,
    required this.status,
    required this.chat,
    this.paymentScreenshotData,
  });

  FeePaymentCase copyWith({
    String? status,
    List<FeeChatMessage>? chat,
    String? paymentScreenshotData,
  }) {
    return FeePaymentCase(
      id: id,
      courseId: courseId,
      courseTitle: courseTitle,
      month: month,
      amount: amount,
      status: status ?? this.status,
      chat: chat ?? this.chat,
      paymentScreenshotData:
          paymentScreenshotData ?? this.paymentScreenshotData,
    );
  }
}
