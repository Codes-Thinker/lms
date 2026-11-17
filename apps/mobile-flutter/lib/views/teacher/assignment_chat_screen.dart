import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_errors.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/teaching_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_loader.dart';

/// Full-screen assignment thread (teacher ↔ student). Used from My classes + notification deep-link.
class AssignmentChatScreen extends StatefulWidget {
  final String taskId;

  const AssignmentChatScreen({super.key, required this.taskId});

  @override
  State<AssignmentChatScreen> createState() => _AssignmentChatScreenState();
}

class _AssignmentChatScreenState extends State<AssignmentChatScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  bool _sending = false;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TeachingProvider>().load(silent: true);
    });
    _poll = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      context.read<TeachingProvider>().load(silent: true);
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 60,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _controller.clear();
    try {
      final name = context.read<AuthProvider>().user?.name ?? 'Teacher';
      await context.read<TeachingProvider>().sendAssignmentMessage(
            taskId: widget.taskId,
            text: text,
            senderName: name,
          );
      _scrollToEnd();
    } catch (e) {
      if (mounted) {
        _controller.text = text;
        context.read<UiProvider>().showSnack(
              ApiErrors.friendly(e),
              tone: AppSnackTone.error,
            );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    AssignedStudentTask? task;
    try {
      task = context
          .watch<TeachingProvider>()
          .assigned
          .firstWhere((t) => t.id == widget.taskId);
    } catch (_) {
      task = null;
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              task?.title ?? 'Assignment',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            Text(
              '${task?.assignedToName ?? 'Student'}, ${task?.spentMinutes ?? 0}m worked',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.muted,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
      body: task == null
          ? const Center(child: AppLoader())
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    controller: _scroll,
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    children: [
                      if (task.chat.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Text(
                            'No messages yet. Student updates appear here.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.muted),
                          ),
                        ),
                      ...task.chat.map((msg) {
                        final mine = msg.senderRole == 'ADMIN';
                        return Align(
                          alignment: mine
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            constraints: const BoxConstraints(maxWidth: 280),
                            decoration: BoxDecoration(
                              color: mine ? AppColors.blue : Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: mine
                                  ? null
                                  : Border.all(color: AppColors.line),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${msg.senderName}, ${msg.sentAt}',
                                  style: TextStyle(
                                    color: mine
                                        ? Colors.white70
                                        : AppColors.muted,
                                    fontSize: 11,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  msg.text,
                                  style: TextStyle(
                                    color:
                                        mine ? Colors.white : AppColors.ink,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => _send(),
                            decoration: InputDecoration(
                              hintText: 'Reply to student…',
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filled(
                          onPressed: _sending ? null : _send,
                          style: IconButton.styleFrom(
                            backgroundColor: AppColors.blue,
                          ),
                          icon: const Icon(Icons.send_rounded,
                              color: Colors.white),
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
