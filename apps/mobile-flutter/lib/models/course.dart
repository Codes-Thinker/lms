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
  final String? paymentType;
  final int? installment1Amount;
  final int? installment2Amount;
  final int remainingBalance;
  final String description;
  final bool published;
  final bool allowEnrollmentRequests;
  final String? instructorId;
  final String? instructorName;
  final String? instructorExperience;
  final String? instructorBio;
  int paidAmount;
  String feeStatus;
  double attendancePercent;
  double progressPercent;
  final double rating;
  final bool enrolled;

  /// NOT_ENROLLED | REQUEST_PENDING | APPROVED | REJECTED | ENROLLED
  final String enrollmentStatus;
  final List<OutlineSection> outline;
  final DateTime? nextClassAt;
  final DateTime? feeDueAt;
  /// Server totals when outline is empty (catalog / not enrolled).
  final int? apiTopicsTotal;
  final int? apiTopicsDone;

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
    this.paymentType,
    this.installment1Amount,
    this.installment2Amount,
    this.remainingBalance = 0,
    this.description = '',
    this.published = true,
    this.allowEnrollmentRequests = false,
    this.instructorId,
    this.instructorName,
    this.instructorExperience,
    this.instructorBio,
    this.rating = 4.5,
    this.enrolled = false,
    this.enrollmentStatus = 'NOT_ENROLLED',
    this.nextClassAt,
    this.feeDueAt,
    this.apiTopicsTotal,
    this.apiTopicsDone,
  });

  int get topicsTotal {
    final fromOutline =
        outline.fold(0, (sum, section) => sum + section.topics.length);
    if (fromOutline > 0) return fromOutline;
    return apiTopicsTotal ?? 0;
  }

  int get topicsDone {
    final fromOutline = outline
        .expand((section) => section.topics)
        .where((topic) => topic.completed)
        .length;
    if (outline.isNotEmpty) return fromOutline;
    return apiTopicsDone ?? 0;
  }

  int get topicsRemaining => topicsTotal - topicsDone;

  int get totalHours =>
      outline.expand((s) => s.topics).fold(0, (s, t) => s + t.minutes) ~/ 60;

  bool get requestPending => enrollmentStatus == 'REQUEST_PENDING';
  bool get requestRejected => enrollmentStatus == 'REJECTED';

  String get paymentPlanLabel {
    switch (paymentType) {
      case 'TWO_INSTALLMENTS':
        return '2× Installments';
      case 'MONTHLY':
        return 'Monthly';
      case 'CUSTOM':
        return 'Custom plan';
      default:
        return installmentCount > 1
            ? '$installmentCount× Installments'
            : 'Fee plan';
    }
  }

  String get feeStatusLabel {
    switch (feeStatus.toUpperCase()) {
      case 'PAID':
      case 'APPROVED':
        return 'Paid';
      case 'PARTIAL':
        return 'Partial';
      case 'DUE':
      case 'PENDING':
      case 'SENT':
        return 'Pending';
      case 'WAIVED':
        return 'Waived';
      default:
        return feeStatus.isEmpty ? 'Pending' : feeStatus;
    }
  }

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
    final enrolled = json['enrolled'] as bool? ?? false;
    final status = (json['enrollmentStatus'] as String?) ??
        (enrolled ? 'ENROLLED' : 'NOT_ENROLLED');
    final totalFee = (json['totalFee'] as num?)?.toInt() ?? 0;
    final paidAmount = (json['paidAmount'] as num?)?.toInt() ?? 0;
    final remaining = (json['remainingBalance'] as num?)?.toInt() ??
        (totalFee - paidAmount).clamp(0, totalFee);
    return Course(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      category: json['category'] as String? ?? 'Coding',
      track: json['title'] as String? ?? '',
      batch: json['batch'] as String? ?? '',
      thumbnailUrl: (json['thumbnailUrl'] as String?)?.trim() ?? '',
      durationMonths: (json['durationMonths'] as num?)?.toInt() ?? 3,
      monthlyFee: (json['monthlyFee'] as num?)?.toInt() ?? 0,
      totalFee: totalFee,
      installmentFee: (json['installmentFee'] as num?)?.toInt() ?? 0,
      installmentCount: (json['installmentCount'] as num?)?.toInt() ?? 2,
      paymentType: json['paymentType'] as String?,
      installment1Amount: (json['installment1Amount'] as num?)?.toInt(),
      installment2Amount: (json['installment2Amount'] as num?)?.toInt(),
      remainingBalance: remaining,
      description: json['description'] as String? ?? '',
      published: json['published'] as bool? ?? true,
      allowEnrollmentRequests: json['allowEnrollmentRequests'] as bool? ?? false,
      instructorId: json['instructorId'] as String?,
      instructorName: json['instructorName'] as String?,
      instructorExperience: json['instructorExperience'] as String?,
      instructorBio: json['instructorBio'] as String?,
      paidAmount: paidAmount,
      feeStatus: json['feeStatus'] as String? ?? 'DUE',
      attendancePercent: (json['attendancePercent'] as num?)?.toDouble() ?? 0,
      progressPercent: (json['progressPercent'] as num?)?.toDouble() ?? 0,
      rating: (json['rating'] as num?)?.toDouble() ?? 4.5,
      enrolled: enrolled,
      enrollmentStatus: status,
      apiTopicsTotal: (json['topicsTotal'] as num?)?.toInt(),
      apiTopicsDone: (json['topicsDone'] as num?)?.toInt(),
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
