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
    final subtitle = [
      if (_remainingToday != null) '$_remainingToday left today',
      'Study plan',
    ].join(' · ');

    return Scaffold(
      backgroundColor: const Color(0xFFF3F6FB),
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: const Color(0xFFF3F6FB),
        foregroundColor: AppColors.ink,
        titleSpacing: 0,
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.blue.withValues(alpha: 0.14),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(4),
              child: Image.asset(
                AppBrand.aiRobotBubbleAsset,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.auto_awesome_rounded,
                  color: AppColors.blueDark,
                  size: 20,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'AI Study Coach',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppColors.muted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
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
            child: DecoratedBox(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFFF3F6FB), Color(0xFFEEF3FA)],
                ),
              ),
              child: _loading && _messages.isEmpty
                  ? const _SkeletonChat()
                  : _messages.isEmpty
                      ? _EmptyState(onSuggestion: _sending ? null : _send)
                      : ListView.builder(
                          controller: _scroll,
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
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
          ),
          _ComposerBar(
            controller: _controller,
            focusNode: _focus,
            sending: _sending,
            onSend: _send,
          ),
        ],
      ),
    );
  }
}

class _ComposerBar extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool sending;
  final VoidCallback onSend;

  const _ComposerBar({
    required this.controller,
    required this.focusNode,
    required this.sending,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        border: const Border(top: BorderSide(color: Color(0xFFE6ECF4))),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7F9FC),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: controller,
                    focusNode: focusNode,
                    enabled: !sending,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => onSend(),
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppColors.ink,
                      height: 1.35,
                    ),
                    decoration: const InputDecoration(
                      hintText: 'Ask about your study plan…',
                      hintStyle: TextStyle(
                        color: AppColors.muted,
                        fontWeight: FontWeight.w500,
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Material(
                color: AppColors.blueDark,
                borderRadius: BorderRadius.circular(16),
                elevation: 0,
                child: InkWell(
                  onTap: sending ? null : onSend,
                  borderRadius: BorderRadius.circular(16),
                  child: SizedBox(
                    width: 48,
                    height: 48,
                    child: Center(
                      child: sending
                          ? const AppLoader(size: 20, color: Colors.white)
                          : const Icon(
                              Icons.arrow_upward_rounded,
                              color: Colors.white,
                              size: 22,
                            ),
                    ),
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

class _ChatBubble extends StatelessWidget {
  final bool mine;
  final String text;

  const _ChatBubble({super.key, required this.mine, required this.text});

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

  Future<void> _copyAi(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: plainCopy(text)));
    if (!context.mounted) return;
    context.read<UiProvider>().showSnack('Reply copied');
    HapticFeedback.selectionClick();
  }

  @override
  Widget build(BuildContext context) {
    if (mine) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12, left: 56),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          constraints: const BoxConstraints(maxWidth: 300),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
            ),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(18),
              topRight: Radius.circular(18),
              bottomLeft: Radius.circular(18),
              bottomRight: Radius.circular(6),
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.blue.withValues(alpha: 0.28),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              height: 1.35,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      );
    }

    final baseStyle = const TextStyle(
      color: AppColors.ink,
      height: 1.45,
      fontSize: 14.5,
      fontWeight: FontWeight.w500,
    );

    return Align(
      alignment: Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: () => _copyAi(context),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12, right: 40),
          constraints: const BoxConstraints(maxWidth: 320),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(6),
              topRight: Radius.circular(18),
              bottomLeft: Radius.circular(18),
              bottomRight: Radius.circular(18),
            ),
            border: Border.all(color: const Color(0xFFE8EEF6)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E293B).withValues(alpha: 0.05),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: AppColors.softBlue,
                        borderRadius: BorderRadius.circular(7),
                      ),
                      padding: const EdgeInsets.all(2),
                      child: Image.asset(
                        AppBrand.aiRobotBubbleAsset,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.auto_awesome_rounded,
                          size: 12,
                          color: AppColors.blueDark,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Coach',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.muted,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                MarkdownBody(
                  data: text,
                  selectable: false,
                  softLineBreak: true,
                  styleSheet: MarkdownStyleSheet(
                    p: baseStyle,
                    pPadding: const EdgeInsets.only(bottom: 6),
                    strong: baseStyle.copyWith(fontWeight: FontWeight.w800),
                    em: baseStyle.copyWith(fontStyle: FontStyle.italic),
                    listBullet: baseStyle,
                    listIndent: 18,
                    h1: baseStyle.copyWith(
                      fontSize: 16.5,
                      fontWeight: FontWeight.w800,
                    ),
                    h2: baseStyle.copyWith(
                      fontSize: 15.5,
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
              ],
            ),
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
          child: Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: AppColors.blue.withValues(alpha: 0.16),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            padding: const EdgeInsets.all(14),
            child: Image.asset(
              AppBrand.aiRobotBubbleAsset,
              fit: BoxFit.contain,
              filterQuality: FilterQuality.high,
              errorBuilder: (_, __, ___) => const Icon(
                Icons.auto_awesome_rounded,
                color: AppColors.blueDark,
                size: 40,
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        const Text(
          'Your study-plan coach',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.ink,
            letterSpacing: -0.4,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'I only guide your enrolled courses — next topics, revision, quizzes, and tasks.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            height: 1.45,
            color: AppColors.muted,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 24),
        ..._AiCoachScreenState._suggestions.map(
          (s) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Material(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              elevation: 0,
              shadowColor: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: onSuggestion == null ? null : () => onSuggestion!(s),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 13,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE6ECF4)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF1E293B).withValues(alpha: 0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          s,
                          style: const TextStyle(
                            color: AppColors.ink,
                            fontWeight: FontWeight.w600,
                            fontSize: 13.5,
                            height: 1.3,
                          ),
                        ),
                      ),
                      const Icon(
                        Icons.north_east_rounded,
                        size: 16,
                        color: AppColors.blue,
                      ),
                    ],
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
        margin: const EdgeInsets.only(bottom: 12, right: 40),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(6),
            topRight: Radius.circular(18),
            bottomLeft: Radius.circular(18),
            bottomRight: Radius.circular(18),
          ),
          border: Border.all(color: const Color(0xFFE8EEF6)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1E293B).withValues(alpha: 0.05),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
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
                color: active ? AppColors.blue : const Color(0xFFD8E0EA),
                shape: BoxShape.circle,
              ),
            );
          }),
        ),
      ),
    );
  }
}
