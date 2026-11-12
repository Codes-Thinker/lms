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
  final int installmentCount;
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
    this.installmentCount = 2,
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

  factory Course.fromApi(Map<String, dynamic> json) {
    final outlineRaw = (json['outline'] as List?) ?? const [];
    return Course(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      category: json['category'] as String? ?? 'Coding',
      track: json['title'] as String? ?? '',
      batch: json['batch'] as String? ?? '',
      thumbnailUrl: json['thumbnailUrl'] as String? ??
          'https://picsum.photos/seed/${json['id']}/800/500',
      durationMonths: (json['durationMonths'] as num?)?.toInt() ?? 3,
      monthlyFee: (json['monthlyFee'] as num?)?.toInt() ?? 0,
      totalFee: (json['totalFee'] as num?)?.toInt() ?? 0,
      installmentFee: (json['installmentFee'] as num?)?.toInt() ?? 0,
      installmentCount: (json['installmentCount'] as num?)?.toInt() ?? 2,
      description: json['description'] as String? ?? '',
      published: json['published'] as bool? ?? true,
      paidAmount: (json['paidAmount'] as num?)?.toInt() ?? 0,
      feeStatus: json['feeStatus'] as String? ?? 'DUE',
      attendancePercent: (json['attendancePercent'] as num?)?.toDouble() ?? 0,
      progressPercent: (json['progressPercent'] as num?)?.toDouble() ?? 0,
      rating: (json['rating'] as num?)?.toDouble() ?? 4.5,
      enrolled: json['enrolled'] as bool? ?? false,
      outline: outlineRaw.map((s) {
        final section = s as Map<String, dynamic>;
        final topics = (section['topics'] as List?) ?? const [];
        return OutlineSection(
          id: section['id'] as String? ?? '',
          title: section['title'] as String? ?? '',
          topics: topics.map((t) {
            final topic = t as Map<String, dynamic>;
            return Topic(
              id: topic['id'] as String? ?? '',
              title: topic['title'] as String? ?? '',
              completed: topic['completed'] as bool? ?? false,
              minutes: (topic['minutes'] as num?)?.toInt() ?? 45,
            );
          }).toList(),
        );
      }).toList(),
    );
  }
}
