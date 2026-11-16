import 'package:flutter/foundation.dart';
import '../services/api_client.dart';

class TeachingStudent {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? batch;
  final String accountType;
  final String status;

  const TeachingStudent({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.batch,
    required this.accountType,
    required this.status,
  });

  factory TeachingStudent.fromJson(Map<String, dynamic> j) => TeachingStudent(
        id: j['id']?.toString() ?? '',
        name: j['name']?.toString() ?? '',
        email: j['email']?.toString() ?? '',
        phone: j['phone']?.toString(),
        batch: j['batch']?.toString(),
        accountType: j['accountType']?.toString() ?? 'STUDENT',
        status: j['status']?.toString() ?? 'ACTIVE',
      );
}

class TeachingCourse {
  final String id;
  final String title;
  final String category;
  final String? batch;
  final int enrolledCount;
  final List<TeachingStudent> students;

  const TeachingCourse({
    required this.id,
    required this.title,
    required this.category,
    this.batch,
    required this.enrolledCount,
    required this.students,
  });

  factory TeachingCourse.fromJson(Map<String, dynamic> j) => TeachingCourse(
        id: j['id']?.toString() ?? '',
        title: j['title']?.toString() ?? '',
        category: j['category']?.toString() ?? '',
        batch: j['batch']?.toString(),
        enrolledCount: (j['enrolledCount'] as num?)?.toInt() ?? 0,
        students: ((j['students'] as List?) ?? const [])
            .map((e) => TeachingStudent.fromJson(
                Map<String, dynamic>.from(e as Map)))
            .toList(),
      );
}

class AssignedStudentTask {
  final String id;
  final String title;
  final String status;
  final String? assignedToId;
  final String? assignedToName;
  final String? courseId;
  final String? courseTitle;
  final String? submittedAt;
  final String? reviewStatus;

  const AssignedStudentTask({
    required this.id,
    required this.title,
    required this.status,
    this.assignedToId,
    this.assignedToName,
    this.courseId,
    this.courseTitle,
    this.submittedAt,
    this.reviewStatus,
  });

  factory AssignedStudentTask.fromJson(Map<String, dynamic> j) =>
      AssignedStudentTask(
        id: j['id']?.toString() ?? '',
        title: j['title']?.toString() ?? '',
        status: j['status']?.toString() ?? 'ASSIGNED',
        assignedToId: j['assignedToId']?.toString(),
        assignedToName: j['assignedToName']?.toString(),
        courseId: j['courseId']?.toString(),
        courseTitle: j['courseTitle']?.toString(),
        submittedAt: j['submittedAt']?.toString(),
        reviewStatus: j['reviewStatus']?.toString(),
      );

  bool get isDone =>
      status == 'DONE' ||
      status == 'REVIEWED' ||
      reviewStatus == 'APPROVED';
  bool get isSubmitted =>
      status == 'SUBMITTED' || submittedAt != null;
}

/// Teacher/staff: own courses, students, and assignments they created.
class TeachingProvider extends ChangeNotifier {
  bool _loading = false;
  String? _error;
  List<TeachingCourse> _courses = [];
  List<AssignedStudentTask> _assigned = [];

  /// 0 = Students, 1 = Assignments
  int _tabIndex = 0;
  String? _selectedCourseId;
  String _studentQuery = '';
  String _assignmentQuery = '';

  bool get loading => _loading;
  String? get error => _error;
  List<TeachingCourse> get courses => List.unmodifiable(_courses);
  List<AssignedStudentTask> get assigned => List.unmodifiable(_assigned);
  int get tabIndex => _tabIndex;
  String? get selectedCourseId => _selectedCourseId;
  String get studentQuery => _studentQuery;
  String get assignmentQuery => _assignmentQuery;

  int get totalStudents =>
      _courses.fold(0, (s, c) => s + c.students.length);

  TeachingCourse? get selectedCourse {
    if (_courses.isEmpty) return null;
    if (_selectedCourseId == null) return _courses.first;
    return courseById(_selectedCourseId!) ?? _courses.first;
  }

  List<TeachingStudent> get filteredStudents {
    final course = selectedCourse;
    if (course == null) return const [];
    final q = _studentQuery.trim().toLowerCase();
    if (q.isEmpty) return course.students;
    return course.students
        .where(
          (s) =>
              s.name.toLowerCase().contains(q) ||
              (s.batch ?? '').toLowerCase().contains(q) ||
              s.email.toLowerCase().contains(q),
        )
        .toList();
  }

  List<AssignedStudentTask> get filteredAssignments {
    final course = selectedCourse;
    final courseId = course?.id;
    final base = _assigned
        .where((t) => courseId == null || t.courseId == courseId)
        .toList();
    final q = _assignmentQuery.trim().toLowerCase();
    if (q.isEmpty) return base;
    return base
        .where(
          (t) =>
              t.title.toLowerCase().contains(q) ||
              (t.assignedToName ?? '').toLowerCase().contains(q) ||
              t.status.toLowerCase().contains(q),
        )
        .toList();
  }

  TeachingCourse? courseById(String id) {
    try {
      return _courses.firstWhere((c) => c.id == id);
    } catch (_) {
      return null;
    }
  }

  void setTabIndex(int index) {
    if (_tabIndex == index) return;
    _tabIndex = index;
    notifyListeners();
  }

  void selectCourse(String courseId) {
    if (_selectedCourseId == courseId) return;
    _selectedCourseId = courseId;
    notifyListeners();
  }

  void setStudentQuery(String value) {
    _studentQuery = value;
    notifyListeners();
  }

  void setAssignmentQuery(String value) {
    _assignmentQuery = value;
    notifyListeners();
  }

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final roster = await ApiClient.instance.get('/courses/teaching/mine');
      if (roster is List) {
        _courses = roster
            .map((e) =>
                TeachingCourse.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
        if (_selectedCourseId == null && _courses.isNotEmpty) {
          _selectedCourseId = _courses.first.id;
        } else if (_selectedCourseId != null &&
            courseById(_selectedCourseId!) == null &&
            _courses.isNotEmpty) {
          _selectedCourseId = _courses.first.id;
        }
      }
      final tasks = await ApiClient.instance.get('/tasks/assigned-by-me');
      if (tasks is List) {
        _assigned = tasks
            .map((e) => AssignedStudentTask.fromJson(
                Map<String, dynamic>.from(e as Map)))
            .toList();
      }
    } catch (e) {
      _error = e.toString();
      debugPrint('Teaching load failed: $e');
    }
    _loading = false;
    notifyListeners();
  }

  void clearMemory() {
    _courses = [];
    _assigned = [];
    _error = null;
    _selectedCourseId = null;
    _studentQuery = '';
    _assignmentQuery = '';
    _tabIndex = 0;
    notifyListeners();
  }

  /// Assign to whole course or selected student IDs.
  Future<int> assignTask({
    required String courseId,
    required String title,
    String? description,
    List<String>? assigneeIds,
    String? dueAt,
  }) async {
    _loading = true;
    notifyListeners();
    try {
      final body = <String, dynamic>{
        'courseId': courseId,
        'title': title.trim(),
        if (description != null && description.trim().isNotEmpty)
          'description': description.trim(),
        if (assigneeIds != null && assigneeIds.isNotEmpty)
          'assigneeIds': assigneeIds,
        if (dueAt != null) 'dueAt': dueAt,
      };
      final data = await ApiClient.instance.post('/tasks/assign', body: body)
          as Map<String, dynamic>;
      final count = (data['assigned'] as num?)?.toInt() ?? 0;
      await load();
      return count;
    } catch (e) {
      debugPrint('Assign failed: $e');
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> reviewTask({
    required String taskId,
    required String reviewStatus,
    String? feedback,
  }) async {
    await ApiClient.instance.patch(
      '/tasks/$taskId/review',
      body: {
        'reviewStatus': reviewStatus,
        if (feedback != null) 'feedback': feedback,
      },
    );
    await load();
  }
}
