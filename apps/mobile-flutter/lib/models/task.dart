class TaskChatMessage {
  final String id;
  final String senderName;
  final String senderRole; // ADMIN | USER
  final String text;
  final String sentAt;

  TaskChatMessage({
    required this.id,
    required this.senderName,
    required this.senderRole,
    required this.text,
    required this.sentAt,
  });
}

class AssignedTask {
  final String id;
  final String title;
  final String description;
  final String studyNotes;
  final String courseTitle;
  final String assignedToId;
  final String assignedToName;
  final String assignedBy;
  String status; // DONE | IN_PROGRESS | PENDING
  final DateTime dueAt;
  final int timerMinutes;
  int spentSeconds;
  final String updatedAt;
  final List<TaskChatMessage> chat;

  AssignedTask({
    required this.id,
    required this.title,
    required this.description,
    required this.studyNotes,
    required this.courseTitle,
    required this.assignedToId,
    required this.assignedToName,
    required this.assignedBy,
    required this.status,
    required this.dueAt,
    required this.timerMinutes,
    required this.spentSeconds,
    required this.updatedAt,
    required this.chat,
  });

  /// Count-up elapsed work time (always).
  int get elapsedSeconds => spentSeconds < 0 ? 0 : spentSeconds;

  /// Remaining only when teacher set a positive timer goal; else null.
  int? get remainingSeconds {
    if (timerMinutes <= 0) return null;
    final left = timerMinutes * 60 - spentSeconds;
    return left < 0 ? 0 : left;
  }

  bool get isComplete => status == 'DONE';
}
