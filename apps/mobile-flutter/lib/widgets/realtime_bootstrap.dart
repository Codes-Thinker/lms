import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/support_provider.dart';
import '../providers/task_provider.dart';
import '../providers/teaching_provider.dart';
import '../providers/ui_provider.dart';
import '../services/api_client.dart';
import '../services/push_notification_service.dart';
import '../services/realtime_service.dart';

/// Keeps Socket.IO joined to the signed-in user for live notifications.
class RealtimeBootstrap extends StatefulWidget {
  final Widget child;
  final RealtimeOpenHandler onOpen;

  const RealtimeBootstrap({
    super.key,
    required this.child,
    required this.onOpen,
  });

  @override
  State<RealtimeBootstrap> createState() => _RealtimeBootstrapState();
}

class _RealtimeBootstrapState extends State<RealtimeBootstrap> {
  String? _boundUserId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.watch<AuthProvider>();
    final userId = auth.user?.id;

    final notes = context.read<NotificationProvider>();
    RealtimeService.instance.bind(
      ui: context.read<UiProvider>(),
      notes: notes,
      support: context.read<SupportProvider>(),
      tasks: context.read<TaskProvider>(),
      teaching: context.read<TeachingProvider>(),
      onOpen: widget.onOpen,
    );
    final tasks = context.read<TaskProvider>();
    final teaching = context.read<TeachingProvider>();
    PushNotificationService.instance.setOnForegroundRefresh(() {
      // Keep inbox + teacher/staff dashboards live while app is open.
      unawaited(notes.load());
      unawaited(tasks.load(silent: true));
      unawaited(teaching.load(silent: true));
    });

    if (userId == null || userId.isEmpty) {
      if (_boundUserId != null) {
        RealtimeService.instance.disconnect();
        _boundUserId = null;
      }
      return;
    }

    if (_boundUserId != userId) {
      _boundUserId = userId;
      RealtimeService.instance.connect(
        userId,
        accessToken: ApiClient.instance.token,
      );
    }
  }

  @override
  void dispose() {
    RealtimeService.instance.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
