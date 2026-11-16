import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/task_provider.dart';
import '../../widgets/app_loader.dart';
import '../../widgets/live_countdown.dart';

class TaskDetailScreen extends StatefulWidget {
  final String taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  Timer? _poll;

  String _fmt(int totalSeconds) {
    final m = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (totalSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  void initState() {
    super.initState();
    // Keep chat + spent time in sync with backend / teacher replies.
    _poll = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted) return;
      context.read<TaskProvider>().load(silent: true);
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final tasks = context.watch<TaskProvider>();
    final task = tasks.byId(widget.taskId);
    final running = tasks.isTimerRunning(widget.taskId);

    if (task == null) {
      return const Scaffold(body: Center(child: AppLoader()));
    }

    final teacherName =
        task.assignedBy.trim().isEmpty ? 'your teacher' : task.assignedBy;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Task'),
        backgroundColor: AppColors.bg,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(task.title,
                    style: const TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text(
                  '${task.courseTitle} · assigned by ${task.assignedBy}',
                  style: const TextStyle(color: AppColors.muted),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.softPink,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      const Text('Due in',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      const Spacer(),
                      LiveCountdown(
                        target: task.dueAt,
                        style: const TextStyle(
                          color: AppColors.pink,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    children: [
                      Text(
                        _fmt(task.elapsedSeconds),
                        style: const TextStyle(
                          fontSize: 40,
                          fontWeight: FontWeight.w800,
                          color: AppColors.blue,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        task.isComplete
                            ? 'Saved · ${(task.elapsedSeconds / 60).ceil()} min worked'
                            : task.timerMinutes > 0
                                ? 'Counting up · goal ${task.timerMinutes} min'
                                : 'Counting up · saved to teacher on pause',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.muted),
                      ),
                      if (task.remainingSeconds != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Remaining ${_fmt(task.remainingSeconds!)}',
                          style: const TextStyle(
                            color: AppColors.blue,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: task.isComplete
                                  ? null
                                  : () => tasks.toggleTimer(task.id),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.blue,
                                foregroundColor: Colors.white,
                                disabledBackgroundColor:
                                    AppColors.line.withValues(alpha: 0.5),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(
                                  running ? 'Pause timer' : 'Start timer'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: task.isComplete
                                  ? null
                                  : () => tasks.completeTask(task.id),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.green,
                                foregroundColor: Colors.white,
                                disabledBackgroundColor:
                                    AppColors.line.withValues(alpha: 0.5),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(task.isComplete
                                  ? 'Completed'
                                  : 'Mark complete'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text('What to study / do',
                    style:
                        TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(task.description,
                      style: const TextStyle(height: 1.4)),
                ),
                if (task.studyNotes.trim().isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.softBlue,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(task.studyNotes,
                        style: const TextStyle(height: 1.45)),
                  ),
                ],
                const SizedBox(height: 16),
                Text(
                  'Chat with $teacherName',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 16),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Messages go to your teacher (and admin Teachers page).',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                const SizedBox(height: 8),
                if (task.chat.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      'No messages yet — ask a question or send an update.',
                      style: TextStyle(color: AppColors.muted),
                    ),
                  ),
                ...task.chat.map((msg) {
                  final mine = msg.senderRole == 'USER';
                  return Align(
                    alignment:
                        mine ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      constraints: const BoxConstraints(maxWidth: 280),
                      decoration: BoxDecoration(
                        color: mine ? AppColors.blue : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${msg.senderName} · ${msg.sentAt}',
                            style: TextStyle(
                              color: mine ? Colors.white70 : AppColors.muted,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            msg.text,
                            style: TextStyle(
                                color: mine ? Colors.white : AppColors.ink),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
          _TaskChatBar(
            taskId: task.id,
            senderName: auth.user?.name ?? 'User',
          ),
        ],
      ),
    );
  }
}

/// Holds TextEditingController only — no setState for list/timer.
class _TaskChatBar extends StatefulWidget {
  final String taskId;
  final String senderName;

  const _TaskChatBar({required this.taskId, required this.senderName});

  @override
  State<_TaskChatBar> createState() => _TaskChatBarState();
}

class _TaskChatBarState extends State<_TaskChatBar> {
  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _controller.clear();
    try {
      await context.read<TaskProvider>().sendChat(
            taskId: widget.taskId,
            senderName: widget.senderName,
            text: text,
          );
    } catch (_) {
      if (mounted) {
        _controller.text = text;
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
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
                  hintText: 'Message your teacher…',
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
              style: IconButton.styleFrom(backgroundColor: AppColors.blue),
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send_rounded, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
