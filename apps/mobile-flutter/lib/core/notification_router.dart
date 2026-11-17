import 'package:flutter/material.dart';

import '../views/certificates/certificates_screen.dart';
import '../views/fees/fee_chat_screen.dart';
import '../views/help/admin_chat_screen.dart';
import '../views/quizzes/quizzes_screen.dart';
import '../views/tasks/task_detail_screen.dart';
import '../views/teacher/assignment_chat_screen.dart';
import 'constants/app_motion.dart';

/// Pending deep-link from a notification tap (cold start / background / in-app).
class NotificationRouter {
  NotificationRouter._();

  static String? pendingType;
  static String? pendingNotificationId;
  static String? pendingTaskId;
  static String? pendingFeeCaseId;
  static bool launchedFromNotification = false;
  static bool openAdminChat = false;

  /// Registered by [AppShell] so opens never wipe the navigation stack.
  static void Function(String type)? shellHandler;

  static void setPending({
    required String? type,
    String? notificationId,
    String? taskId,
    String? feeCaseId,
    bool fromLaunch = false,
  }) {
    pendingType = type;
    pendingNotificationId = notificationId;
    if (taskId != null && taskId.isNotEmpty) {
      pendingTaskId = taskId;
    }
    if (feeCaseId != null && feeCaseId.isNotEmpty) {
      pendingFeeCaseId = feeCaseId;
    }
    if ((type ?? '').toUpperCase() == 'CHAT') {
      openAdminChat = true;
    }
    if (fromLaunch) launchedFromNotification = true;
  }

  static void clear() {
    pendingType = null;
    pendingNotificationId = null;
    pendingTaskId = null;
    pendingFeeCaseId = null;
    launchedFromNotification = false;
    // openAdminChat cleared via takeOpenAdminChat after consume
  }

  static bool takeOpenAdminChat() {
    final v = openAdminChat;
    openAdminChat = false;
    return v;
  }

  static String? takePendingTaskId() {
    final id = pendingTaskId;
    pendingTaskId = null;
    return id;
  }

  static String? takePendingFeeCaseId() {
    final id = pendingFeeCaseId;
    pendingFeeCaseId = null;
    return id;
  }

  static bool get hasPendingDeepLink =>
      openAdminChat ||
      (pendingTaskId != null && pendingTaskId!.isNotEmpty) ||
      (pendingFeeCaseId != null && pendingFeeCaseId!.isNotEmpty) ||
      (pendingType != null && pendingType!.isNotEmpty);

  /// Shell tab for notification type.
  /// 0 Home · 1 Tasks · 2 Attend · 3 Fees/Help · 4 Profile
  static int tabForType(String? type) {
    switch ((type ?? '').toUpperCase()) {
      case 'TASK':
        return 1;
      case 'ATTENDANCE':
        return 2;
      case 'FEE':
      case 'CHAT':
        return 3;
      case 'QUIZ':
      case 'CERTIFICATE':
        return 0;
      default:
        return 0;
    }
  }

  static String labelForType(String? type) {
    switch ((type ?? '').toUpperCase()) {
      case 'TASK':
        return 'Assignment';
      case 'FEE':
        return 'Fee';
      case 'ATTENDANCE':
        return 'Attendance';
      case 'CHAT':
        return 'Chat';
      case 'QUIZ':
        return 'Quiz';
      case 'CERTIFICATE':
        return 'Certificate';
      case 'SYSTEM':
        return 'System';
      default:
        return 'Alert';
    }
  }

  /// Open the right screen for a notification type without resetting the app.
  static Future<void> openDeepLink(
    BuildContext context, {
    required String? type,
    String? taskId,
    String? feeCaseId,
    required bool isStaff,
    required void Function(int tab) goToTab,
  }) async {
    final upper = (type ?? '').toUpperCase();
    final nav = Navigator.of(context, rootNavigator: true);
    final chat = takeOpenAdminChat() || upper == 'CHAT';
    final resolvedTask = taskId ?? takePendingTaskId();
    final resolvedFee = feeCaseId ?? takePendingFeeCaseId();
    final tab = tabForType(upper);

    void setTabUnderCover() {
      // After cover is on screen — user never sees Fees/Help flash.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) goToTab(tab);
      });
    }

    // Instant cover first (no delay / fade). Avoids 1s glitch.
    if (chat) {
      nav.push(AppMotion.cover(const AdminChatScreen()));
      setTabUnderCover();
      return;
    }

    if (upper == 'TASK') {
      if (resolvedTask != null && resolvedTask.isNotEmpty) {
        if (isStaff) {
          nav.push(AppMotion.cover(AssignmentChatScreen(taskId: resolvedTask)));
        } else {
          nav.push(AppMotion.cover(TaskDetailScreen(taskId: resolvedTask)));
        }
        setTabUnderCover();
      } else {
        goToTab(tab);
      }
      return;
    }

    if (upper == 'FEE') {
      if (resolvedFee != null && resolvedFee.isNotEmpty) {
        nav.push(AppMotion.cover(FeeChatScreen(caseId: resolvedFee)));
        setTabUnderCover();
      } else {
        goToTab(tab);
      }
      return;
    }

    if (upper == 'ATTENDANCE') {
      goToTab(tab);
      return;
    }

    if (upper == 'QUIZ') {
      nav.push(AppMotion.cover(const QuizzesScreen()));
      setTabUnderCover();
      return;
    }

    if (upper == 'CERTIFICATE') {
      nav.push(AppMotion.cover(const CertificatesScreen()));
      setTabUnderCover();
      return;
    }

    goToTab(tab);
  }
}
