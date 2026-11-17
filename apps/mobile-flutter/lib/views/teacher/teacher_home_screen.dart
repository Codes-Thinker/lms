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

  /// Pull every teacher dashboard source from the live API.
  Future<void> _hydrate({bool silent = true}) async {
    if (!mounted) return;
    final courses = context.read<CourseProvider>();
    final teaching = context.read<TeachingProvider>();
    final tasks = context.read<TaskProvider>();
    final fees = context.read<FeeProvider>();
    final attendance = context.read<AttendanceProvider>();
    final notes = context.read<NotificationProvider>();
    await Future.wait([
      courses.fetchAll(),
      teaching.load(silent: silent),
      tasks.load(silent: silent),
      fees.load(),
      attendance.loadMine(),
      notes.load(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final courses = context.watch<CourseProvider>();
    final teaching = context.watch<TeachingProvider>();
    final tasks = context.watch<TaskProvider>();
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
    // Student fee dues across batches this teacher instructs (backend course totals).
    final feeDueAcrossBatches = batches.fold<int>(0, (sum, c) {
      final due = (c.totalFee - c.paidAmount).clamp(0, c.totalFee);
      return sum + due;
    });
    final checkedIn = attendance.today.where((m) => m.isCheckedIn).length;
    final sessions = batches.take(5).toList();
    final name = auth.user?.name.trim().isNotEmpty == true
        ? auth.user!.name.trim()
        : 'Teacher';
    final role = auth.user?.roleLabel ?? 'Staff';
    final track = auth.trackLabel;
    final mentorBadge = track.trim().isNotEmpty && track != 'Unassigned track'
        ? track.toUpperCase()
        : role.toUpperCase();
    final avatar = auth.avatarImage;
    final unread = notes.unreadCount;

    if (teaching.loading && teaching.courses.isEmpty && batches.isEmpty) {
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
                      tooltip: 'Search courses',
                      onPressed: () =>
                          _push(context, const AllCoursesScreen()),
                      icon: const Icon(
                        CupertinoIcons.search,
                        color: _navy,
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
                          color: _navy,
                          size: 24,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Mentor bio — flat
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 14, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                              color: _navy,
                              letterSpacing: -0.5,
                              height: 1.1,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: _royal,
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              mentorBadge,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.35,
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'Lecture students, mentor development, office attendance',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: _slate,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: _royal, width: 2),
                      ),
                      child: CircleAvatar(
                        radius: 30,
                        backgroundColor: AppColors.softBlue,
                        backgroundImage: avatar,
                        child: avatar == null
                            ? Text(
                                _initials(name),
                                style: const TextStyle(
                                  color: _royal,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 18,
                                ),
                              )
                            : null,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 2-column flat metrics
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 16, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _statCard(
                            icon: Icons.folder_rounded,
                            label: 'Classes',
                            value: '$classCount',
                            tint: const Color(0xFFE8F1FF),
                            accent: const Color(0xFF3B82F6),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _statCard(
                            icon: Icons.groups_rounded,
                            label: 'Students',
                            value: '${teaching.totalStudents}',
                            tint: const Color(0xFFE8F8EF),
                            accent: const Color(0xFF10B981),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _statCard(
                            icon: Icons.assignment_rounded,
                            label: 'Assigned Tasks',
                            value: '${teaching.assigned.length}',
                            tint: const Color(0xFFF3E8FF),
                            accent: const Color(0xFF8B5CF6),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _statCard(
                            icon: Icons.calendar_month_rounded,
                            label: 'Total Batches',
                            value: '${batches.length}',
                            tint: const Color(0xFFFFF4EC),
                            accent: const Color(0xFFF97316),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _statCard(
                            icon: Icons.payments_rounded,
                            label: 'Fee due',
                            value: 'Rs $feeDueAcrossBatches',
                            tint: const Color(0xFFE6F7F5),
                            accent: const Color(0xFF14B8A6),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _statCard(
                            icon: Icons.home_work_rounded,
                            label: 'In office',
                            value: '$checkedIn',
                            tint: const Color(0xFFFFEEF2),
                            accent: const Color(0xFFEC4899),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Quick actions — solid / outlined pills
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
                          onTap: () =>
                              _push(context, const AttendanceScreen()),
                        ),
                        _actionChip(
                          'My tasks',
                          icon: Icons.task_alt_rounded,
                          onTap: () => _push(context, const TasksScreen()),
                        ),
                        _actionChip(
                          'Batch report',
                          icon: Icons.bar_chart_rounded,
                          onTap: () => _push(context, const ReportScreen()),
                        ),
                        _actionChip(
                          'Help',
                          icon: Icons.help_outline_rounded,
                          onTap: () => _push(context, const HelpHubScreen()),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Upcoming classes — flat bordered cards
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 22, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Section('UPCOMING CLASSES'),
                    const SizedBox(height: 8),
                    if (sessions.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Text(
                          'No live courses yet. Publish from admin.',
                          style: TextStyle(
                            color: _slate,
                            fontSize: 13,
                            height: 1.35,
                          ),
                        ),
                      )
                    else
                      ...List.generate(sessions.length, (i) {
                        final c = sessions[i];
                        final batchLabel =
                            c.batch.isEmpty ? c.category : c.batch;
                        return Padding(
                          padding: EdgeInsets.only(
                            bottom: i == sessions.length - 1 ? 0 : 8,
                          ),
                          child: _upcomingCard(
                            title: c.title,
                            subtitle: '$batchLabel · Live catalog',
                            onOpen: () {
                              courses.selectCourse(c);
                              _push(
                                context,
                                CourseDetailScreen(courseId: c.id),
                              );
                            },
                          ),
                        );
                      }),
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

  Widget _statCard({
    required IconData icon,
    required String label,
    required String value,
    required Color tint,
    required Color accent,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      decoration: BoxDecoration(
        color: tint,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withValues(alpha: 0.12)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: accent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: Colors.white),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: RichText(
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              text: TextSpan(
                children: [
                  TextSpan(
                    text: '$label: ',
                    style: TextStyle(
                      color: accent.withValues(alpha: 0.92),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  TextSpan(
                    text: value,
                    style: TextStyle(
                      color: accent,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionChip(
    String label, {
    required IconData icon,
    required VoidCallback onTap,
    bool filled = false,
  }) {
    return Material(
      color: filled ? _royal : Colors.white,
      borderRadius: BorderRadius.circular(100),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(100),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(100),
            border: Border.all(
              color: filled ? _royal : _royal.withValues(alpha: 0.45),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 14,
                color: filled ? Colors.white : _royal,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                  color: filled ? Colors.white : _royal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _upcomingCard({
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
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F1FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  CupertinoIcons.time,
                  size: 18,
                  color: _royal,
                ),
              ),
              const SizedBox(width: 10),
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
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _slate,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: _royal,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Open',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
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
