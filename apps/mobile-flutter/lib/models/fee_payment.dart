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

class FeeReminderLog {
  final String id;
  final String kind;
  final String sentAt;

  const FeeReminderLog({
    required this.id,
    required this.kind,
    required this.sentAt,
  });
}

class FeePaymentCase {
  final String id;
  final String courseId;
  final String courseTitle;
  final String month;
  final int amount;
  final int amountPaid;
  final String status; // DUE | SENT | PARTIAL | APPROVED | REJECTED | PAID | OVERDUE
  final String? dueDate;
  final List<FeeChatMessage> chat;
  final String? paymentScreenshotData;
  final List<FeeReminderLog> reminders;

  const FeePaymentCase({
    required this.id,
    required this.courseId,
    required this.courseTitle,
    required this.month,
    required this.amount,
    this.amountPaid = 0,
    required this.status,
    this.dueDate,
    required this.chat,
    this.paymentScreenshotData,
    this.reminders = const [],
  });

  FeePaymentCase copyWith({
    String? status,
    List<FeeChatMessage>? chat,
    String? paymentScreenshotData,
    int? amountPaid,
    String? dueDate,
    List<FeeReminderLog>? reminders,
  }) {
    return FeePaymentCase(
      id: id,
      courseId: courseId,
      courseTitle: courseTitle,
      month: month,
      amount: amount,
      amountPaid: amountPaid ?? this.amountPaid,
      status: status ?? this.status,
      dueDate: dueDate ?? this.dueDate,
      chat: chat ?? this.chat,
      paymentScreenshotData:
          paymentScreenshotData ?? this.paymentScreenshotData,
      reminders: reminders ?? this.reminders,
    );
  }
}
