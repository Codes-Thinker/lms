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

  /// Chips: All + admin categories, then any extra labels found on courses.
  List<String> get categoryNames {
    final fromAdmin = _categories.map((c) => c.name.trim()).where((n) => n.isNotEmpty);
    final fromCourses = courses
        .map((c) => c.category.trim())
        .where((n) => n.isNotEmpty);
    final seen = <String>{};
    final tabs = <String>['All'];
    for (final name in [...fromAdmin, ...fromCourses]) {
      final key = name.toLowerCase();
      if (seen.add(key)) tabs.add(name);
    }
    return tabs;
  }

  List<Course> get filteredCourses {
    var result = courses;
    if (_selectedCategory != 'All') {
      final selected = _selectedCategory.toLowerCase();
      result = result
          .where((c) => c.category.trim().toLowerCase() == selected)
          .toList();
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

  /// Office / report attendance % (not per-course placeholder).
  double _reportAttendancePercent = 0;
  int _reportFeesPending = 0;
  int _reportFeesPaid = 0;
  String? _reportBatch;
  String? _reportCreatedAt;
  String? _reportPhone;
  String? _reportProfileImage;
  double get reportAttendancePercent => _reportAttendancePercent;
  int get reportFeesPending => _reportFeesPending;
  int get reportFeesPaid => _reportFeesPaid;
  String? get reportBatch => _reportBatch;
  String? get reportCreatedAt => _reportCreatedAt;
  String? get reportPhone => _reportPhone;
  String? get reportProfileImage => _reportProfileImage;

  double get overallAttendance {
    if (_reportAttendancePercent > 0) return _reportAttendancePercent;
    final enrolled = enrolledCourses;
    if (enrolled.isEmpty) return 0;
    final sum =
        enrolled.map((c) => c.attendancePercent).fold<double>(0, (a, b) => a + b);
    return sum / enrolled.length;
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

  /// Pull real attendance / fee / profile snapshot from /reports/me.
  Future<void> fetchReportStats() async {
    try {
      final data =
          await ApiClient.instance.get('/reports/me') as Map<String, dynamic>;
      _reportAttendancePercent =
          (data['attendancePercent'] as num?)?.toDouble() ?? 0;
      _reportFeesPending = (data['feesPending'] as num?)?.toInt() ?? 0;
      _reportFeesPaid = (data['feesPaid'] as num?)?.toInt() ?? 0;
      final user = data['user'];
      if (user is Map) {
        _reportBatch = user['batch'] as String?;
        _reportCreatedAt = user['createdAt'] as String?;
        _reportPhone = user['phone'] as String?;
        _reportProfileImage = user['profileImage'] as String?;
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Report stats fetch failed: $e');
    }
  }

  /// Fetch both courses and categories in parallel.
  Future<void> fetchAll() async {
    await Future.wait([
      fetchEnrolledCourses(),
      fetchCategories(),
      fetchReportStats(),
    ]);
  }

  void clearMemory() {
    _courses = [];
    _categories = [];
    _activeCourse = null;
    _reportAttendancePercent = 0;
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
    Topic? target;
    for (final section in course.outline) {
      for (final topic in section.topics) {
        if (topic.id == topicId) target = topic;
      }
    }
    if (target == null) return;
    final wasCompleted = target.completed;
    target.completed = true;
    course.progressPercent = course.topicsTotal == 0
        ? 0
        : (course.topicsDone / course.topicsTotal) * 100;
    notifyListeners();
    try {
      await ApiClient.instance.post('/courses/topics/$topicId/progress', body: {
        'completed': true,
      });
      // Refresh enrolled courses so progress matches DB after restart.
      await fetchEnrolledCourses();
    } catch (e) {
      target.completed = wasCompleted;
      course.progressPercent = course.topicsTotal == 0
          ? 0
          : (course.topicsDone / course.topicsTotal) * 100;
      notifyListeners();
      rethrow;
    }
  }

  void markStudentAttendance(String studentKey, String status) {
    _markedAttendance[studentKey] = status;
    notifyListeners();
  }
}
