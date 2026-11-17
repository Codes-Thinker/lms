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

  factory TeachingCourse.fromJson(Map<String, dynamic> j) {
    final rawStudents = j['students'];
    final students = <TeachingStudent>[];
    if (rawStudents is List) {
      for (final e in rawStudents) {
        if (e is Map) {
          students.add(
            TeachingStudent.fromJson(Map<String, dynamic>.from(e)),
          );
        }
      }
    }
    return TeachingCourse(
      id: j['id']?.toString() ?? '',
      title: j['title']?.toString() ?? '',
      category: j['category']?.toString() ?? '',
      batch: j['batch']?.toString(),
      enrolledCount: (j['enrolledCount'] as num?)?.toInt() ?? students.length,
      students: students,
    );
  }
}

class TaskThreadMessage {
  final String id;
  final String senderName;
  final String senderRole;
  final String text;
  final String sentAt;

  const TaskThreadMessage({
    required this.id,
    required this.senderName,
    required this.senderRole,
    required this.text,
    required this.sentAt,
  });

  factory TaskThreadMessage.fromJson(Map<String, dynamic> j) {
    final raw = j['sentAt']?.toString() ?? '';
    final dt = DateTime.tryParse(raw)?.toLocal();
    final sentAt = dt != null
        ? '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}'
        : raw;
    return TaskThreadMessage(
      id: j['id']?.toString() ?? '',
      senderName: j['senderName']?.toString() ?? '',
      senderRole: j['senderRole']?.toString() ?? 'USER',
      text: j['text']?.toString() ?? '',
      sentAt: sentAt,
    );
  }
}

class AssignedStudentTask {
  final String id;
  final String title;
  final String? description;
  final String status;
  final String? assignedToId;
  final String? assignedToName;
  final String? courseId;
  final String? courseTitle;
  final String? submittedAt;
  final String? reviewStatus;
  final int timerMinutes;
  final int spentMinutes;
  final List<TaskThreadMessage> chat;

  const AssignedStudentTask({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    this.assignedToId,
    this.assignedToName,
    this.courseId,
    this.courseTitle,
    this.submittedAt,
    this.reviewStatus,
    this.timerMinutes = 0,
    this.spentMinutes = 0,
    this.chat = const [],
  });

  factory AssignedStudentTask.fromJson(Map<String, dynamic> j) =>
      AssignedStudentTask(
        id: j['id']?.toString() ?? '',
        title: j['title']?.toString() ?? '',
        description: j['description']?.toString(),
        status: j['status']?.toString() ?? 'ASSIGNED',
        assignedToId: j['assignedToId']?.toString(),
        assignedToName: j['assignedToName']?.toString(),
        courseId: j['courseId']?.toString(),
        courseTitle: j['courseTitle']?.toString(),
        submittedAt: j['submittedAt']?.toString(),
        reviewStatus: j['reviewStatus']?.toString(),
        timerMinutes: (j['timerMinutes'] as num?)?.toInt() ?? 0,
        spentMinutes: (j['spentMinutes'] as num?)?.toInt() ?? 0,
        chat: ((j['chat'] as List?) ?? const [])
            .map((e) => TaskThreadMessage.fromJson(
                Map<String, dynamic>.from(e as Map)))
            .toList(),
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

  Future<void> load({bool silent = false}) async {
    if (!silent) {
      _loading = true;
      _error = null;
      notifyListeners();
    }
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
        final incoming = tasks
            .map((e) => AssignedStudentTask.fromJson(
                Map<String, dynamic>.from(e as Map)))
            .toList();
        // Merge so a slow poll cannot wipe messages just appended after send.
        _assigned = _mergeAssigned(incoming);
      }
    } catch (e) {
      _error = e.toString();
      debugPrint('Teaching load failed: $e');
    }
    if (!silent) _loading = false;
    notifyListeners();
  }

  List<AssignedStudentTask> _mergeAssigned(List<AssignedStudentTask> incoming) {
    final prevById = {for (final t in _assigned) t.id: t};
    return incoming.map((remote) {
      final local = prevById[remote.id];
      if (local == null) return remote;
      return AssignedStudentTask(
        id: remote.id,
        title: remote.title,
        description: remote.description,
        status: remote.status,
        assignedToId: remote.assignedToId,
        assignedToName: remote.assignedToName,
        courseId: remote.courseId,
        courseTitle: remote.courseTitle,
        submittedAt: remote.submittedAt,
        reviewStatus: remote.reviewStatus,
        timerMinutes: remote.timerMinutes,
        spentMinutes: local.spentMinutes > remote.spentMinutes
            ? local.spentMinutes
            : remote.spentMinutes,
        chat: _mergeChat(local.chat, remote.chat),
      );
    }).toList();
  }

  List<TaskThreadMessage> _mergeChat(
    List<TaskThreadMessage> local,
    List<TaskThreadMessage> remote,
  ) {
    final seen = <String>{};
    final out = <TaskThreadMessage>[];
    for (final m in remote) {
      if (seen.add(m.id)) out.add(m);
    }
    for (final m in local) {
      if (m.id.startsWith('local-') &&
          remote.any(
            (r) => r.text == m.text && r.senderRole == m.senderRole,
          )) {
        continue;
      }
      if (seen.add(m.id)) out.add(m);
    }
    return out;
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
    int? timerMinutes,
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
        if (timerMinutes != null) 'timerMinutes': timerMinutes,
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

  Future<void> updateAssignment({
    required String taskId,
    required String title,
    String? description,
  }) async {
    _loading = true;
    notifyListeners();
    try {
      await ApiClient.instance.patch(
        '/tasks/$taskId',
        body: {
          'title': title.trim(),
          'description': description?.trim() ?? '',
        },
      );
      await load();
    } catch (e) {
      debugPrint('Update assignment failed: $e');
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> deleteAssignment(String taskId) async {
    _loading = true;
    notifyListeners();
    try {
      await ApiClient.instance.delete('/tasks/$taskId');
      _assigned = _assigned.where((t) => t.id != taskId).toList();
      notifyListeners();
      await load();
    } catch (e) {
      debugPrint('Delete assignment failed: $e');
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Teacher reply on assignment thread (student gets push + sees in Task chat).
  Future<void> sendAssignmentMessage({
    required String taskId,
    required String text,
    String senderName = 'You',
  }) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    final optimisticId = 'local-${DateTime.now().millisecondsSinceEpoch}';
    final now = DateTime.now();
    final optimistic = TaskThreadMessage(
      id: optimisticId,
      senderName: senderName,
      senderRole: 'ADMIN',
      text: trimmed,
      sentAt:
          '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
    );
    _assigned = _assigned.map((t) {
      if (t.id != taskId) return t;
      return AssignedStudentTask(
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedToName,
        courseId: t.courseId,
        courseTitle: t.courseTitle,
        submittedAt: t.submittedAt,
        reviewStatus: t.reviewStatus,
        timerMinutes: t.timerMinutes,
        spentMinutes: t.spentMinutes,
        chat: [...t.chat, optimistic],
      );
    }).toList();
    notifyListeners();

    try {
      final data = await ApiClient.instance.post(
        '/tasks/$taskId/messages',
        body: {'text': trimmed},
      );
      if (data is Map<String, dynamic>) {
        final msg = TaskThreadMessage.fromJson(data);
        _assigned = _assigned.map((t) {
          if (t.id != taskId) return t;
          final chat = t.chat.map((m) {
            if (m.id == optimisticId) return msg;
            return m;
          }).toList();
          // Dedupe if poll already inserted the server copy.
          final seen = <String>{};
          final deduped = <TaskThreadMessage>[];
          for (final m in chat) {
            if (seen.add(m.id)) deduped.add(m);
          }
          return AssignedStudentTask(
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            assignedToId: t.assignedToId,
            assignedToName: t.assignedToName,
            courseId: t.courseId,
            courseTitle: t.courseTitle,
            submittedAt: t.submittedAt,
            reviewStatus: t.reviewStatus,
            timerMinutes: t.timerMinutes,
            spentMinutes: t.spentMinutes,
            chat: deduped,
          );
        }).toList();
        notifyListeners();
      }
    } catch (e) {
      _assigned = _assigned.map((t) {
        if (t.id != taskId) return t;
        return AssignedStudentTask(
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          assignedToId: t.assignedToId,
          assignedToName: t.assignedToName,
          courseId: t.courseId,
          courseTitle: t.courseTitle,
          submittedAt: t.submittedAt,
          reviewStatus: t.reviewStatus,
          timerMinutes: t.timerMinutes,
          spentMinutes: t.spentMinutes,
          chat: t.chat.where((m) => m.id != optimisticId).toList(),
        );
      }).toList();
      notifyListeners();
      rethrow;
    }
  }
}
