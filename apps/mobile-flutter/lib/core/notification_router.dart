/// Pending deep-link from a notification tap (cold start / background).
class NotificationRouter {
  NotificationRouter._();

  static String? pendingType;
  static String? pendingNotificationId;
  static String? pendingTaskId;
  static bool launchedFromNotification = false;
  static bool openAdminChat = false;

  static void setPending({
    required String? type,
    String? notificationId,
    String? taskId,
    bool fromLaunch = false,
  }) {
    pendingType = type;
    pendingNotificationId = notificationId;
    if (taskId != null && taskId.isNotEmpty) {
      pendingTaskId = taskId;
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
    launchedFromNotification = false;
    // openAdminChat cleared after HelpHub consumes it
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

  /// Shell tab for notification type (same for all roles).
  /// 0 Home · 1 Tasks · 2 Attend · 3 Fees/Help · 4 Profile
  static int tabForType(String? type) {
    switch ((type ?? '').toUpperCase()) {
      case 'TASK':
        return 1;
      case 'ATTENDANCE':
        return 2;
      case 'FEE':
        return 3;
      case 'CHAT':
        // Staff/intern Help tab; students open Help from Profile.
        return 3;
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
      case 'SYSTEM':
        return 'System';
      default:
        return 'Alert';
    }
  }
}
