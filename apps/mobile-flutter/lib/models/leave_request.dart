class LeaveBalance {
  final String studentId;
  final int year;
  final int month;
  final double totalAllowance;
  final double usedLeaves;
  final double pendingLeaves;
  final double remainingLeaves;

  const LeaveBalance({
    required this.studentId,
    required this.year,
    required this.month,
    required this.totalAllowance,
    required this.usedLeaves,
    required this.pendingLeaves,
    required this.remainingLeaves,
  });

  factory LeaveBalance.fromApi(Map<String, dynamic> json) {
    return LeaveBalance(
      studentId: json['studentId'] as String? ?? '',
      year: (json['year'] as num?)?.toInt() ?? DateTime.now().year,
      month: (json['month'] as num?)?.toInt() ?? DateTime.now().month,
      totalAllowance: (json['totalAllowance'] as num?)?.toDouble() ?? 2,
      usedLeaves: (json['usedLeaves'] as num?)?.toDouble() ?? 0,
      pendingLeaves: (json['pendingLeaves'] as num?)?.toDouble() ?? 0,
      remainingLeaves: (json['remainingLeaves'] as num?)?.toDouble() ?? 0,
    );
  }
}

class LeaveRequest {
  final String id;
  final String studentId;
  final String? studentName;
  final String? batch;
  final String? courseTitle;
  final String leaveDate;
  final double durationDays;
  final String reason;
  final String status; // PENDING | APPROVED | REJECTED
  final String? rejectionReason;
  final String? reviewedByName;
  final String? reviewedAt;
  final String createdAt;

  const LeaveRequest({
    required this.id,
    required this.studentId,
    this.studentName,
    this.batch,
    this.courseTitle,
    required this.leaveDate,
    required this.durationDays,
    required this.reason,
    required this.status,
    this.rejectionReason,
    this.reviewedByName,
    this.reviewedAt,
    required this.createdAt,
  });

  factory LeaveRequest.fromApi(Map<String, dynamic> json) {
    return LeaveRequest(
      id: json['id'] as String,
      studentId: json['studentId'] as String? ?? '',
      studentName: json['studentName'] as String?,
      batch: json['batch'] as String?,
      courseTitle: json['courseTitle'] as String?,
      leaveDate: json['leaveDate'] as String? ?? '',
      durationDays: (json['durationDays'] as num?)?.toDouble() ?? 1,
      reason: json['reason'] as String? ?? '',
      status: (json['status'] as String? ?? 'PENDING').toUpperCase(),
      rejectionReason: json['rejectionReason'] as String?,
      reviewedByName: json['reviewedByName'] as String?,
      reviewedAt: json['reviewedAt'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}
