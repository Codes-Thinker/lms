import 'package:flutter/foundation.dart';
import '../core/mock_data.dart';
import '../models/course.dart';

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

  /// Simulates admin dashboard → app catalog sync (new published course).
  void syncAdminCourse({
    required String title,
    required String category,
    required int durationMonths,
    required int totalFee,
    required int monthlyFee,
    required int installmentFee,
    String description = '',
  }) {
    final id = 'c-admin-${DateTime.now().millisecondsSinceEpoch}';
    _courses.insert(
      0,
      Course(
        id: id,
        title: title,
        category: category,
        track: title,
        batch: 'CT-APP-${DateTime.now().month}',
        thumbnailUrl: 'https://picsum.photos/seed/$id/800/500',
        durationMonths: durationMonths,
        monthlyFee: monthlyFee,
        totalFee: totalFee,
        installmentFee: installmentFee,
        description: description.isEmpty ? 'Added from admin dashboard' : description,
        published: true,
        paidAmount: 0,
        feeStatus: 'DUE',
        attendancePercent: 0,
        progressPercent: 0,
        enrolled: false,
        outline: [
          OutlineSection(
            id: '$id-s1',
            title: 'Month 1 — Getting started',
            topics: [
              Topic(id: '$id-t1', title: 'Orientation'),
              Topic(id: '$id-t2', title: 'Setup & basics'),
            ],
          ),
        ],
      ),
    );
    notifyListeners();
  }

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
    await Future<void>.delayed(const Duration(milliseconds: 200));
    seedMockCourses();
  }

  /// Sync seed for tests / offline boot (no timers).
  void seedMockCourses() {
    _courses = MockData.courses();
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

  void markTopicComplete(String courseId, String topicId) {
    final course = _courses.firstWhere((c) => c.id == courseId);
    for (final section in course.outline) {
      for (final topic in section.topics) {
        if (topic.id == topicId) topic.completed = true;
      }
    }
    course.progressPercent =
        course.topicsTotal == 0 ? 0 : (course.topicsDone / course.topicsTotal) * 100;
    notifyListeners();
  }

  void markStudentAttendance(String studentKey, String status) {
    _markedAttendance[studentKey] = status;
    notifyListeners();
  }
}
