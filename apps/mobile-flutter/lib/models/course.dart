class Topic {
  final String id;
  final String title;
  bool completed;
  final int minutes;

  Topic({
    required this.id,
    required this.title,
    this.completed = false,
    this.minutes = 45,
  });
}

class OutlineSection {
  final String id;
  final String title;
  final List<Topic> topics;

  OutlineSection({
    required this.id,
    required this.title,
    required this.topics,
  });
}

class Course {
  final String id;
  final String title;
  final String category;
  final String track;
  final String batch;
  final String thumbnailUrl;
  final int durationMonths;
  final int monthlyFee;
  final int totalFee;
  final int installmentFee;
  final String description;
  final bool published;
  int paidAmount;
  String feeStatus;
  double attendancePercent;
  double progressPercent;
  final double rating;
  final bool enrolled;
  final List<OutlineSection> outline;
  final DateTime? nextClassAt;
  final DateTime? feeDueAt;

  Course({
    required this.id,
    required this.title,
    required this.category,
    required this.track,
    required this.batch,
    required this.thumbnailUrl,
    required this.durationMonths,
    required this.monthlyFee,
    required this.totalFee,
    required this.paidAmount,
    required this.feeStatus,
    required this.attendancePercent,
    required this.progressPercent,
    required this.outline,
    this.installmentFee = 0,
    this.description = '',
    this.published = true,
    this.rating = 4.5,
    this.enrolled = false,
    this.nextClassAt,
    this.feeDueAt,
  });

  int get topicsTotal =>
      outline.fold(0, (sum, section) => sum + section.topics.length);

  int get topicsDone => outline
      .expand((section) => section.topics)
      .where((topic) => topic.completed)
      .length;

  int get topicsRemaining => topicsTotal - topicsDone;

  int get totalHours =>
      outline.expand((s) => s.topics).fold(0, (s, t) => s + t.minutes) ~/ 60;

  Topic? get nextTopic {
    for (final section in outline) {
      for (final topic in section.topics) {
        if (!topic.completed) return topic;
      }
    }
    return null;
  }
}
