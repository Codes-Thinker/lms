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
  int _ticksSinceSync = 0;

  List<AssignedTask> get tasks => List.unmodifiable(_tasks);
  bool get loading => _loading;
  String? get activeTimerTaskId => _activeTimerTaskId;

  bool isTimerRunning(String taskId) => _activeTimerTaskId == taskId;

  List<AssignedTask> tasksForUser(String userId) =>
      _tasks.where((t) => t.assignedToId == userId).toList();

  int openCountFor(String userId) =>
      tasksForUser(userId).where((t) => t.status != 'DONE').length;

  Future<void> load({bool silent = false}) async {
    if (!silent) {
      _loading = true;
      notifyListeners();
    }

    final cached = await LocalCache.getList(LocalCache.tasks);
    if (!silent && cached.isNotEmpty && _tasks.isEmpty) {
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
        final incoming = data
            .map((e) => _fromApi(e as Map<String, dynamic>))
            .toList();
        _tasks = _mergeKeepingActiveTimer(incoming);
        await LocalCache.setJson(LocalCache.tasks, data);
      } else if (cached.isEmpty && _tasks.isEmpty) {
        _tasks = [];
      }
    } catch (e) {
      debugPrint('Tasks fetch failed: $e');
      if (cached.isEmpty && _tasks.isEmpty) _tasks = [];
    }
    if (!silent) _loading = false;
    notifyListeners();
  }

  /// Keep running timer + any chat the last poll has not returned yet.
  List<AssignedTask> _mergeKeepingActiveTimer(List<AssignedTask> incoming) {
    final prevById = {for (final t in _tasks) t.id: t};
    final activeId = _activeTimerTaskId;
    return incoming.map((remote) {
      final local = prevById[remote.id];
      if (local == null) return remote;
      final keepTimer = activeId == remote.id;
      final spent = keepTimer && local.spentSeconds > remote.spentSeconds
          ? local.spentSeconds
          : (local.spentSeconds > remote.spentSeconds
              ? local.spentSeconds
              : remote.spentSeconds);
      final status = keepTimer && local.status == 'IN_PROGRESS'
          ? local.status
          : remote.status;
      return AssignedTask(
        id: remote.id,
        title: remote.title,
        description: remote.description,
        studyNotes: remote.studyNotes,
        courseTitle: remote.courseTitle,
        assignedToId: remote.assignedToId,
        assignedToName: remote.assignedToName,
        assignedBy: remote.assignedBy,
        status: status,
        dueAt: remote.dueAt,
        timerMinutes: remote.timerMinutes,
        spentSeconds: spent,
        updatedAt: remote.updatedAt,
        chat: _mergeChat(local.chat, remote.chat),
      );
    }).toList();
  }

  List<TaskChatMessage> _mergeChat(
    List<TaskChatMessage> local,
    List<TaskChatMessage> remote,
  ) {
    final seen = <String>{};
    final out = <TaskChatMessage>[];
    for (final m in remote) {
      if (seen.add(m.id)) out.add(m);
    }
    for (final m in local) {
      if (m.id.startsWith('local-') &&
          remote.any(
            (r) => r.text == m.text && r.senderRole == m.senderRole,
          )) {
        continue;
      }
      if (seen.add(m.id)) out.add(m);
    }
    return out;
  }

  void clearMemory() {
    stopTimer(persist: false);
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
        sentAt: _formatSentAt(msg['sentAt'] as String? ?? ''),
      );
    }).toList();
    return AssignedTask(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      studyNotes: json['studyNotes'] as String? ?? '',
      courseTitle: (json['courseTitle'] as String?)?.trim().isNotEmpty == true
          ? json['courseTitle'] as String
          : 'Course',
      assignedToId: json['assignedToId'] as String? ?? '',
      assignedToName: json['assignedToName'] as String? ?? '',
      assignedBy: json['assignedBy'] as String? ?? '',
      status: status,
      dueAt: DateTime.tryParse(json['dueAt'] as String? ?? '') ??
          DateTime.now().add(const Duration(days: 1)),
      timerMinutes: (json['timerMinutes'] as num?)?.toInt() ?? 0,
      spentSeconds: ((json['spentMinutes'] as num?)?.toInt() ?? 0) * 60,
      updatedAt: json['updatedAt'] as String? ?? '',
      chat: chat,
    );
  }

  String _formatSentAt(String raw) {
    final dt = DateTime.tryParse(raw)?.toLocal();
    if (dt != null) {
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    }
    if (raw.contains(':') && raw.length <= 5) return raw;
    return raw;
  }

  AssignedTask? byId(String id) {
    try {
      return _tasks.firstWhere((t) => t.id == id);
    } catch (_) {
      return null;
    }
  }

  Future<void> startTimer(String taskId) async {
    final task = byId(taskId);
    if (task == null || task.isComplete) return;

    // Cap only when teacher set a positive timer goal.
    if (task.timerMinutes > 0 &&
        task.spentSeconds >= task.timerMinutes * 60) {
      return;
    }

    _workTimer?.cancel();
    _activeTimerTaskId = taskId;
    _ticksSinceSync = 0;
    if (task.status == 'PENDING' || task.status == 'ASSIGNED') {
      task.status = 'IN_PROGRESS';
      unawaited(_persistProgress(taskId, status: 'IN_PROGRESS'));
    }
    notifyListeners();

    _workTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      tickTimer(taskId);
    });
  }

  void stopTimer({bool persist = true}) {
    final id = _activeTimerTaskId;
    _workTimer?.cancel();
    _workTimer = null;
    _activeTimerTaskId = null;
    _ticksSinceSync = 0;
    notifyListeners();
    if (persist && id != null) {
      unawaited(_persistProgress(id));
    }
  }

  Future<void> toggleTimer(String taskId) async {
    if (isTimerRunning(taskId)) {
      stopTimer(persist: true);
    } else {
      await startTimer(taskId);
    }
  }

  void tickTimer(String taskId) {
    final task = byId(taskId);
    if (task == null || task.isComplete) {
      stopTimer(persist: true);
      return;
    }

    final limit = task.timerMinutes > 0 ? task.timerMinutes * 60 : null;
    if (limit != null && task.spentSeconds >= limit) {
      stopTimer(persist: true);
      return;
    }

    task.spentSeconds += 1;
    if (task.status == 'PENDING' || task.status == 'ASSIGNED') {
      task.status = 'IN_PROGRESS';
    }
    _ticksSinceSync += 1;
    notifyListeners();

    if (limit != null && task.spentSeconds >= limit) {
      stopTimer(persist: true);
      return;
    }

    // Sync elapsed minutes to backend every 15s while running.
    if (_ticksSinceSync >= 15) {
      _ticksSinceSync = 0;
      unawaited(_persistProgress(taskId, status: 'IN_PROGRESS'));
    }
  }

  Future<void> _persistProgress(String taskId, {String? status}) async {
    final task = byId(taskId);
    if (task == null) return;
    final minutes = (task.spentSeconds / 60).ceil();
    try {
      await ApiClient.instance.patch('/tasks/$taskId', body: {
        if (status != null) 'status': status,
        'spentMinutes': minutes < 0 ? 0 : minutes,
      });
    } catch (e) {
      debugPrint('Timer persist failed: $e');
    }
  }

  Future<void> completeTask(String taskId) async {
    final task = byId(taskId);
    if (task == null) return;
    if (_activeTimerTaskId == taskId) stopTimer(persist: false);
    task.status = 'DONE';
    notifyListeners();
    try {
      await ApiClient.instance.patch('/tasks/$taskId', body: {
        'status': 'DONE',
        'spentMinutes': (task.spentSeconds / 60).ceil(),
      });
    } catch (_) {}
  }

  /// Posts to the assigning teacher (and shows in admin Teachers dashboard).
  Future<void> sendChat({
    required String taskId,
    required String senderName,
    required String text,
  }) async {
    final task = byId(taskId);
    final trimmed = text.trim();
    if (task == null || trimmed.isEmpty) return;

    final now = DateTime.now();
    final optimistic = TaskChatMessage(
      id: 'local-${now.millisecondsSinceEpoch}',
      senderName: senderName,
      senderRole: 'USER',
      text: trimmed,
      sentAt:
          '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
    );
    task.chat.add(optimistic);
    notifyListeners();

    try {
      final data = await ApiClient.instance.post(
        '/tasks/$taskId/messages',
        body: {'text': trimmed},
      );
      if (data is Map<String, dynamic>) {
        final idx = task.chat.indexWhere((m) => m.id == optimistic.id);
        if (idx >= 0) {
          task.chat[idx] = TaskChatMessage(
            id: data['id'] as String? ?? optimistic.id,
            senderName: data['senderName'] as String? ?? senderName,
            senderRole: data['senderRole'] as String? ?? 'USER',
            text: data['text'] as String? ?? trimmed,
            sentAt: _formatSentAt(data['sentAt'] as String? ?? optimistic.sentAt),
          );
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('Task chat send failed: $e');
      task.chat.removeWhere((m) => m.id == optimistic.id);
      notifyListeners();
      rethrow;
    }
  }

  @override
  void dispose() {
    _workTimer?.cancel();
    super.dispose();
  }
}
