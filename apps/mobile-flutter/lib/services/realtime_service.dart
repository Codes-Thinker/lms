import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../core/constants/api_config.dart';
import '../core/notification_router.dart';
import '../providers/course_provider.dart';
import '../providers/fee_provider.dart';
import '../providers/leave_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/support_provider.dart';
import '../providers/task_provider.dart';
import '../providers/teaching_provider.dart';
import '../providers/ui_provider.dart';
import 'api_client.dart';
import 'notify_tone.dart';

typedef RealtimeOpenHandler = void Function(String type, {String? taskId});

/// Socket.IO client for live `notification` events from the Nest API (`/realtime`).
class RealtimeService {
  RealtimeService._();
  static final RealtimeService instance = RealtimeService._();

  io.Socket? _socket;
  String? _userId;

  UiProvider? _ui;
  NotificationProvider? _notes;
  SupportProvider? _support;
  TaskProvider? _tasks;
  TeachingProvider? _teaching;
  CourseProvider? _courses;
  FeeProvider? _fees;
  LeaveProvider? _leave;
  RealtimeOpenHandler? _onOpen;

  void bind({
    required UiProvider ui,
    required NotificationProvider notes,
    required SupportProvider support,
    required TaskProvider tasks,
    required TeachingProvider teaching,
    required CourseProvider courses,
    FeeProvider? fees,
    LeaveProvider? leave,
    required RealtimeOpenHandler onOpen,
  }) {
    _ui = ui;
    _notes = notes;
    _support = support;
    _tasks = tasks;
    _teaching = teaching;
    _courses = courses;
    _fees = fees;
    _leave = leave;
    _onOpen = onOpen;
  }

  bool get isConnected => _socket?.connected == true;

  void connect(String userId, {String? accessToken}) {
    final id = userId.trim();
    if (id.isEmpty) return;
    final token = (accessToken ?? ApiClient.instance.token ?? '').trim();
    if (token.isEmpty) {
      debugPrint('Realtime skipped: missing access token');
      return;
    }
    if (_socket != null && _userId == id && _socket!.connected) return;

    disconnect();
    _userId = id;

    final origin = ApiConfig.baseUrl.replaceAll(RegExp(r'/$'), '');
    _socket = io.io(
      origin,
      io.OptionBuilder()
          .setPath('/realtime')
          .setTransports(['websocket', 'polling'])
          .setAuth({'token': token})
          .enableForceNew()
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(30)
          .setReconnectionDelay(1200)
          .build(),
    );

    _socket!
      ..onConnect((_) {
        debugPrint('Realtime connected');
        // Server ignores client userId and joins JWT sub; emit for compatibility.
        _socket?.emit('join', {'userId': id});
      })
      ..onDisconnect((_) => debugPrint('Realtime disconnected'))
      ..onConnectError((e) => debugPrint('Realtime connect error: $e'))
      ..on('notification', _handleNotification)
      ..on('course_updated', _handleCourseUpdated)
      ..on('chat:message', _handleChatMessage)
      ..on('chat:receipt', _handleChatReceipt)
      ..on('chat:typing', _handleChatTyping);
  }

  void _refreshCourses() {
    final courses = _courses;
    if (courses == null) return;
    unawaited(courses.fetchEnrolledCourses());
  }

  void _handleCourseUpdated(dynamic data) {
    _refreshCourses();
  }

  void _handleChatMessage(dynamic data) {
    if (data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final threadId = map['threadId']?.toString();
    final support = _support;
    if (support == null) return;
    if (threadId != null &&
        support.threadId != null &&
        threadId != support.threadId) {
      return;
    }
    final msg = map['message'];
    if (msg is Map) {
      support.upsertLiveMessage(Map<String, dynamic>.from(msg));
    } else {
      unawaited(support.loadAdminChat(silent: true));
    }
  }

  void _handleChatReceipt(dynamic data) {
    if (data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final status = (map['status'] ?? '').toString();
    _support?.applyReceipt(status);
  }

  void _handleChatTyping(dynamic data) {
    if (data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final isAdmin = map['isAdmin'] == true;
    if (!isAdmin) return;
    final typing = map['typing'] == true;
    _support?.setAdminTyping(typing);
  }

  void disconnect() {
    final s = _socket;
    _socket = null;
    _userId = null;
    if (s == null) return;
    try {
      s.dispose();
    } catch (e) {
      debugPrint('Realtime disconnect: $e');
    }
  }

  void _handleNotification(dynamic data) {
    if (data is! Map) return;
    final map = Map<String, dynamic>.from(data);
    final title = (map['title'] ?? 'Notification').toString();
    final body = (map['body'] ?? '').toString();
    final type = (map['type'] ?? 'GENERAL').toString().toUpperCase();
    final payload = map['data'];
    final dataMap = payload is Map
        ? Map<String, dynamic>.from(payload)
        : <String, dynamic>{};
    final taskId = dataMap['taskId']?.toString();
    final feeCaseId =
        dataMap['feeCaseId']?.toString() ?? dataMap['caseId']?.toString();

    final notes = _notes;
    if (notes != null) unawaited(notes.load());
    if (type == 'CHAT') {
      final support = _support;
      if (support != null) unawaited(support.loadAdminChat(silent: true));
    }
    if (type == 'TASK') {
      final tasks = _tasks;
      final teaching = _teaching;
      if (tasks != null) unawaited(tasks.load(silent: true));
      if (teaching != null) unawaited(teaching.load(silent: true));
    }
    if (type == 'FEE' || type == 'PAYMENT' || feeCaseId != null) {
      final fees = _fees;
      if (fees != null) unawaited(fees.load());
      unawaited(_courses?.fetchReportStats() ?? Future.value());
    }
    if (type == 'LEAVE') {
      final leave = _leave;
      if (leave != null) unawaited(leave.load(silent: true));
    }
    final event = (dataMap['event'] ?? '').toString().toLowerCase();
    if (event == 'course_updated') {
      _refreshCourses();
    }

    final text = body.trim().isEmpty ? title : body.trim();
    final displayTitle = type == 'CHAT'
        ? title
        : (title.trim().isEmpty
            ? NotificationRouter.labelForType(type)
            : title);
    unawaited(NotifyTone.instance.play());
    _ui?.showTip(
      text,
      title: displayTitle,
      duration: const Duration(seconds: 5),
      onTap: () {
        NotificationRouter.setPending(
          type: type,
          taskId: taskId,
          feeCaseId: feeCaseId,
          courseId: dataMap['courseId']?.toString(),
          event: dataMap['event']?.toString(),
          notificationId: map['id']?.toString(),
        );
        _onOpen?.call(type, taskId: taskId);
      },
    );
  }
}
