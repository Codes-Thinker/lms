import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/fee_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/teaching_provider.dart';
import '../../widgets/brand_logo.dart';
import '../attendance/attendance_screen.dart';
import '../course/all_courses_screen.dart';
import '../course/course_detail_screen.dart';
import '../help/help_hub_screen.dart';
import '../notifications/notifications_screen.dart';
import '../report/report_screen.dart';
import '../tasks/task_detail_screen.dart';
import '../tasks/tasks_screen.dart';
import 'teacher_class_screen.dart';

/// Teacher / Staff home — same AppColors language as student home.
class TeacherHomeScreen extends StatefulWidget {
  const TeacherHomeScreen({super.key});

  @override
  State<TeacherHomeScreen> createState() => _TeacherHomeScreenState();
}

class _TeacherHomeScreenState extends State<TeacherHomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TeachingProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final courses = context.watch<CourseProvider>();
    final teaching = context.watch<TeachingProvider>();
    final tasks = context.watch<TaskProvider>();
    final fees = context.watch<FeeProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final notes = context.watch<NotificationProvider>();
    final pad = AppResponsive.pagePad(context);
    final bottom = AppResponsive.shellBottom(context);

    final taughtIds = teaching.courses.map((c) => c.id).toSet();
    final batches = taughtIds.isEmpty
        ? courses.courses
        : courses.courses.where((c) => taughtIds.contains(c.id)).toList();
    final classCount =
        teaching.courses.isNotEmpty ? teaching.courses.length : batches.length;
    final staffId = auth.user?.id ?? '';
    final myTasks = tasks.tasksForUser(staffId);
    final openTasks = myTasks.where((t) => t.status != 'DONE').toList();
    final feePending = fees.pendingAmount;
    final checkedIn = attendance.today.where((m) => m.isCheckedIn).length;
    final name = auth.user?.name.trim().isNotEmpty == true
        ? auth.user!.name.trim()
        : 'Teacher';
    final role = auth.user?.roleLabel ?? 'Staff';
    final track = auth.trackLabel;
    final avatar = auth.avatarImage;
    final unread = notes.unreadCount;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Top bar — matches student home
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 10, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    const BrandMark(size: 36),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        AppBrand.shortName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.ink,
                          letterSpacing: -0.2,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Search courses',
                      onPressed: () =>
                          _push(context, const AllCoursesScreen()),
                      icon: const Icon(
                        CupertinoIcons.search,
                        color: AppColors.ink,
                        size: 22,
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
                          color: AppColors.ink,
                          size: 24,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Identity
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 16, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              color: AppColors.ink,
                              letterSpacing: -0.5,
                              height: 1.1,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.blue,
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              role.toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            track,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: AppColors.softBlue,
                      backgroundImage: avatar,
                      child: avatar == null
                          ? Text(
                              _initials(name),
                              style: const TextStyle(
                                color: AppColors.blueDark,
                                fontWeight: FontWeight.w800,
                                fontSize: 18,
                              ),
                            )
                          : null,
                    ),
                  ],
                ),
              ),
            ),

            // Stats — AppColors only (no rainbow)
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 18, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _stat(
                            icon: CupertinoIcons.folder_fill,
                            label: 'Classes',
                            value: '$classCount',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _stat(
                            icon: CupertinoIcons.person_2_fill,
                            label: 'Students',
                            value: '${teaching.totalStudents}',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _stat(
                            icon: CupertinoIcons.doc_text_fill,
                            label: 'Open tasks',
                            value: '${openTasks.length}',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _stat(
                            icon: CupertinoIcons.square_grid_2x2_fill,
                            label: 'Batches',
                            value: '${batches.length}',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _stat(
                            icon: CupertinoIcons.creditcard_fill,
                            label: 'Fee due',
                            value: 'Rs $feePending',
                            danger: feePending > 0,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _stat(
                            icon: CupertinoIcons.building_2_fill,
                            label: 'In office',
                            value: '$checkedIn',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Quick actions — one of each, flat chips
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 22, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Section('QUICK ACTIONS'),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _actionChip(
                          'My students',
                          filled: true,
                          onTap: () =>
                              _push(context, const TeacherClassScreen()),
                        ),
                        _actionChip(
                          'Attendance',
                          onTap: () =>
                              _push(context, const AttendanceScreen()),
                        ),
                        _actionChip(
                          'My tasks',
                          onTap: () => _push(context, const TasksScreen()),
                        ),
                        _actionChip(
                          'Batch report',
                          onTap: () => _push(context, const ReportScreen()),
                        ),
                        _actionChip(
                          'Help',
                          onTap: () => _push(context, const HelpHubScreen()),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // My batches
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 24, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: _Section('MY BATCHES')),
                        Text(
                          '${batches.length}',
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (batches.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text(
                          'No batches yet. Admin assigns you as instructor.',
                          style: TextStyle(
                            color: AppColors.muted,
                            fontSize: 13,
                            height: 1.35,
                          ),
                        ),
                      )
                    else
                      ...List.generate(batches.take(5).length, (i) {
                        final c = batches[i];
                        final due =
                            (c.totalFee - c.paidAmount).clamp(0, c.totalFee);
                        return Column(
                          children: [
                            InkWell(
                              onTap: () {
                                courses.selectCourse(c);
                                _push(
                                  context,
                                  CourseDetailScreen(courseId: c.id),
                                );
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Padding(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      alignment: Alignment.center,
                                      decoration: BoxDecoration(
                                        color: AppColors.softBlue,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Icon(
                                        CupertinoIcons.book_fill,
                                        color: AppColors.blueDark,
                                        size: 18,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            c.title,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w700,
                                              fontSize: 15,
                                              color: AppColors.ink,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${c.batch.isEmpty ? c.category : c.batch} · ${c.progressPercent.toStringAsFixed(0)}% · Fee Rs $due',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              color: AppColors.muted,
                                              fontSize: 12,
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          ClipRRect(
                                            borderRadius:
                                                BorderRadius.circular(100),
                                            child: LinearProgressIndicator(
                                              value: (c.progressPercent / 100)
                                                  .clamp(0.0, 1.0),
                                              minHeight: 4,
                                              backgroundColor: AppColors.line,
                                              color: AppColors.blue,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(
                                      CupertinoIcons.chevron_forward,
                                      color: AppColors.muted,
                                      size: 16,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (i < batches.take(5).length - 1) const _Line(),
                          ],
                        );
                      }),
                  ],
                ),
              ),
            ),

            // Tasks
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 22, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: _Section('MY TASKS')),
                        if (myTasks.length > 3)
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
                          style: TextStyle(color: AppColors.muted, fontSize: 13),
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

            // Students preview
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
                    if (teaching.courses.isEmpty)
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
                        final flat = teaching.courses
                            .expand(
                              (c) => c.students.map(
                                (s) => (
                                  s,
                                  c.title,
                                  (c.batch ?? '').isEmpty
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
                                subtitle: '${row.$3} · ${row.$2}',
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

            // Office today
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
    );
  }

  String _initials(String name) {
    final parts =
        name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'T';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }

  void _push(BuildContext context, Widget page) {
    HapticFeedback.selectionClick();
    Navigator.of(context).push(AppMotion.fadeSlide(page));
  }

  Widget _stat({
    required IconData icon,
    required String label,
    required String value,
    bool danger = false,
  }) {
    final accent = danger ? AppColors.danger : AppColors.blueDark;
    final tint = danger
        ? AppColors.danger.withValues(alpha: 0.08)
        : AppColors.softBlue;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      decoration: BoxDecoration(
        color: tint,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: accent),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: accent,
              fontSize: 15,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionChip(
    String label, {
    required VoidCallback onTap,
    bool filled = false,
  }) {
    return Material(
      color: filled ? AppColors.blue : AppColors.card,
      borderRadius: BorderRadius.circular(100),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(100),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(100),
            border: Border.all(
              color: filled ? AppColors.blue : AppColors.line,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
              color: filled ? Colors.white : AppColors.ink,
            ),
          ),
        ),
      ),
    );
  }

  Widget _listRow({
    required IconData icon,
    required String title,
    required String subtitle,
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
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              CupertinoIcons.chevron_forward,
              color: AppColors.muted,
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
        color: AppColors.muted,
        fontSize: 12,
        fontWeight: FontWeight.w700,
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
