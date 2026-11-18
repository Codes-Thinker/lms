import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:provider/provider.dart';
import '../../core/api_errors.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/ui_provider.dart';
import '../../services/api_client.dart';
import '../../services/local_cache.dart';
import '../../widgets/app_loader.dart';

class _AiMsg {
  final String id;
  final String role; // user | assistant
  final String content;
  final DateTime? createdAt;

  const _AiMsg({
    required this.id,
    required this.role,
    required this.content,
    this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role,
        'content': content,
        if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      };

  static _AiMsg? fromAny(dynamic row) {
    if (row is! Map) return null;
    final content = '${row['content'] ?? ''}'.trim();
    if (content.isEmpty) return null;
    return _AiMsg(
      id: '${row['id'] ?? content.hashCode}',
      role: '${row['role'] ?? 'assistant'}',
      content: content,
      createdAt: DateTime.tryParse('${row['createdAt'] ?? ''}'),
    );
  }
}

/// AI Study Coach — study-plan only chat with local cache + soft loading UX.
class AiCoachScreen extends StatefulWidget {
  final String? courseId;

  const AiCoachScreen({super.key, this.courseId});

  @override
  State<AiCoachScreen> createState() => _AiCoachScreenState();
}

class _AiCoachScreenState extends State<AiCoachScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final _focus = FocusNode();

  final List<_AiMsg> _messages = [];
  bool _loading = true;
  bool _sending = false;
  int? _remainingToday;
  String? _mode;

  static const _suggestions = [
    'What should I study next on my plan?',
    'Make a 45-minute revision plan for today',
    'Quiz me on my unfinished topics',
    'How do I prepare for my next course quiz?',
  ];

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 80,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  List<_AiMsg> _mapHistory(dynamic hist) {
    final list = <_AiMsg>[];
    if (hist is! List) return list;
    for (final row in hist) {
      final msg = _AiMsg.fromAny(row);
      if (msg != null) list.add(msg);
    }
    return list;
  }

  Future<void> _persist() async {
    await LocalCache.setJson(
      LocalCache.aiHistory,
      _messages.map((m) => m.toJson()).toList(),
    );
    await LocalCache.setJson(LocalCache.aiStatus, {
      if (_mode != null) 'mode': _mode,
      if (_remainingToday != null) 'remainingToday': _remainingToday,
    });
  }

  Future<void> _bootstrap() async {
    final cachedHist = await LocalCache.getList(LocalCache.aiHistory);
    final cachedStatus = await LocalCache.getMap(LocalCache.aiStatus);
    if (!mounted) return;

    if (cachedHist.isNotEmpty) {
      setState(() {
        _messages
          ..clear()
          ..addAll(_mapHistory(cachedHist));
        if (cachedStatus != null) {
          _mode = cachedStatus['mode']?.toString();
          final rem = cachedStatus['remainingToday'];
          if (rem is num) _remainingToday = rem.toInt();
        }
        _loading = false;
      });
      _scrollToEnd();
    } else {
      setState(() => _loading = true);
    }

    await _refreshFromApi(silent: _messages.isNotEmpty);
  }

  Future<void> _refreshFromApi({bool silent = false}) async {
    if (!silent && _messages.isEmpty) {
      setState(() => _loading = true);
    }
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/ai/history'),
        ApiClient.instance.get('/ai/status'),
      ]);
      if (!mounted) return;
      final list = _mapHistory(results[0]);
      final status = results[1];
      setState(() {
        _messages
          ..clear()
          ..addAll(list);
        if (status is Map) {
          _mode = '${status['mode'] ?? ''}';
          final limit = status['dailyLimit'];
          if (limit is num) _remainingToday = limit.toInt();
        }
        _loading = false;
      });
      await _persist();
      _scrollToEnd();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      if (!silent && _messages.isEmpty) {
        context.read<UiProvider>().showSnack(
              ApiErrors.friendly(e, fallback: 'Could not load chat history.'),
              tone: AppSnackTone.error,
            );
      }
    }
  }

  Future<void> _clearHistory() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear chat?'),
        content: const Text('This removes your AI Study Coach history.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Clear',
              style: TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await ApiClient.instance.delete('/ai/history');
      if (!mounted) return;
      setState(() => _messages.clear());
      await _persist();
      if (!mounted) return;
      context.read<UiProvider>().showSnack('Chat cleared');
    } catch (e) {
      if (!mounted) return;
      context.read<UiProvider>().showSnack(
            ApiErrors.friendly(e, fallback: 'Could not clear chat.'),
            tone: AppSnackTone.error,
          );
    }
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _controller.text).trim();
    if (text.length < 2 || _sending) return;

    final tempId = 'local-${DateTime.now().microsecondsSinceEpoch}';
    setState(() {
      _sending = true;
      _controller.clear();
      _messages.add(
        _AiMsg(
          id: tempId,
          role: 'user',
          content: text,
          createdAt: DateTime.now(),
        ),
      );
    });
    await _persist();
    _scrollToEnd();

    try {
      final body = <String, dynamic>{'message': text};
      final courseId = widget.courseId?.trim();
      if (courseId != null && courseId.isNotEmpty) {
        body['courseId'] = courseId;
      }

      final data = await ApiClient.instance.post('/ai/chat', body: body);
      if (!mounted) return;

      String reply = 'Sorry — I could not generate a reply.';
      if (data is Map) {
        reply = '${data['reply'] ?? reply}';
        final rem = data['remainingToday'];
        if (rem is num) _remainingToday = rem.toInt();
        _mode = '${data['mode'] ?? _mode ?? ''}';
        final warning = data['warning'];
        if (warning is String && warning.trim().isNotEmpty) {
          context.read<UiProvider>().showSnack(
                warning.trim(),
                tone: AppSnackTone.warning,
              );
        }
      }

      setState(() {
        _messages.add(
          _AiMsg(
            id: 'asst-${DateTime.now().microsecondsSinceEpoch}',
            role: 'assistant',
            content: reply,
            createdAt: DateTime.now(),
          ),
        );
        _sending = false;
      });
      await _persist();
      _scrollToEnd();
    } catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      context.read<UiProvider>().showSnack(
            ApiErrors.friendly(e, fallback: 'Could not send message.'),
            tone: AppSnackTone.error,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final modeLabel = _mode == 'llm'
        ? 'Study plan'
        : (_mode == 'local' ||
                _mode == 'local-fallback' ||
                _mode == 'safe-guard')
            ? 'Study plan'
            : null;
    final subtitle = [
      if (_remainingToday != null) '$_remainingToday left today',
      if (modeLabel != null) modeLabel,
      if (_remainingToday == null && modeLabel == null)
        'Your enrolled courses only',
    ].join(' · ');

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'AI Study Coach',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.muted,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        actions: [
          if (_messages.isNotEmpty)
            IconButton(
              tooltip: 'Clear chat',
              onPressed: _sending ? null : _clearHistory,
              icon: const Icon(Icons.delete_outline_rounded),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading && _messages.isEmpty
                ? const _SkeletonChat()
                : _messages.isEmpty
                    ? _EmptyState(onSuggestion: _sending ? null : _send)
                    : ListView.builder(
                        controller: _scroll,
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                        itemCount: _messages.length + (_sending ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (_sending && index == _messages.length) {
                            return const _TypingBubble();
                          }
                          final msg = _messages[index];
                          return _ChatBubble(
                            key: ValueKey(msg.id),
                            mine: msg.role == 'user',
                            text: msg.content,
                          );
                        },
                      ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      focusNode: _focus,
                      enabled: !_sending,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: 'Ask about your study plan…',
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : () => _send(),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.blue,
                    ),
                    icon: _sending
                        ? const AppLoader(size: 18, color: Colors.white)
                        : const Icon(Icons.send_rounded, color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final bool mine;
  final String text;

  const _ChatBubble({super.key, required this.mine, required this.text});

  /// Clipboard-friendly plain text (no raw markdown markers).
  static String plainCopy(String raw) {
    var s = raw;
    s = s.replaceAllMapped(
      RegExp(r'\*\*([^*]+)\*\*'),
      (m) => m.group(1) ?? '',
    );
    s = s.replaceAllMapped(
      RegExp(r'__([^_]+)__'),
      (m) => m.group(1) ?? '',
    );
    s = s.replaceAllMapped(
      RegExp(r'(^|\s)\*([^*\n]+)\*(?=\s|$)'),
      (m) => '${m.group(1) ?? ''}${m.group(2) ?? ''}',
    );
    s = s.replaceAllMapped(
      RegExp(r'^#{1,6}\s*', multiLine: true),
      (_) => '',
    );
    s = s.replaceAll(RegExp(r'`+'), '');
    return s.trim();
  }

  Future<void> _copy(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: plainCopy(text)));
    if (!context.mounted) return;
    context.read<UiProvider>().showSnack('Message copied');
  }

  @override
  Widget build(BuildContext context) {
    final baseStyle = TextStyle(
      color: mine ? Colors.white : AppColors.ink,
      height: 1.4,
      fontSize: 14.5,
    );

    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: () => _copy(context),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          constraints: const BoxConstraints(maxWidth: 320),
          decoration: BoxDecoration(
            color: mine ? AppColors.blue : Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(mine ? 16 : 4),
              bottomRight: Radius.circular(mine ? 4 : 16),
            ),
            border: mine ? null : Border.all(color: AppColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (mine)
                SelectableText(text, style: baseStyle)
              else
                MarkdownBody(
                  data: text,
                  selectable: true,
                  softLineBreak: true,
                  styleSheet: MarkdownStyleSheet(
                    p: baseStyle,
                    strong: baseStyle.copyWith(fontWeight: FontWeight.w800),
                    em: baseStyle.copyWith(fontStyle: FontStyle.italic),
                    listBullet: baseStyle,
                    unorderedListAlign: WrapAlignment.start,
                    orderedListAlign: WrapAlignment.start,
                    h1: baseStyle.copyWith(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                    h2: baseStyle.copyWith(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                    h3: baseStyle.copyWith(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                    blockquote: baseStyle.copyWith(color: AppColors.muted),
                    code: baseStyle.copyWith(
                      fontFamily: 'monospace',
                      backgroundColor: AppColors.softBlue,
                    ),
                    a: baseStyle.copyWith(
                      color: AppColors.blueDark,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(
                  tooltip: 'Copy',
                  onPressed: () => _copy(context),
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 28,
                    minHeight: 28,
                  ),
                  icon: Icon(
                    Icons.copy_rounded,
                    size: 15,
                    color: mine
                        ? Colors.white.withValues(alpha: 0.85)
                        : AppColors.muted,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SkeletonChat extends StatefulWidget {
  const _SkeletonChat();

  @override
  State<_SkeletonChat> createState() => _SkeletonChatState();
}

class _SkeletonChatState extends State<_SkeletonChat>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  static const _rows = <(bool, double)>[
    (false, 0.72),
    (true, 0.55),
    (false, 0.84),
    (true, 0.48),
    (false, 0.66),
  ];

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, _) {
        final t = 0.45 + (_pulse.value * 0.35);
        return ListView.builder(
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          itemCount: _rows.length,
          itemBuilder: (context, i) {
            final mine = _rows[i].$1;
            final widthFactor = _rows[i].$2;
            return Align(
              alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                width: MediaQuery.sizeOf(context).width * widthFactor * 0.78,
                height: mine ? 44 : 58,
                decoration: BoxDecoration(
                  color: (mine ? AppColors.blue : AppColors.line)
                      .withValues(alpha: mine ? t * 0.55 : t),
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: Radius.circular(mine ? 16 : 4),
                    bottomRight: Radius.circular(mine ? 4 : 16),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  final ValueChanged<String>? onSuggestion;

  const _EmptyState({this.onSuggestion});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
      children: [
        Center(
          child: Image.asset(
            AppBrand.aiRobotBubbleAsset,
            width: 88,
            height: 88,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.high,
            errorBuilder: (_, __, ___) => Container(
              width: 80,
              height: 80,
              decoration: const BoxDecoration(
                color: AppColors.softBlue,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.auto_awesome_rounded,
                color: AppColors.blueDark,
                size: 36,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Your study-plan coach',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppColors.ink,
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'I only guide your enrolled courses — next topics, revision, quizzes, and tasks.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            height: 1.4,
            color: AppColors.muted,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 22),
        ..._AiCoachScreenState._suggestions.map(
          (s) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Material(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: onSuggestion == null ? null : () => onSuggestion!(s),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Text(
                    s,
                    style: const TextStyle(
                      color: AppColors.ink,
                      fontWeight: FontWeight.w600,
                      fontSize: 13.5,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _TypingBubble extends StatefulWidget {
  const _TypingBubble();

  @override
  State<_TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<_TypingBubble> {
  int _step = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 380), (_) {
      if (!mounted) return;
      setState(() => _step = (_step + 1) % 3);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(16),
            topRight: Radius.circular(16),
            bottomLeft: Radius.circular(4),
            bottomRight: Radius.circular(16),
          ),
          border: Border.all(color: AppColors.line),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final active = i <= _step;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              margin: EdgeInsets.only(right: i == 2 ? 0 : 5),
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: active ? AppColors.blue : AppColors.line,
                shape: BoxShape.circle,
              ),
            );
          }),
        ),
      ),
    );
  }
}
