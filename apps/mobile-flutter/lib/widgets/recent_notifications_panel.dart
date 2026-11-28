import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import '../core/notification_router.dart';
import '../providers/notification_provider.dart';
import '../views/notifications/notifications_screen.dart';

/// Compact inbox strip for Dashboard / Home.
class RecentNotificationsPanel extends StatelessWidget {
  const RecentNotificationsPanel({super.key});

  IconData _iconFor(AppNotificationItem n) {
    final type = n.type.toUpperCase();
    final event = n.event?.toLowerCase();
    if (type == 'CHAT' || event == 'chat') {
      return Icons.chat_bubble_outline_rounded;
    }
    if (event == 'course_updated' || type == 'COURSE') {
      return Icons.menu_book_outlined;
    }
    switch (type) {
      case 'FEE':
        return Icons.payments_outlined;
      case 'ATTENDANCE':
        return Icons.fingerprint_rounded;
      case 'TASK':
        return Icons.assignment_outlined;
      case 'LEAVE':
        return Icons.event_busy_outlined;
      case 'QUIZ':
        return Icons.quiz_outlined;
      case 'CERTIFICATE':
        return Icons.workspace_premium_outlined;
      case 'SYSTEM':
        return Icons.settings_outlined;
      default:
        return Icons.notifications_none_rounded;
    }
  }

  Future<void> _open(BuildContext context, AppNotificationItem n) async {
    await context.read<NotificationProvider>().markRead(n.id);
    if (!context.mounted) return;
    final data = n.data ?? const <String, dynamic>{};
    NotificationRouter.setPending(
      type: n.type,
      notificationId: n.id,
      taskId: data['taskId']?.toString(),
      feeCaseId:
          data['feeCaseId']?.toString() ?? data['caseId']?.toString(),
      courseId: data['courseId']?.toString(),
      leaveId: data['leaveId']?.toString(),
      event: data['event']?.toString(),
    );
    final handler = NotificationRouter.shellHandler;
    if (handler != null) {
      handler(n.type);
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    final notes = context.watch<NotificationProvider>();
    final recent = notes.recent;
    final unread = notes.unreadCount;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'NOTIFICATIONS',
                style: TextStyle(
                  color: AppColors.ink,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.6,
                ),
              ),
            ),
            if (unread > 0)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text(
                  '$unread new',
                  style: const TextStyle(
                    color: AppColors.blueDark,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  AppMotion.fadeSlide(const NotificationsScreen()),
                );
              },
              child: const Text(
                'See all',
                style: TextStyle(
                  color: AppColors.blueDark,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (recent.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.line),
            ),
            child: const Text(
              'No notifications yet',
              style: TextStyle(
                color: AppColors.muted,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          )
        else
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              children: [
                for (var i = 0; i < recent.take(5).length; i++) ...[
                  if (i > 0)
                    const Divider(height: 1, color: AppColors.line),
                  InkWell(
                    onTap: () => _open(context, recent[i]),
                    borderRadius: BorderRadius.vertical(
                      top: i == 0 ? const Radius.circular(14) : Radius.zero,
                      bottom: i == recent.take(5).length - 1
                          ? const Radius.circular(14)
                          : Radius.zero,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 12,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: recent[i].read
                                  ? AppColors.line
                                  : AppColors.softBlue,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              _iconFor(recent[i]),
                              size: 18,
                              color: AppColors.blue,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  recent[i].title.trim().isEmpty
                                      ? NotificationRouter.labelForType(
                                          recent[i].type,
                                        )
                                      : recent[i].title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: recent[i].read
                                        ? FontWeight.w600
                                        : FontWeight.w800,
                                    color: AppColors.ink,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  recent[i].body.trim().isEmpty
                                      ? 'Tap to open'
                                      : recent[i].body,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          if (!recent[i].read)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: AppColors.blue,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}
