import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../widgets/app_loader.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/teaching_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/unread_count_badge.dart';
import '../attendance/attendance_screen.dart';
import '../help/help_hub_screen.dart';
import '../notifications/notifications_screen.dart';
import '../report/report_screen.dart';
import '../tasks/task_detail_screen.dart';
import '../tasks/tasks_screen.dart';
import 'teacher_class_screen.dart';

/// Teacher / Staff home — flat, sharp dashboard (no blur / heavy gradients).
class TeacherHomeScreen extends StatefulWidget {
  const TeacherHomeScreen({super.key});

  @override
  State<TeacherHomeScreen> createState() => _TeacherHomeScreenState();
}

class _TeacherHomeScreenState extends State<TeacherHomeScreen> {
  static const _bg = Color(0xFFF8FAFC);
  static const _navy = Color(0xFF0F172A);
  static const _slate = Color(0xFF475569);
  static const _royal = Color(0xFF2563EB);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_hydrate(silent: false));
    });
  }

  /// Teacher home sources only (no student fees / catalog metrics).
  Future<void> _hydrate({bool silent = true}) async {
    if (!mounted) return;
    final courses = context.read<CourseProvider>();
    final teaching = context.read<TeachingProvider>();
    final tasks = context.read<TaskProvider>();
    final attendance = context.read<AttendanceProvider>();
    final notes = context.read<NotificationProvider>();
    await Future.wait([
      courses.fetchAll(), // search → All Courses
      teaching.load(silent: silent),
      tasks.load(silent: silent),
      attendance.loadMine(),
      notes.load(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final teaching = context.watch<TeachingProvider>();
    final tasks = context.watch<TaskProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final notes = context.watch<NotificationProvider>();
    final pad = AppResponsive.pagePad(context);
    final bottom = AppResponsive.shellBottom(context);

    // Teacher home uses teaching roster only — never student catalog/enrollment.
    final myBatches = teaching.courses;
    final classCount = myBatches.length;
    final staffId = auth.user?.id ?? '';
    final myTasks = tasks.tasksForUser(staffId);
    final openTasks = myTasks.where((t) => t.status != 'DONE').length;
    final checkedIn = attendance.today.where((m) => m.isCheckedIn).length;
    final name = auth.user?.name.trim().isNotEmpty == true
        ? auth.user!.name.trim()
        : 'Teacher';
    final role = auth.user?.roleLabel ?? 'Staff';
    final track = auth.trackLabel;
    final mentorBadge = track.trim().isNotEmpty && track != 'Unassigned track'
        ? track
        : role;
    final unread = notes.unreadCount;
    final taskUnread = notes.unreadForTypes(const ['TASK']);
    final attendanceUnread = notes.unreadForTypes(const ['ATTENDANCE']);
    final chatUnread = notes.unreadForTypes(const ['CHAT']);
    final gap = AppResponsive.isCompact(context) ? 6.0 : 8.0;
    final titleSize = AppResponsive.isCompact(context) ? 11.0 : 12.0;
    final countSize = AppResponsive.isCompact(context) ? 15.0 : 17.0;

    if (teaching.loading && myBatches.isEmpty) {
      return const Scaffold(
        backgroundColor: _bg,
        body: Center(child: AppLoader()),
      );
    }

    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: _royal,
          onRefresh: () => _hydrate(silent: true),
          child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          slivers: [
            // Brand header
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 10, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    const BrandMark(size: 34),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        AppBrand.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: _navy,
                          letterSpacing: -0.2,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Notifications',
                      onPressed: () =>
                          _push(context, const NotificationsScreen()),
                      icon: Badge(
                        isLabelVisible: unread > 0,
                        label: Text(
                          unread > 9 ? '9+' : '$unread',
                          style: const TextStyle(fontSize: 10),
                        ),
                        backgroundColor: AppColors.danger,
                        child: const Icon(
                          Icons.notifications_none_rounded,
                          color: _navy,
                          size: 24,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Name left · Flutter tab right · tagline below
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 14, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize:
                                  AppResponsive.isCompact(context) ? 20 : 24,
                              fontWeight: FontWeight.w800,
                              color: _navy,
                              letterSpacing: -0.4,
                              height: 1.15,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.blueDark,
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            mentorBadge.toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.35,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // 3 × 2 metric cards — title + count, no icons
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 14, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _metricCard(
                            title: 'Classes',
                            count: '$classCount',
                            tint: AppColors.softBlue,
                            accent: AppColors.blueDark,
                            titleSize: titleSize,
                            countSize: countSize,
                          ),
                        ),
                        SizedBox(width: gap),
                        Expanded(
                          child: _metricCard(
                            title: 'Students',
                            count: '${teaching.totalStudents}',
                            tint: const Color(0xFFE8F8EF),
                            accent: const Color(0xFF059669),
                            titleSize: titleSize,
                            countSize: countSize,
                          ),
                        ),
                        SizedBox(width: gap),
                        Expanded(
                          child: _metricCard(
                            title: 'Tasks',
                            count: '${teaching.assigned.length}',
                            tint: const Color(0xFFF3E8FF),
                            accent: const Color(0xFF7C3AED),
                            titleSize: titleSize,
                            countSize: countSize,
                            badge: taskUnread,
                            onTap: () =>
                                context.read<UiProvider>().setNavIndex(1),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: gap),
                    Row(
                      children: [
                        Expanded(
                          child: _metricCard(
                            title: 'Batches',
                            count: '${myBatches.length}',
                            tint: const Color(0xFFFFF4EC),
                            accent: const Color(0xFFEA580C),
                            titleSize: titleSize,
                            countSize: countSize,
                          ),
                        ),
                        SizedBox(width: gap),
                        Expanded(
                          child: _metricCard(
                            title: 'Open tasks',
                            count: '$openTasks',
                            tint: const Color(0xFFE6F7F5),
                            accent: const Color(0xFF0D9488),
                            titleSize: titleSize,
                            countSize: countSize,
                            badge: taskUnread,
                            onTap: () =>
                                context.read<UiProvider>().setNavIndex(1),
                          ),
                        ),
                        SizedBox(width: gap),
                        Expanded(
                          child: _metricCard(
                            title: 'In office',
                            count: '$checkedIn',
                            tint: const Color(0xFFFFEEF0),
                            accent: const Color(0xFFDC2626),
                            titleSize: titleSize,
                            countSize: countSize,
                            badge: attendanceUnread,
                            onTap: () =>
                                context.read<UiProvider>().setNavIndex(2),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Quick actions — ink chips (previous style)
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 20, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'QUICK ACTIONS',
                      style: TextStyle(
                        color: _slate,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.7,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _actionChip(
                          'My Students',
                          icon: Icons.groups_rounded,
                          filled: true,
                          onTap: () =>
                              _push(context, const TeacherClassScreen()),
                        ),
                        _actionChip(
                          'Attendance',
                          icon: Icons.fingerprint_rounded,
                          badge: attendanceUnread,
                          onTap: () {
                            unawaited(
                              context
                                  .read<NotificationProvider>()
                                  .markTypesRead(const ['ATTENDANCE']),
                            );
                            _push(context, const AttendanceScreen());
                          },
                        ),
                        _actionChip(
                          'My tasks',
                          icon: Icons.task_alt_rounded,
                          badge: taskUnread,
                          onTap: () {
                            unawaited(
                              context
                                  .read<NotificationProvider>()
                                  .markTypesRead(const ['TASK']),
                            );
                            _push(context, const TasksScreen());
                          },
                        ),
                        _actionChip(
                          'Batch report',
                          icon: Icons.bar_chart_rounded,
                          onTap: () => _push(context, const ReportScreen()),
                        ),
                        _actionChip(
                          'Help',
                          icon: Icons.help_outline_rounded,
                          badge: chatUnread,
                          onTap: () {
                            unawaited(
                              context
                                  .read<NotificationProvider>()
                                  .markTypesRead(const ['CHAT']),
                            );
                            _push(context, const HelpHubScreen());
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // 1) My batches — instructor roster only
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 22, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: _Section('MY BATCHES')),
                        Text(
                          '${myBatches.length}',
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (myBatches.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Text(
                          'No batches yet. Admin must set you as course instructor.',
                          style: TextStyle(
                            color: _slate,
                            fontSize: 13,
                            height: 1.35,
                          ),
                        ),
                      )
                    else
                      ...List.generate(myBatches.take(5).length, (i) {
                        final c = myBatches[i];
                        final batchLabel = (c.batch ?? '').trim().isEmpty
                            ? c.category
                            : c.batch!;
                        return Padding(
                          padding: EdgeInsets.only(
                            bottom: i == myBatches.take(5).length - 1 ? 0 : 8,
                          ),
                          child: _batchCard(
                            title: c.title,
                            subtitle:
                                '$batchLabel · ${c.enrolledCount} students',
                            onOpen: () {
                              teaching.selectCourse(c.id);
                              _push(context, const TeacherClassScreen());
                            },
                          ),
                        );
                      }),
                  ],
                ),
              ),
            ),

            // 2) My tasks — staff tasks assigned to this teacher
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 22, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: _Section('MY TASKS')),
                        GestureDetector(
                          onTap: () => _push(context, const TasksScreen()),
                          child: const Text(
                            'See all',
                            style: TextStyle(
                              color: AppColors.blueDark,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (myTasks.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text(
                          'No staff tasks yet',
                          style:
                              TextStyle(color: AppColors.muted, fontSize: 13),
                        ),
                      )
                    else
                      ...List.generate(myTasks.take(3).length, (i) {
                        final t = myTasks[i];
                        return Column(
                          children: [
                            _listRow(
                              icon: t.status == 'DONE'
                                  ? CupertinoIcons.checkmark_circle_fill
                                  : CupertinoIcons.circle,
                              title: t.title,
                              subtitle:
                                  '${t.status} · ${(t.spentSeconds / 60).floor()}m · ${t.courseTitle}',
                              onTap: () => _push(
                                context,
                                TaskDetailScreen(taskId: t.id),
                              ),
                            ),
                            if (i < myTasks.take(3).length - 1) const _Line(),
                          ],
                        );
                      }),
                  ],
                ),
              ),
            ),

            // 3) My students — from teaching roster
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 22, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: _Section('MY STUDENTS')),
                        GestureDetector(
                          onTap: () =>
                              _push(context, const TeacherClassScreen()),
                          child: const Text(
                            'Manage',
                            style: TextStyle(
                              color: AppColors.blueDark,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (myBatches.isEmpty || teaching.totalStudents == 0)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text(
                          'No students yet. Admin must set you as course instructor.',
                          style: TextStyle(
                            color: AppColors.muted,
                            fontSize: 13,
                            height: 1.35,
                          ),
                        ),
                      )
                    else
                      ...() {
                        final flat = myBatches
                            .expand(
                              (c) => c.students.map(
                                (s) => (
                                  s,
                                  c.title,
                                  (c.batch ?? '').trim().isEmpty
                                      ? c.category
                                      : c.batch!,
                                ),
                              ),
                            )
                            .take(6)
                            .toList();
                        return List.generate(flat.length, (i) {
                          final row = flat[i];
                          final s = row.$1;
                          return Column(
                            children: [
                              _listRow(
                                icon: CupertinoIcons.person_fill,
                                title: s.name,
                                subtitle:
                                    '${s.accountType} · ${row.$3} · ${row.$2}',
                                onTap: () => _push(
                                  context,
                                  const TeacherClassScreen(),
                                ),
                              ),
                              if (i < flat.length - 1) const _Line(),
                            ],
                          );
                        });
                      }(),
                  ],
                ),
              ),
            ),

            // 4) Office today
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 22, pad, bottom + 8),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: _Section('TODAY · OFFICE')),
                        GestureDetector(
                          onTap: () =>
                              _push(context, const AttendanceScreen()),
                          child: const Text(
                            'Open',
                            style: TextStyle(
                              color: AppColors.blueDark,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (attendance.today.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text(
                          'No office check-ins yet.',
                          style: TextStyle(color: AppColors.muted, fontSize: 13),
                        ),
                      )
                    else
                      ...List.generate(attendance.today.take(5).length, (i) {
                        final m = attendance.today[i];
                        return Column(
                          children: [
                            _listRow(
                              icon: CupertinoIcons.building_2_fill,
                              title: m.personName,
                              subtitle:
                                  '${m.role} · ${m.status}${m.checkOutAt == null ? ' · in' : ' · out'}',
                              onTap: () =>
                                  _push(context, const AttendanceScreen()),
                            ),
                            if (i < attendance.today.take(5).length - 1)
                              const _Line(),
                          ],
                        );
                      }),
                  ],
                ),
              ),
            ),
          ],
        ),
        ),
      ),
    );
  }

  void _push(BuildContext context, Widget page) {
    HapticFeedback.selectionClick();
    Navigator.of(context).push(AppMotion.fadeSlide(page));
  }

  Widget _metricCard({
    required String title,
    required String count,
    required Color tint,
    required Color accent,
    required double titleSize,
    required double countSize,
    int badge = 0,
    VoidCallback? onTap,
  }) {
    final card = Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(10, 12, 10, 12),
      decoration: BoxDecoration(
        color: tint,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: accent.withValues(alpha: 0.88),
                    fontSize: titleSize,
                    fontWeight: FontWeight.w600,
                    height: 1.2,
                  ),
                ),
              ),
              UnreadCountBadge(count: badge, compact: true),
            ],
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              count,
              maxLines: 1,
              style: TextStyle(
                color: accent,
                fontSize: countSize,
                fontWeight: FontWeight.w800,
                height: 1.1,
                letterSpacing: -0.3,
              ),
            ),
          ),
        ],
      ),
    );
    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: card,
      ),
    );
  }

  Widget _actionChip(
    String label, {
    required IconData icon,
    required VoidCallback onTap,
    bool filled = false,
    int badge = 0,
  }) {
    return Material(
      color: filled ? AppColors.blueDark : Colors.white,
      borderRadius: BorderRadius.circular(100),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(100),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(100),
            border: Border.all(
              color: filled
                  ? AppColors.blueDark
                  : AppColors.blueDark.withValues(alpha: 0.45),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 14,
                color: filled ? Colors.white : AppColors.blueDark,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                  color: filled ? Colors.white : AppColors.blueDark,
                ),
              ),
              if (badge > 0) ...[
                const SizedBox(width: 6),
                UnreadCountBadge(count: badge, compact: true),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _batchCard({
    required String title,
    required String subtitle,
    required VoidCallback onOpen,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.line),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF4FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.school_rounded,
                  size: 20,
                  color: _royal,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14.5,
                        color: _navy,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _slate,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: _royal,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: const Text(
                  'Open',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    height: 1,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _listRow({
    required IconData icon,
    required String title,
    required String subtitle,
    String? trailing,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.softBlue,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.blueDark, size: 17),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF475569),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (trailing != null)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  trailing,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              )
            else
              const Icon(
                CupertinoIcons.chevron_forward,
                color: Color(0xFF94A3B8),
                size: 16,
              ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String text;
  const _Section(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: Color(0xFF475569),
        fontSize: 12,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.7,
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line();

  @override
  Widget build(BuildContext context) {
    return const Divider(height: 1, thickness: 0.5, color: AppColors.line);
  }
}
