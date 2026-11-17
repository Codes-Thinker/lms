import 'package:flutter/foundation.dart';
import '../core/api_errors.dart';
import '../services/api_client.dart';

class QuizSummary {
  final String id;
  final String title;
  final String? description;
  final String courseId;
  final String courseTitle;
  final int passPercent;
  final int? timeLimitMinutes;
  final int maxAttempts;
  final int questionCount;
  final int attemptsUsed;
  final double bestPercent;
  final bool passed;

  QuizSummary({
    required this.id,
    required this.title,
    this.description,
    required this.courseId,
    required this.courseTitle,
    required this.passPercent,
    this.timeLimitMinutes,
    required this.maxAttempts,
    required this.questionCount,
    required this.attemptsUsed,
    required this.bestPercent,
    required this.passed,
  });

  factory QuizSummary.fromJson(Map<String, dynamic> j) => QuizSummary(
        id: j['id'] as String,
        title: j['title'] as String? ?? 'Quiz',
        description: j['description'] as String?,
        courseId: j['courseId'] as String? ?? '',
        courseTitle: j['courseTitle'] as String? ?? '',
        passPercent: (j['passPercent'] as num?)?.toInt() ?? 70,
        timeLimitMinutes: (j['timeLimitMinutes'] as num?)?.toInt(),
        maxAttempts: (j['maxAttempts'] as num?)?.toInt() ?? 3,
        questionCount: (j['questionCount'] as num?)?.toInt() ?? 0,
        attemptsUsed: (j['attemptsUsed'] as num?)?.toInt() ?? 0,
        bestPercent: (j['bestPercent'] as num?)?.toDouble() ?? 0,
        passed: j['passed'] == true,
      );
}

class QuizQuestionView {
  final String id;
  final String prompt;
  final List<String> options;
  final int points;

  QuizQuestionView({
    required this.id,
    required this.prompt,
    required this.options,
    required this.points,
  });

  factory QuizQuestionView.fromJson(Map<String, dynamic> j) => QuizQuestionView(
        id: j['id'] as String,
        prompt: j['prompt'] as String? ?? '',
        options: (j['options'] as List? ?? []).map((e) => e.toString()).toList(),
        points: (j['points'] as num?)?.toInt() ?? 1,
      );
}

class CertificateItem {
  final String id;
  final String title;
  final String recipientName;
  final String? courseTitle;
  final String verificationCode;
  final String issuedAt;

  CertificateItem({
    required this.id,
    required this.title,
    required this.recipientName,
    this.courseTitle,
    required this.verificationCode,
    required this.issuedAt,
  });

  factory CertificateItem.fromJson(Map<String, dynamic> j) => CertificateItem(
        id: j['id'] as String,
        title: j['title'] as String? ?? 'Certificate',
        recipientName: j['recipientName'] as String? ?? '',
        courseTitle: j['courseTitle'] as String?,
        verificationCode: j['verificationCode'] as String? ?? '',
        issuedAt: j['issuedAt'] as String? ?? '',
      );
}

class QuizProvider extends ChangeNotifier {
  List<QuizSummary> quizzes = [];
  List<CertificateItem> certificates = [];
  bool loading = false;
  String? error;

  Future<void> loadQuizzes() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/quizzes/mine');
      final list = data is List ? data : <dynamic>[];
      quizzes = list
          .whereType<Map>()
          .map((e) => QuizSummary.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on ApiException catch (e) {
      error = ApiErrors.fromApi(e);
    } catch (e) {
      error = ApiErrors.friendly(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> loadCertificates() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/certificates/mine');
      final list = data is List ? data : <dynamic>[];
      certificates = list
          .whereType<Map>()
          .map((e) => CertificateItem.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on ApiException catch (e) {
      error = ApiErrors.fromApi(e);
    } catch (e) {
      error = ApiErrors.friendly(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> loadTake(String quizId) async {
    final data = await ApiClient.instance.get('/quizzes/$quizId/take');
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> startAttempt(String quizId) async {
    final data = await ApiClient.instance.post('/quizzes/$quizId/attempts');
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> submitAttempt(
    String attemptId,
    Map<String, int> answers,
  ) async {
    final data = await ApiClient.instance.post(
      '/quizzes/attempts/$attemptId/submit',
      body: {'answers': answers},
    );
    return Map<String, dynamic>.from(data as Map);
  }
}
