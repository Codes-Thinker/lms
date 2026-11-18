import 'package:flutter/foundation.dart';
import '../services/api_client.dart';

class InternProject {
  final String id;
  final String title;
  final String? description;
  final String status;
  final int progressPercent;
  final String? techStack;
  final String? repoUrl;
  final DateTime? deadline;
  final DateTime? startDate;
  final DateTime? updatedAt;

  const InternProject({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    required this.progressPercent,
    this.techStack,
    this.repoUrl,
    this.deadline,
    this.startDate,
    this.updatedAt,
  });

  factory InternProject.fromJson(Map<String, dynamic> j) {
    return InternProject(
      id: j['id']?.toString() ?? '',
      title: j['title']?.toString() ?? '',
      description: j['description']?.toString(),
      status: j['status']?.toString() ?? 'ASSIGNED',
      progressPercent: (j['progressPercent'] as num?)?.toInt() ?? 0,
      techStack: j['techStack']?.toString(),
      repoUrl: j['repoUrl']?.toString(),
      deadline: DateTime.tryParse(j['deadline']?.toString() ?? ''),
      startDate: DateTime.tryParse(
          j['startDate']?.toString() ?? j['createdAt']?.toString() ?? ''),
      updatedAt: DateTime.tryParse(j['updatedAt']?.toString() ?? '')?.toLocal(),
    );
  }
}

/// Intern projects from GET /projects/me (separate from staff-assigned tasks).
class ProjectProvider extends ChangeNotifier {
  bool _loading = false;
  List<InternProject> _projects = [];

  bool get loading => _loading;
  List<InternProject> get projects => List.unmodifiable(_projects);

  Future<void> load({bool silent = false}) async {
    if (!silent) {
      _loading = true;
      notifyListeners();
    }
    try {
      final data = await ApiClient.instance.get('/projects/me');
      final list = data is List ? data : (data is Map ? data['items'] : null);
      _projects = ((list as List?) ?? const [])
          .whereType<Map>()
          .map((e) => InternProject.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      debugPrint('Projects load failed: $e');
      if (!silent) _projects = [];
    }
    _loading = false;
    notifyListeners();
  }

  void clear() {
    _projects = [];
    notifyListeners();
  }
}
