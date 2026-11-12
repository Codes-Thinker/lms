import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/notification_router.dart';
import '../../core/responsive.dart';
import '../../providers/notification_provider.dart';
import '../../providers/ui_provider.dart';
import '../help/admin_chat_screen.dart';
import '../fees/fees_screen.dart';
import '../tasks/tasks_screen.dart';
import '../attendance/attendance_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().load();
    });
  }

  IconData _iconFor(String type) {
    switch (type.toUpperCase()) {
      case 'CHAT':
        return Icons.chat_bubble_outline_rounded;
      case 'FEE':
        return Icons.payments_outlined;
      case 'ATTENDANCE':
        return Icons.fingerprint_rounded;
      case 'TASK':
        return Icons.task_alt_rounded;
      default:
        return Icons.notifications_none_rounded;
    }
  }

  String _titleFor(AppNotificationItem n) {
    if (n.type.toUpperCase() == 'CHAT') return AppBrand.shortName;
    final t = n.title.trim();
    if (t.toLowerCase().contains('admin')) return AppBrand.shortName;
    return t.isEmpty ? 'Notification' : t;
  }

  Future<void> _open(AppNotificationItem n) async {
    await context.read<NotificationProvider>().markRead(n.id);
    if (!mounted) return;
    final type = n.type.toUpperCase();
    if (type == 'CHAT') {
      Navigator.of(context).push(
        AppMotion.fadeSlide(const AdminChatScreen()),
      );
      return;
    }
    if (type == 'FEE') {
      Navigator.of(context).push(AppMotion.fadeSlide(const FeesScreen()));
      return;
    }
    if (type == 'TASK') {
      Navigator.of(context).push(AppMotion.fadeSlide(const TasksScreen()));
      return;
    }
    if (type == 'ATTENDANCE') {
      Navigator.of(context).push(AppMotion.fadeSlide(const AttendanceScreen()));
      return;
    }
    context.read<UiProvider>().setNavIndex(NotificationRouter.tabForType(type));
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final notes = context.watch<NotificationProvider>();
    final pad = AppResponsive.pagePad(context);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Messages'),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        actions: [
          if (notes.unreadCount > 0)
            TextButton(
              onPressed: () =>
                  context.read<NotificationProvider>().markAllRead(),
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => context.read<NotificationProvider>().load(),
        child: notes.loading && notes.items.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : notes.items.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(height: MediaQuery.sizeOf(context).height * 0.25),
                      const Icon(
                        Icons.inbox_outlined,
                        size: 48,
                        color: AppColors.muted,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'No messages yet',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: AppColors.muted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: EdgeInsets.fromLTRB(
                      pad,
                      8,
                      pad,
                      AppResponsive.pageBottom(context),
                    ),
                    itemCount: notes.items.length,
                    separatorBuilder: (_, __) =>
                        const Divider(height: 1, color: AppColors.line),
                    itemBuilder: (context, index) {
                      final n = notes.items[index];
                      return InkWell(
                        onTap: () => _open(n),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: n.read
                                      ? AppColors.line
                                      : AppColors.softBlue,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  _iconFor(n.type),
                                  color: AppColors.blue,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            _titleFor(n),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontWeight: n.read
                                                  ? FontWeight.w600
                                                  : FontWeight.w800,
                                              fontSize: 14,
                                              color: AppColors.ink,
                                            ),
                                          ),
                                        ),
                                        if (!n.read)
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
                                    const SizedBox(height: 4),
                                    Text(
                                      n.body.isEmpty ? 'Open for details' : n.body,
                                      maxLines: 3,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: AppColors.muted,
                                        fontSize: 13,
                                        height: 1.35,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      _timeLabel(n.createdAt),
                                      style: const TextStyle(
                                        color: AppColors.muted,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  String _timeLabel(DateTime at) {
    final local = at.toLocal();
    final now = DateTime.now();
    final sameDay = local.year == now.year &&
        local.month == now.month &&
        local.day == now.day;
    final hm =
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
    if (sameDay) return hm;
    return '${local.day}/${local.month}/${local.year} · $hm';
  }
}
