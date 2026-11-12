import 'package:flutter/foundation.dart';
import '../services/api_client.dart';

class SupportTicket {
  final String id;
  final String kind;
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
  String? _threadId;
  int _unreadByUser = 0;
  final List<SupportTicket> _tickets = [];
  final List<ChatMessage> _chat = [];

  final List<String> surveyQuestions = const [
    'How clear are the classes?',
    'What should we improve?',
    "Would you recommend Code's Thinker?",
  ];

  final Map<String, String> _surveyAnswers = {};

  bool get loading => _loading;
  bool get surveyDone => _surveyDone;
  String? get threadId => _threadId;
  int get unreadByUser => _unreadByUser;
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
    try {
      final active = await ApiClient.instance.get('/support/survey/active');
      if (active is Map && active['id'] != null) {
        await ApiClient.instance.post(
          '/support/survey/${active['id']}/responses',
          body: {'answers': _surveyAnswers},
        );
      }
      _surveyDone = true;
    } catch (e) {
      debugPrint('Survey submit: $e');
    }
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
    try {
      await ApiClient.instance.post('/support/tickets', body: {
        'kind': kind,
        'title': title.trim(),
        'body': body.trim(),
      });
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
    } catch (e) {
      debugPrint('Ticket: $e');
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> loadAdminChat() async {
    _loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/support/chats/me')
          as Map<String, dynamic>;
      _threadId = data['id']?.toString();
      _unreadByUser = (data['unreadByUser'] as num?)?.toInt() ?? 0;
      final msgs = (data['messages'] as List?) ?? [];
      _chat
        ..clear()
        ..addAll(msgs.map((m) {
          final map = m as Map<String, dynamic>;
          final raw = map['sentAt']?.toString() ?? '';
          String stamp = raw;
          try {
            final dt = DateTime.parse(raw).toLocal();
            stamp =
                '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
          } catch (_) {}
          return ChatMessage(
            id: map['id']?.toString() ?? '',
            senderRole: map['senderRole']?.toString() ?? 'USER',
            senderName: map['senderName']?.toString() ?? '',
            text: map['text']?.toString() ?? '',
            sentAt: stamp,
          );
        }));
    } catch (e) {
      debugPrint('Load chat: $e');
    }
    _loading = false;
    notifyListeners();
  }

  Future<bool> sendChat({
    required String senderName,
    required String text,
  }) async {
    if (text.trim().isEmpty) return false;
    if (_threadId == null) {
      await loadAdminChat();
    }
    if (_threadId == null) return false;

    final optimistic = ChatMessage(
      id: 'local-${DateTime.now().millisecondsSinceEpoch}',
      senderRole: 'USER',
      senderName: senderName,
      text: text.trim(),
      sentAt: _nowStamp(),
    );
    _chat.add(optimistic);
    notifyListeners();

    try {
      final data = await ApiClient.instance.post(
        '/support/chats/$_threadId/messages',
        body: {'text': text.trim()},
      ) as Map<String, dynamic>;
      final msgs = (data['messages'] as List?) ?? [];
      _chat
        ..clear()
        ..addAll(msgs.map((m) {
          final map = m as Map<String, dynamic>;
          final raw = map['sentAt']?.toString() ?? '';
          String stamp = raw;
          try {
            final dt = DateTime.parse(raw).toLocal();
            stamp =
                '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
          } catch (_) {}
          return ChatMessage(
            id: map['id']?.toString() ?? '',
            senderRole: map['senderRole']?.toString() ?? 'USER',
            senderName: map['senderName']?.toString() ?? '',
            text: map['text']?.toString() ?? '',
            sentAt: stamp,
          );
        }));
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Send chat: $e');
      _chat.removeWhere((m) => m.id == optimistic.id);
      notifyListeners();
      return false;
    }
  }

  String _nowStamp() {
    final now = DateTime.now();
    return '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
  }
}
