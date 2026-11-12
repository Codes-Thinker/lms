import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/time_utils.dart';
import '../../providers/auth_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_loader.dart';

class TaskDetailScreen extends StatelessWidget {
  final String taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  String _fmt(int totalSeconds) {
    final m = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (totalSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final tasks = context.watch<TaskProvider>();
    final now = context.watch<UiProvider>().now;
    final task = tasks.byId(taskId);
    final running = tasks.isTimerRunning(taskId);

    if (task == null) {
      return const Scaffold(body: Center(child: AppLoader()));
    }

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
                Text(task.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
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
                      const Text('Due in', style: TextStyle(fontWeight: FontWeight.w600)),
                      const Spacer(),
                      Text(
                        TimeUtils.countdown(task.dueAt, now),
                        style: const TextStyle(color: AppColors.pink, fontWeight: FontWeight.w800),
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
                        _fmt(task.remainingSeconds),
                        style: const TextStyle(
                          fontSize: 40,
                          fontWeight: FontWeight.w800,
                          color: AppColors.blue,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Task timer · ${task.timerMinutes} min total',
                        style: const TextStyle(color: AppColors.muted),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: task.isComplete
                                  ? null
                                  : () {
                                      tasks.toggleTimer(task.id);
                                      context.read<UiProvider>().showSnack(running ? 'Timer paused' : 'Timer started', tone: AppSnackTone.info);
                                    },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.blue,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(running ? 'Pause timer' : 'Start timer'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: task.isComplete
                                  ? null
                                  : () {
                                      tasks.completeTask(task.id);
                                      context.read<UiProvider>().showSnack('Task marked complete', tone: AppSnackTone.success);
                                    },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.green,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(task.isComplete ? 'Completed' : 'Mark complete'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text('What to study / do', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(task.description, style: const TextStyle(height: 1.4)),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.softBlue,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(task.studyNotes, style: const TextStyle(height: 1.45)),
                ),
                const SizedBox(height: 16),
                const Text('Chat', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 8),
                ...task.chat.map((msg) {
                  final mine = msg.senderRole == 'USER';
                  return Align(
                    alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
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
                            style: TextStyle(color: mine ? Colors.white : AppColors.ink),
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

/// Holds TextEditingController only — no setState.
class _TaskChatBar extends StatefulWidget {
  final String taskId;
  final String senderName;

  const _TaskChatBar({required this.taskId, required this.senderName});

  @override
  State<_TaskChatBar> createState() => _TaskChatBarState();
}

class _TaskChatBarState extends State<_TaskChatBar> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
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
                decoration: InputDecoration(
                  hintText: 'Ask / update on this task...',
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
              onPressed: () {
                final text = _controller.text.trim();
                if (text.isEmpty) return;
                context.read<TaskProvider>().sendChat(
                      taskId: widget.taskId,
                      senderName: widget.senderName,
                      text: text,
                    );
                _controller.clear();
                context.read<UiProvider>().showSnack('Message sent', tone: AppSnackTone.info);
              },
              style: IconButton.styleFrom(backgroundColor: AppColors.blue),
              icon: const Icon(Icons.send_rounded, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
