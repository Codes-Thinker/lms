import 'package:flutter/foundation.dart';
import '../models/course.dart';
import '../services/api_client.dart';
import '../services/local_cache.dart';

class CourseCategory {
  final String id;
  final String name;
  final String? icon;
  final int sortOrder;

  CourseCategory({
    required this.id,
    required this.name,
    this.icon,
    this.sortOrder = 0,
  });

  factory CourseCategory.fromApi(Map<String, dynamic> json) {
    return CourseCategory(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      icon: json['icon'] as String?,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
    );
  }
}

class CourseProvider extends ChangeNotifier {
  List<Course> _courses = [];
  List<CourseCategory> _categories = [];
  bool _loading = false;
  bool _categoriesLoading = false;
  String _selectedCategory = 'All';
  String _searchQuery = '';
  Course? _activeCourse;
  final Map<String, String> _markedAttendance = {};

  List<Course> get courses =>
      List.unmodifiable(_courses.where((c) => c.published));
  List<Course> get enrolledCourses =>
      courses.where((course) => course.enrolled).toList();
  List<CourseCategory> get categories => List.unmodifiable(_categories);
  bool get loading => _loading;
  bool get categoriesLoading => _categoriesLoading;
  String get selectedCategory => _selectedCategory;
  String get searchQuery => _searchQuery;
  Course? get activeCourse => _activeCourse;
  Map<String, String> get markedAttendance =>
      Map.unmodifiable(_markedAttendance);

  /// Category names for the chip row — always includes "All" at the start.
  List<String> get categoryNames => [
        'All',
        ..._categories.map((c) => c.name),
      ];

  List<Course> get filteredCourses {
    var result = courses;
    if (_selectedCategory != 'All') {
      result = result.where((c) => c.category == _selectedCategory).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      result = result
          .where((c) =>
              c.title.toLowerCase().contains(q) ||
              c.category.toLowerCase().contains(q))
          .toList();
    }
    return result;
  }

  /// All published courses for the All Courses screen.
  List<Course> get allCourses => List.unmodifiable(courses);

  List<Course> get featuredCourses => courses
      .where((c) => !c.enrolled || c.progressPercent < 100)
      .take(3)
      .toList();

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

  void _applyList(List<dynamic> data) {
    _courses = data
        .whereType<Map>()
        .map((e) => Course.fromApi(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Fetch dynamic categories from the backend.
  Future<void> fetchCategories() async {
    _categoriesLoading = true;
    try {
      final data = await ApiClient.instance.get('/courses/categories');
      if (data is List) {
        _categories = data
            .whereType<Map>()
            .map((e) => CourseCategory.fromApi(Map<String, dynamic>.from(e)))
            .toList();
      }
    } catch (e) {
      debugPrint('Categories fetch failed: $e');
    }
    _categoriesLoading = false;
    notifyListeners();
  }

  /// Cache-first, then live API refresh.
  Future<void> fetchEnrolledCourses() async {
    _loading = true;
    notifyListeners();

    final cached = await LocalCache.getList(LocalCache.courses);
    if (cached.isNotEmpty) {
      _applyList(cached);
      _loading = false;
      notifyListeners();
    }

    try {
      final data = await ApiClient.instance.get('/courses');
      if (data is List) {
        _applyList(data);
        await LocalCache.setJson(LocalCache.courses, data);
      } else if (cached.isEmpty) {
        _courses = [];
      }
    } catch (e) {
      debugPrint('Courses fetch failed: $e');
      if (cached.isEmpty) _courses = [];
    }
    _loading = false;
    notifyListeners();
  }

  /// Fetch both courses and categories in parallel.
  Future<void> fetchAll() async {
    await Future.wait([
      fetchEnrolledCourses(),
      fetchCategories(),
    ]);
  }

  void clearMemory() {
    _courses = [];
    _categories = [];
    _activeCourse = null;
    _markedAttendance.clear();
    _selectedCategory = 'All';
    _searchQuery = '';
    notifyListeners();
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
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
    course.progressPercent = course.topicsTotal == 0
        ? 0
        : (course.topicsDone / course.topicsTotal) * 100;
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
