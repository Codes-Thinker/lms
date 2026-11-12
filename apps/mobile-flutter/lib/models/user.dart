class AppUser {
  final String id;
  final String name;
  final String email;
  final String role; // STUDENT | INTERN | STAFF | SUPER_ADMIN
  final String? track;
  final int enrolledCourses;
  final String? department;
  final String? batch;
  final String? phone;
  final int attendancePercent;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.track,
    this.enrolledCourses = 0,
    this.department,
    this.batch,
    this.phone,
    this.attendancePercent = 0,
  });

  bool get isStaff => role == 'STAFF' || role == 'SUPER_ADMIN';
  bool get isIntern => role == 'INTERN';
  bool get isStudent => role == 'STUDENT';
  bool get isTeacher => isStaff;
  String get firstName => name.split(' ').first;
  String get roleLabel {
    switch (role) {
      case 'STAFF':
      case 'SUPER_ADMIN':
        // Teacher can lecture students + handle development work.
        return 'Teacher / Staff';
      case 'INTERN':
        return 'Intern';
      case 'STUDENT':
        return 'Student';
      default:
        return role;
    }
  }

  factory AppUser.fromApi(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String,
      name: (json['fullName'] ?? json['name'] ?? 'User') as String,
      email: json['email'] as String,
      role: json['role'] as String,
      track: json['track'] as String?,
      department: json['department'] as String?,
      batch: json['batch'] as String?,
      phone: json['phone'] as String?,
      attendancePercent: (json['attendancePercent'] as num?)?.toInt() ?? 0,
    );
  }
}
