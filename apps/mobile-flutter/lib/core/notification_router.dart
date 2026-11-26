import 'package:flutter/material.dart';

import '../views/attendance/attendance_screen.dart';
import '../views/certificates/certificates_screen.dart';
import '../views/course/course_detail_screen.dart';
import '../views/fees/fee_chat_screen.dart';
import '../views/fees/fees_screen.dart';
import '../views/help/admin_chat_screen.dart';
import '../views/leave/leave_screen.dart';
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
  static String? pendingCourseId;
  static String? pendingLeaveId;
  static String? pendingEvent;
  static bool launchedFromNotification = false;
  static bool openAdminChat = false;

  static String? _lastTipKey;
  static DateTime? _lastTipAt;

  /// Registered by [AppShell] so opens never wipe the navigation stack.
  static void Function(String type)? shellHandler;

  /// Prevent FCM + Socket double tip/sound for the same notification.
  static bool shouldShowTip(String key) {
    final now = DateTime.now();
    if (_lastTipKey == key &&
        _lastTipAt != null &&
        now.difference(_lastTipAt!) < const Duration(seconds: 3)) {
      return false;
    }
    _lastTipKey = key;
    _lastTipAt = now;
    return true;
  }

  static void setPending({
    required String? type,
    String? notificationId,
    String? taskId,
    String? feeCaseId,
    String? courseId,
    String? leaveId,
    String? event,
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
    if (courseId != null && courseId.isNotEmpty) {
      pendingCourseId = courseId;
    }
    if (leaveId != null && leaveId.isNotEmpty) {
      pendingLeaveId = leaveId;
    }
    if (event != null && event.isNotEmpty) {
      pendingEvent = event;
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
    pendingCourseId = null;
    pendingLeaveId = null;
    pendingEvent = null;
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

  static String? takePendingCourseId() {
    final id = pendingCourseId;
    pendingCourseId = null;
    return id;
  }

  static String? takePendingLeaveId() {
    final id = pendingLeaveId;
    pendingLeaveId = null;
    return id;
  }

  static bool get hasPendingDeepLink =>
      openAdminChat ||
      (pendingTaskId != null && pendingTaskId!.isNotEmpty) ||
      (pendingFeeCaseId != null && pendingFeeCaseId!.isNotEmpty) ||
      (pendingCourseId != null && pendingCourseId!.isNotEmpty) ||
      (pendingLeaveId != null && pendingLeaveId!.isNotEmpty) ||
      (pendingType != null && pendingType!.isNotEmpty);

  /// Shell tab for notification type.
  /// Student: 0 Dashboard · 1 Assignments · 2 Fees · 3 Courses · 4 Profile
  /// Staff/Intern: 0 Home · 1 Tasks · 2 Attend · 3 Help · 4 Profile
  static int tabForType(String? type, {String? event, bool isStudent = true}) {
    final upper = (type ?? '').toUpperCase();
    final ev = (event ?? pendingEvent ?? '').toLowerCase();
    if (ev == 'course_updated' || upper == 'COURSE') {
      return isStudent ? 3 : 0;
    }
    switch (upper) {
      case 'TASK':
        return 1;
      case 'ATTENDANCE':
        return isStudent ? 4 : 2;
      case 'FEE':
        return isStudent ? 2 : 3;
      case 'CHAT':
        return isStudent ? 4 : 3;
      case 'LEAVE':
        return 4;
      case 'QUIZ':
      case 'CERTIFICATE':
      case 'GENERAL':
      case 'SYSTEM':
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
      case 'LEAVE':
        return 'Leave';
      case 'CHAT':
        return 'Chat';
      case 'QUIZ':
        return 'Quiz';
      case 'CERTIFICATE':
        return 'Certificate';
      case 'SYSTEM':
        return 'System';
      case 'GENERAL':
      case 'COURSE':
        return 'Update';
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
    String? courseId,
    String? leaveId,
    String? event,
    required bool isStaff,
    bool isStudent = false,
    required void Function(int tab) goToTab,
  }) async {
    final upper = (type ?? '').toUpperCase();
    final ev = (event ?? pendingEvent ?? '').toLowerCase();
    final nav = Navigator.of(context, rootNavigator: true);
    final chat = takeOpenAdminChat() || upper == 'CHAT';
    final resolvedTask = taskId ?? takePendingTaskId();
    final resolvedFee = feeCaseId ?? takePendingFeeCaseId();
    final resolvedCourse = courseId ?? takePendingCourseId();
    final resolvedLeave = leaveId ?? takePendingLeaveId();
    final tab = tabForType(upper, event: ev, isStudent: isStudent && !isStaff);

    void setTabUnderCover() {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) goToTab(tab);
      });
    }

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
        nav.push(AppMotion.cover(const FeesScreen()));
        setTabUnderCover();
      }
      return;
    }

    if (upper == 'ATTENDANCE') {
      if (isStudent && !isStaff) {
        nav.push(AppMotion.cover(const AttendanceScreen()));
        setTabUnderCover();
      } else {
        goToTab(tab);
      }
      return;
    }

    if (upper == 'LEAVE') {
      nav.push(
        AppMotion.cover(LeaveScreen(focusLeaveId: resolvedLeave)),
      );
      setTabUnderCover();
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

    // Course updates (GENERAL + event) or explicit COURSE type.
    if (upper == 'COURSE' ||
        ev == 'course_updated' ||
        (resolvedCourse != null && resolvedCourse.isNotEmpty)) {
      if (resolvedCourse != null && resolvedCourse.isNotEmpty) {
        nav.push(AppMotion.cover(CourseDetailScreen(courseId: resolvedCourse)));
        setTabUnderCover();
      } else {
        goToTab(0);
      }
      return;
    }

    goToTab(tab);
  }
}
