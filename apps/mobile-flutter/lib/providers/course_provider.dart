import 'package:flutter/foundation.dart';
import '../models/course.dart';
import '../services/api_client.dart';

class CourseProvider extends ChangeNotifier {
  List<Course> _courses = [];
  bool _loading = false;
  String _selectedCategory = 'All';
  Course? _activeCourse;
  final Map<String, String> _markedAttendance = {};

  List<Course> get courses =>
      List.unmodifiable(_courses.where((c) => c.published));
  List<Course> get enrolledCourses =>
      courses.where((course) => course.enrolled).toList();
  bool get loading => _loading;
  String get selectedCategory => _selectedCategory;
  Course? get activeCourse => _activeCourse;
  Map<String, String> get markedAttendance => Map.unmodifiable(_markedAttendance);

  List<Course> get filteredCourses {
    if (_selectedCategory == 'All') return courses;
    return courses.where((c) => c.category == _selectedCategory).toList();
  }

  List<Course> get featuredCourses =>
      courses.where((c) => !c.enrolled || c.progressPercent < 100).take(3).toList();

  Course? get continueCourse {
    final enrolled = enrolledCourses;
    if (enrolled.isEmpty) return null;
    enrolled.sort((a, b) => b.progressPercent.compareTo(a.progressPercent));
    return enrolled.firstWhere(
      (c) => c.progressPercent > 0 && c.progressPercent < 100,
      orElse: () => enrolled.first,
    );
  }

  double get overallAttendance {
    final enrolled = enrolledCourses;
    if (enrolled.isEmpty) return 0;
    return enrolled.map((c) => c.attendancePercent).reduce((a, b) => a + b) /
        enrolled.length;
  }

  int get totalFeeDue {
    return enrolledCourses.fold(
      0,
      (sum, c) => sum + (c.totalFee - c.paidAmount).clamp(0, c.totalFee),
    );
  }

  Future<void> fetchEnrolledCourses() async {
    _loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/courses');
      if (data is List) {
        _courses = data
            .map((e) => Course.fromApi(e as Map<String, dynamic>))
            .toList();
      } else {
        _courses = [];
      }
    } catch (e) {
      debugPrint('Courses fetch failed: $e');
      _courses = [];
    }
    _loading = false;
    notifyListeners();
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void selectCourse(Course course) {
    _activeCourse = course;
    notifyListeners();
  }

  Future<void> markTopicComplete(String courseId, String topicId) async {
    final course = _courses.firstWhere((c) => c.id == courseId);
    for (final section in course.outline) {
      for (final topic in section.topics) {
        if (topic.id == topicId) topic.completed = true;
      }
    }
    course.progressPercent =
        course.topicsTotal == 0 ? 0 : (course.topicsDone / course.topicsTotal) * 100;
    notifyListeners();
    try {
      await ApiClient.instance.post('/courses/topics/$topicId/progress', body: {
        'completed': true,
      });
    } catch (_) {}
  }

  void markStudentAttendance(String studentKey, String status) {
    _markedAttendance[studentKey] = status;
    notifyListeners();
  }
}
