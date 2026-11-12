import 'package:flutter/foundation.dart';

class SupportTicket {
  final String id;
  final String kind; // REPORT | COMPLAIN
  final String title;
  final String body;
  final String status;
  final DateTime createdAt;

  SupportTicket({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    required this.status,
    required this.createdAt,
  });
}

class ChatMessage {
  final String id;
  final String senderRole; // USER | ADMIN
  final String senderName;
  final String text;
  final String sentAt;

  ChatMessage({
    required this.id,
    required this.senderRole,
    required this.senderName,
    required this.text,
    required this.sentAt,
  });
}

class SupportProvider extends ChangeNotifier {
  bool _loading = false;
  bool _surveyDone = false;
  final List<SupportTicket> _tickets = [];
  final List<ChatMessage> _chat = [
    ChatMessage(
      id: 'cm0',
      senderRole: 'ADMIN',
      senderName: 'Ayaz Aslam',
      text: 'Assalam o Alaikum. Admin chat yahan hai — sawal likhein.',
      sentAt: '09:00',
    ),
  ];

  final List<String> surveyQuestions = const [
    'How clear are the classes?',
    'What should we improve?',
    "Would you recommend Code's Thinker?",
  ];

  final Map<String, String> _surveyAnswers = {};

  bool get loading => _loading;
  bool get surveyDone => _surveyDone;
  List<SupportTicket> get tickets => List.unmodifiable(_tickets);
  List<ChatMessage> get chat => List.unmodifiable(_chat);
  Map<String, String> get surveyAnswers => Map.unmodifiable(_surveyAnswers);

  void setSurveyAnswer(int index, String value) {
    _surveyAnswers['q$index'] = value;
    notifyListeners();
  }

  Future<void> submitSurvey() async {
    _loading = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 450));
    _surveyDone = true;
    _loading = false;
    notifyListeners();
  }

  Future<void> submitTicket({
    required String kind,
    required String title,
    required String body,
  }) async {
    if (title.trim().isEmpty || body.trim().isEmpty) return;
    _loading = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 400));
    _tickets.insert(
      0,
      SupportTicket(
        id: 't-${DateTime.now().millisecondsSinceEpoch}',
        kind: kind,
        title: title.trim(),
        body: body.trim(),
        status: 'OPEN',
        createdAt: DateTime.now(),
      ),
    );
    _loading = false;
    notifyListeners();
  }

  Future<void> sendChat({
    required String senderName,
    required String text,
  }) async {
    if (text.trim().isEmpty) return;
    final now = DateTime.now();
    final stamp =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    _chat.add(
      ChatMessage(
        id: 'cm-${now.millisecondsSinceEpoch}',
        senderRole: 'USER',
        senderName: senderName,
        text: text.trim(),
        sentAt: stamp,
      ),
    );
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 700));
    _chat.add(
      ChatMessage(
        id: 'cm-a-${now.millisecondsSinceEpoch}',
        senderRole: 'ADMIN',
        senderName: 'Ayaz Aslam',
        text: 'Message received. Admin dashboard pe aapki chat list mein aa gaya.',
        sentAt: stamp,
      ),
    );
    notifyListeners();
  }
}
