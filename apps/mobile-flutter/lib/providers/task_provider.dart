import 'dart:async';

import 'package:flutter/foundation.dart';
import '../core/mock_data.dart';
import '../models/task.dart';

class TaskProvider extends ChangeNotifier {
  List<AssignedTask> _tasks = [];
  bool _loading = false;
  String? _activeTimerTaskId;
  Timer? _workTimer;

  List<AssignedTask> get tasks => List.unmodifiable(_tasks);
  bool get loading => _loading;
  String? get activeTimerTaskId => _activeTimerTaskId;

  bool isTimerRunning(String taskId) => _activeTimerTaskId == taskId;

  List<AssignedTask> tasksForUser(String userId) =>
      _tasks.where((t) => t.assignedToId == userId).toList();

  int openCountFor(String userId) =>
      tasksForUser(userId).where((t) => t.status != 'DONE').length;

  Future<void> load() async {
    _loading = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 400));
    seedMockTasks();
  }

  void seedMockTasks() {
    _tasks = MockData.assignedTasks();
    _loading = false;
    notifyListeners();
  }

  AssignedTask? byId(String id) {
    try {
      return _tasks.firstWhere((t) => t.id == id);
    } catch (_) {
      return null;
    }
  }

  void startTimer(String taskId) {
    final task = byId(taskId);
    if (task == null || task.isComplete) return;
    _workTimer?.cancel();
    _activeTimerTaskId = taskId;
    if (task.status == 'PENDING') task.status = 'IN_PROGRESS';
    notifyListeners();
    _workTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      tickTimer(taskId);
      if (task.spentSeconds >= task.timerMinutes * 60) {
        stopTimer();
      }
    });
  }

  void stopTimer() {
    _workTimer?.cancel();
    _workTimer = null;
    _activeTimerTaskId = null;
    notifyListeners();
  }

  void toggleTimer(String taskId) {
    if (isTimerRunning(taskId)) {
      stopTimer();
    } else {
      startTimer(taskId);
    }
  }

  void tickTimer(String taskId) {
    final task = byId(taskId);
    if (task == null || task.isComplete) return;
    if (task.spentSeconds >= task.timerMinutes * 60) return;
    task.spentSeconds += 1;
    if (task.status == 'PENDING') task.status = 'IN_PROGRESS';
    notifyListeners();
  }

  void completeTask(String taskId) {
    final task = byId(taskId);
    if (task == null) return;
    if (_activeTimerTaskId == taskId) stopTimer();
    task.status = 'DONE';
    notifyListeners();
  }

  void sendChat({
    required String taskId,
    required String senderName,
    required String text,
  }) {
    final task = byId(taskId);
    if (task == null || text.trim().isEmpty) return;
    final now = DateTime.now();
    task.chat.add(
      TaskChatMessage(
        id: 'c-${now.millisecondsSinceEpoch}',
        senderName: senderName,
        senderRole: 'USER',
        text: text.trim(),
        sentAt:
            '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
      ),
    );
    notifyListeners();
  }

  @override
  void dispose() {
    _workTimer?.cancel();
    super.dispose();
  }
}
