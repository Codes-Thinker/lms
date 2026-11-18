import 'dart:async';

import 'package:flutter/foundation.dart';
import '../services/api_client.dart';
import '../services/image_compress_service.dart';

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
  final String? imageData;
  final String? imageName;
  /// sent | delivered | seen (USER outbound receipts)
  final String status;

  ChatMessage({
    required this.id,
    required this.senderRole,
    required this.senderName,
    required this.text,
    required this.sentAt,
    this.imageData,
    this.imageName,
    this.status = 'sent',
  });

  ChatMessage copyWith({String? status}) {
    return ChatMessage(
      id: id,
      senderRole: senderRole,
      senderName: senderName,
      text: text,
      sentAt: sentAt,
      imageData: imageData,
      imageName: imageName,
      status: status ?? this.status,
    );
  }
}

class SupportProvider extends ChangeNotifier {
  bool _loading = false;
  bool _sending = false;
  bool _surveyDone = false;
  bool _adminTyping = false;
  String? _threadId;
  int _unreadByUser = 0;
  final List<SupportTicket> _tickets = [];
  final List<ChatMessage> _chat = [];

  List<String> _surveyQuestions = const [
    'How clear are the classes?',
    'What should we improve?',
    "Would you recommend Code's Thinker?",
  ];

  final Map<String, String> _surveyAnswers = {};

  bool get loading => _loading;
  bool get sending => _sending;
  bool get surveyDone => _surveyDone;
  bool get adminTyping => _adminTyping;
  String? get threadId => _threadId;
  int get unreadByUser => _unreadByUser;
  List<SupportTicket> get tickets => List.unmodifiable(_tickets);
  List<ChatMessage> get chat => List.unmodifiable(_chat);
  List<String> get surveyQuestions => List.unmodifiable(_surveyQuestions);
  Map<String, String> get surveyAnswers => Map.unmodifiable(_surveyAnswers);

  /// Load active survey questions from API when available.
  Future<void> loadSurveyQuestions() async {
    try {
      final active = await ApiClient.instance.get('/support/survey/active');
      if (active is! Map) return;
      final raw = active['questions'];
      final parsed = <String>[];
      if (raw is List) {
        for (final q in raw) {
          if (q is String && q.trim().isNotEmpty) {
            parsed.add(q.trim());
          } else if (q is Map) {
            final text = (q['text'] ?? q['question'] ?? q['title'] ?? '')
                .toString()
                .trim();
            if (text.isNotEmpty) parsed.add(text);
          }
        }
      }
      if (parsed.isNotEmpty) {
        _surveyQuestions = parsed;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Survey questions load: $e');
    }
  }

  void setSurveyAnswer(int index, String value) {
    _surveyAnswers['q$index'] = value;
    notifyListeners();
  }

  ChatMessage _mapMsg(Map<String, dynamic> map) {
    final raw = map['sentAt']?.toString() ?? '';
    String stamp = raw;
    try {
      final dt = DateTime.parse(raw).toLocal();
      stamp =
          '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {}
    final status = (map['status'] ?? '').toString().toLowerCase();
    final seen = map['seenAt'] != null;
    final delivered = map['deliveredAt'] != null;
    final receipt = status == 'seen' || seen
        ? 'seen'
        : status == 'delivered' || delivered
            ? 'delivered'
            : 'sent';
    return ChatMessage(
      id: map['id']?.toString() ?? '',
      senderRole: map['senderRole']?.toString() ?? 'USER',
      senderName: map['senderName']?.toString() ?? '',
      text: map['text']?.toString() ?? '',
      sentAt: stamp,
      imageData: map['imageData']?.toString(),
      imageName: map['imageName']?.toString(),
      status: receipt,
    );
  }

  Timer? _typingAutoClear;

  void setAdminTyping(bool value) {
    _typingAutoClear?.cancel();
    if (value) {
      _typingAutoClear = Timer(const Duration(seconds: 4), () {
        if (!_adminTyping) return;
        _adminTyping = false;
        notifyListeners();
      });
    }
    if (_adminTyping == value) return;
    _adminTyping = value;
    notifyListeners();
  }

  /// Apply socket receipt: mark all USER messages delivered/seen.
  void applyReceipt(String status) {
    final next = status.toLowerCase();
    if (next != 'delivered' && next != 'seen') return;
    var changed = false;
    for (var i = 0; i < _chat.length; i++) {
      final m = _chat[i];
      if (m.senderRole != 'USER') continue;
      if (next == 'seen' && m.status != 'seen') {
        _chat[i] = m.copyWith(status: 'seen');
        changed = true;
      } else if (next == 'delivered' && m.status == 'sent') {
        _chat[i] = m.copyWith(status: 'delivered');
        changed = true;
      }
    }
    if (changed) notifyListeners();
  }

  void upsertLiveMessage(Map<String, dynamic> map) {
    final msg = _mapMsg(map);
    if (msg.id.isEmpty) return;
    final idx = _chat.indexWhere((m) => m.id == msg.id);
    if (idx >= 0) {
      _chat[idx] = msg;
    } else {
      // Drop matching optimistic local bubble.
      _chat.removeWhere(
        (m) =>
            m.id.startsWith('local-') &&
            m.senderRole == msg.senderRole &&
            m.text == msg.text,
      );
      _chat.add(msg);
    }
    _adminTyping = false;
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

  Future<void> loadMyTickets() async {
    _loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/support/tickets/me');
      if (data is List) {
        _tickets
          ..clear()
          ..addAll(data.map((e) {
            final m = Map<String, dynamic>.from(e as Map);
            return SupportTicket(
              id: m['id']?.toString() ?? '',
              kind: m['kind']?.toString() ?? 'REPORT',
              title: m['title']?.toString() ?? '',
              body: m['body']?.toString() ?? '',
              status: m['status']?.toString() ?? 'OPEN',
              createdAt: DateTime.tryParse(m['createdAt']?.toString() ?? '') ??
                  DateTime.now(),
            );
          }));
      }
    } catch (e) {
      debugPrint('Load tickets: $e');
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
      await loadMyTickets();
      return;
    } catch (e) {
      debugPrint('Ticket: $e');
    }
    _loading = false;
    notifyListeners();
  }

  /// [silent] = poll refresh — no spinner, merge so photos do not blink/dup.
  Future<void> loadAdminChat({bool silent = false}) async {
    if (_sending && silent) return;
    if (!silent) {
      _loading = true;
      notifyListeners();
    }
    try {
      final data = await ApiClient.instance.get('/support/chats/me')
          as Map<String, dynamic>;
      _threadId = data['id']?.toString();
      _unreadByUser = (data['unreadByUser'] as num?)?.toInt() ?? 0;
      final msgs = ((data['messages'] as List?) ?? [])
          .map((m) => _mapMsg(Map<String, dynamic>.from(m as Map)))
          .toList();
      final merged = _mergeChat(_chat, msgs);
      if (!_sameChatIds(_chat, merged)) {
        _chat
          ..clear()
          ..addAll(merged);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Load chat: $e');
    }
    if (!silent) {
      _loading = false;
      notifyListeners();
    }
  }

  bool _sameChatIds(List<ChatMessage> a, List<ChatMessage> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i].id != b[i].id) return false;
      if (a[i].status != b[i].status) return false;
      // Image payload may arrive after text-only stub — treat as change.
      final aImg = a[i].imageData ?? '';
      final bImg = b[i].imageData ?? '';
      if (aImg.length != bImg.length) return false;
    }
    return true;
  }

  List<ChatMessage> _mergeChat(
    List<ChatMessage> local,
    List<ChatMessage> remote,
  ) {
    final seen = <String>{};
    final out = <ChatMessage>[];
    for (final m in remote) {
      if (m.id.isEmpty) continue;
      if (seen.add(m.id)) out.add(m);
    }
    for (final m in local) {
      if (m.id.startsWith('local-')) {
        final dup = remote.any(
          (r) =>
              r.senderRole == m.senderRole &&
              r.text == m.text &&
              ((r.imageData == null) == (m.imageData == null) ||
                  (r.imageData != null && m.imageData != null)),
        );
        if (dup) continue;
      }
      if (seen.add(m.id)) out.add(m);
    }
    return out;
  }

  Future<bool> sendChat({
    required String senderName,
    required String text,
    String? imageData,
    String? imageName,
  }) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty && (imageData == null || imageData.isEmpty)) {
      return false;
    }
    if (_threadId == null) {
      await loadAdminChat();
    }
    if (_threadId == null) return false;

    _sending = true;
    final optimistic = ChatMessage(
      id: 'local-${DateTime.now().millisecondsSinceEpoch}',
      senderRole: 'USER',
      senderName: senderName,
      text: trimmed.isEmpty ? '📷 Photo' : trimmed,
      sentAt: _nowStamp(),
      imageData: imageData,
      imageName: imageName,
    );
    _chat.add(optimistic);
    notifyListeners();

    try {
      final data = await ApiClient.instance.post(
        '/support/chats/$_threadId/messages',
        body: {
          if (trimmed.isNotEmpty) 'text': trimmed,
          if (imageData != null) 'imageData': imageData,
          if (imageName != null) 'imageName': imageName,
        },
      ) as Map<String, dynamic>;
      final msgs = ((data['messages'] as List?) ?? [])
          .map((m) => _mapMsg(Map<String, dynamic>.from(m as Map)))
          .toList();
      // Swap optimistic bubble in-place so the photo does not remount/blink.
      final optIdx = _chat.indexWhere((m) => m.id == optimistic.id);
      final known = _chat
          .where((m) => !m.id.startsWith('local-'))
          .map((m) => m.id)
          .toSet();
      final newcomers = msgs.where((m) => !known.contains(m.id)).toList();
      if (optIdx >= 0 && newcomers.isNotEmpty) {
        _chat[optIdx] = newcomers.last;
        for (final m in newcomers) {
          if (!_chat.any((c) => c.id == m.id)) _chat.add(m);
        }
      } else {
        _chat
          ..clear()
          ..addAll(_mergeChat(
            _chat.where((m) => m.id != optimistic.id).toList(),
            msgs,
          ));
      }
      _sending = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Send chat: $e');
      _chat.removeWhere((m) => m.id == optimistic.id);
      _sending = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> sendChatImage({
    required String senderName,
    required List<int> bytes,
    String fileName = 'chat.jpg',
    String caption = '',
  }) async {
    final dataUrl = await ImageCompressService.toDataUrl(
      Uint8List.fromList(bytes),
      maxSide: 1280,
    );
    final name = fileName.toLowerCase().endsWith('.png')
        ? fileName
        : '${fileName.replaceAll(RegExp(r'\.\w+$'), '')}.png';
    return sendChat(
      senderName: senderName,
      text: caption,
      imageData: dataUrl,
      imageName: name,
    );
  }

  String _nowStamp() {
    final now = DateTime.now();
    return '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
  }
}
