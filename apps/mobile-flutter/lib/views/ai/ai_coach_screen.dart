import 'package:flutter/material.dart';
import '../../widgets/app_loader.dart';
import 'package:provider/provider.dart';
import '../../core/api_errors.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/ui_provider.dart';
import '../../services/api_client.dart';

class _Bubble {
  final String role;
  final String content;
  _Bubble({required this.role, required this.content});
}

class AiCoachScreen extends StatefulWidget {
  const AiCoachScreen({super.key});

  @override
  State<AiCoachScreen> createState() => _AiCoachScreenState();
}

class _AiCoachScreenState extends State<AiCoachScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _messages = <_Bubble>[];
  bool _loading = true;
  bool _sending = false;
  String? _mode;
  int? _remaining;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    setState(() => _loading = true);
    try {
      final status = await ApiClient.instance.get('/ai/status') as Map;
      final history = await ApiClient.instance.get('/ai/history');
      final list = history is List ? history : <dynamic>[];
      if (!mounted) return;
      setState(() {
        _mode = status['mode']?.toString();
        _messages
          ..clear()
          ..addAll(
            list.whereType<Map>().map(
                  (m) => _Bubble(
                    role: m['role']?.toString() ?? 'assistant',
                    content: m['content']?.toString() ?? '',
                  ),
                ),
          );
        if (_messages.isEmpty) {
          _messages.add(
            _Bubble(
              role: 'assistant',
              content:
                  'Hi. I am your Codes Thinker study coach. Ask about study plans, quiz prep, certificates, or a topic you are stuck on.',
            ),
          );
        }
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _messages.add(
          _Bubble(
            role: 'assistant',
            content: ApiErrors.friendly(e),
          ),
        );
      });
    }
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _messages.add(_Bubble(role: 'user', content: text));
      _input.clear();
    });
    _jumpBottom();
    try {
      final res = await ApiClient.instance.post(
        '/ai/chat',
        body: {'message': text},
      ) as Map;
      if (!mounted) return;
      setState(() {
        _messages.add(
          _Bubble(
            role: 'assistant',
            content: res['reply']?.toString() ?? 'No reply',
          ),
        );
        _remaining = (res['remainingToday'] as num?)?.toInt();
        _mode = res['mode']?.toString() ?? _mode;
        _sending = false;
      });
      _jumpBottom();
      final warning = res['warning']?.toString();
      if (warning != null && warning.isNotEmpty && mounted) {
        context.read<UiProvider>().showSnack(warning, tone: AppSnackTone.warning);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _messages.add(
          _Bubble(role: 'assistant', content: ApiErrors.fromApi(e)),
        );
        _sending = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages.add(
          _Bubble(role: 'assistant', content: ApiErrors.friendly(e)),
        );
        _sending = false;
      });
    }
  }

  Future<void> _clear() async {
    try {
      await ApiClient.instance.delete('/ai/history');
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..add(
            _Bubble(
              role: 'assistant',
              content: 'Chat cleared. How can I help you study?',
            ),
          );
      });
    } catch (e) {
      if (!mounted) return;
      context.read<UiProvider>().showSnack(
            ApiErrors.friendly(e),
            tone: AppSnackTone.error,
          );
    }
  }

  void _jumpBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('AI Study Coach'),
        actions: [
          IconButton(
            tooltip: 'Clear chat',
            onPressed: _clear,
            icon: const Icon(Icons.delete_outline_rounded),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: AppLoader())
          : Column(
              children: [
                if (_mode != null || _remaining != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: Row(
                      children: [
                        if (_mode != null)
                          Text(
                            'Mode: $_mode',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.muted,
                            ),
                          ),
                        const Spacer(),
                        if (_remaining != null)
                          Text(
                            'Left today: $_remaining',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.muted,
                            ),
                          ),
                      ],
                    ),
                  ),
                Expanded(
                  child: ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    itemCount: _messages.length + (_sending ? 1 : 0),
                    itemBuilder: (_, i) {
                      if (_sending && i == _messages.length) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 10),
                          child: Row(
                            children: [
                              AppLoader(size: 22),
                              SizedBox(width: 10),
                              Text(
                                'Thinking…',
                                style: TextStyle(color: AppColors.muted),
                              ),
                            ],
                          ),
                        );
                      }
                      final m = _messages[i];
                      final mine = m.role == 'user';
                      return Align(
                        alignment:
                            mine ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.82,
                          ),
                          decoration: BoxDecoration(
                            color: mine ? AppColors.blue : Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: mine
                                ? null
                                : Border.all(color: AppColors.line),
                          ),
                          child: Text(
                            m.content,
                            style: TextStyle(
                              color: mine ? Colors.white : AppColors.ink,
                              height: 1.35,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _input,
                            minLines: 1,
                            maxLines: 5,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => _send(),
                            style: const TextStyle(
                              fontSize: 15,
                              height: 1.35,
                              color: AppColors.ink,
                            ),
                            cursorColor: AppColors.blue,
                            decoration: InputDecoration(
                              hintText: 'Ask a study question…',
                              hintStyle: TextStyle(
                                color: AppColors.muted.withValues(alpha: 0.85),
                                fontSize: 14.5,
                                fontWeight: FontWeight.w400,
                              ),
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                              prefixIcon: const Icon(
                                Icons.auto_awesome_rounded,
                                size: 20,
                                color: AppColors.blue,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(22),
                                borderSide: const BorderSide(color: AppColors.line),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(22),
                                borderSide: const BorderSide(color: AppColors.line),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(22),
                                borderSide: const BorderSide(
                                  color: AppColors.blue,
                                  width: 1.4,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        SizedBox(
                          width: 48,
                          height: 48,
                          child: IconButton.filled(
                            onPressed: _sending ? null : _send,
                            style: IconButton.styleFrom(
                              backgroundColor: AppColors.blue,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor:
                                  AppColors.blue.withValues(alpha: 0.45),
                            ),
                            icon: const Icon(Icons.send_rounded, size: 22),
                          ),
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
