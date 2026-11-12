import 'dart:async';

import 'package:flutter/foundation.dart';
import '../models/task.dart';
import '../services/api_client.dart';
import '../services/local_cache.dart';

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

    final cached = await LocalCache.getList(LocalCache.tasks);
    if (cached.isNotEmpty) {
      _tasks = cached
          .whereType<Map>()
          .map((e) => _fromApi(Map<String, dynamic>.from(e)))
          .toList();
      _loading = false;
      notifyListeners();
    }

    try {
      final data = await ApiClient.instance.get('/tasks/me');
      if (data is List) {
        _tasks = data.map((e) => _fromApi(e as Map<String, dynamic>)).toList();
        await LocalCache.setJson(LocalCache.tasks, data);
      } else if (cached.isEmpty) {
        _tasks = [];
      }
    } catch (e) {
      debugPrint('Tasks fetch failed: $e');
      if (cached.isEmpty) _tasks = [];
    }
    _loading = false;
    notifyListeners();
  }

  void clearMemory() {
    stopTimer();
    _tasks = [];
    notifyListeners();
  }

  AssignedTask _fromApi(Map<String, dynamic> json) {
    final statusRaw = json['status'] as String? ?? 'ASSIGNED';
    final status = statusRaw == 'ASSIGNED' ? 'PENDING' : statusRaw;
    final chat = ((json['chat'] as List?) ?? const []).map((m) {
      final msg = m as Map<String, dynamic>;
      return TaskChatMessage(
        id: msg['id'] as String? ?? '',
        senderName: msg['senderName'] as String? ?? '',
        senderRole: msg['senderRole'] as String? ?? 'USER',
        text: msg['text'] as String? ?? '',
        sentAt: msg['sentAt'] as String? ?? '',
      );
    }).toList();
    return AssignedTask(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      studyNotes: json['studyNotes'] as String? ?? '',
      courseTitle: 'Staff Ops',
      assignedToId: json['assignedToId'] as String? ?? '',
      assignedToName: json['assignedToName'] as String? ?? '',
      assignedBy: json['assignedBy'] as String? ?? '',
      status: status,
      dueAt: DateTime.tryParse(json['dueAt'] as String? ?? '') ?? DateTime.now(),
      timerMinutes: (json['timerMinutes'] as num?)?.toInt() ?? 0,
      spentSeconds: ((json['spentMinutes'] as num?)?.toInt() ?? 0) * 60,
      updatedAt: json['updatedAt'] as String? ?? '',
      chat: chat,
    );
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

  Future<void> completeTask(String taskId) async {
    final task = byId(taskId);
    if (task == null) return;
    if (_activeTimerTaskId == taskId) stopTimer();
    task.status = 'DONE';
    notifyListeners();
    try {
      await ApiClient.instance.patch('/tasks/$taskId', body: {
        'status': 'DONE',
        'spentMinutes': task.spentSeconds ~/ 60,
      });
    } catch (_) {}
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
