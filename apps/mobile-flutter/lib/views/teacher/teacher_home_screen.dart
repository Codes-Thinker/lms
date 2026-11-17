import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
import '../../models/course.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/fee_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/live_clock.dart';
import '../attendance/attendance_screen.dart';
import '../course/course_detail_screen.dart';
import '../help/help_hub_screen.dart';
import '../notifications/notifications_screen.dart';
import '../report/report_screen.dart';
import '../tasks/task_detail_screen.dart';
import '../tasks/tasks_screen.dart';
import '../../providers/teaching_provider.dart';
import 'teacher_class_screen.dart';

/// Teacher / Staff dashboard — own courses, students, tasks, attendance.
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
    final ui = context.read<UiProvider>();
    final pad = AppResponsive.pagePad(context);
    final bottom = AppResponsive.shellBottom(context);

    final taughtIds = teaching.courses.map((c) => c.id).toSet();
    final batches = taughtIds.isEmpty
        ? courses.courses
        : courses.courses.where((c) => taughtIds.contains(c.id)).toList();
    // Live catalog only — no mock class schedule.
    final sessions = batches
        .take(5)
        .map(
          (c) => (
            id: c.id,
            courseTitle: c.title,
            batch: c.batch.isEmpty ? c.category : c.batch,
            present: 0,
            total: 0,
          ),
        )
        .toList();
    final staffId = auth.user?.id ?? '';
    final myTasks = tasks.tasksForUser(staffId);
    final openTasks = myTasks.where((t) => t.status != 'DONE').toList();
    final feePending = fees.pendingAmount;
    final checkedIn = attendance.today.where((m) => m.isCheckedIn).length;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 8, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
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
                              fontWeight: FontWeight.w600,
                              color: AppColors.ink,
                            ),
                          ),
                        ),
                        const LiveClock(),
                        const SizedBox(width: 4),
                        IconButton(
                          tooltip: 'Messages',
                          onPressed: () {
                            Navigator.of(context).push(
                              AppMotion.fadeSlide(const NotificationsScreen()),
                            );
                          },
                          icon: Badge(
                            isLabelVisible: openTasks.isNotEmpty,
                            smallSize: 8,
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
                    const SizedBox(height: 18),
                    Text(
                      auth.user?.name ?? 'Teacher',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.5,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      auth.trackLabel,
                      style: const TextStyle(color: AppColors.muted, fontSize: 12),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Lecture students, mentor development, office attendance',
                      style: TextStyle(color: AppColors.muted, fontSize: 12),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Expanded(
                          child: _statBox(
                            'Classes',
                            '${teaching.courses.isNotEmpty ? teaching.courses.length : batches.length}',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _statBox(
                            'Students',
                            '${teaching.totalStudents}',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _statBox(
                            'Assigned',
                            '${teaching.assigned.length}',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _statBox('Classes', '${sessions.length}'),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _statBox('Fee due', 'Rs $feePending'),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _statBox('In office', '$checkedIn'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Quick actions → full app modules
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
                        _chip(
                          'My students',
                          () => _push(context, const TeacherClassScreen()),
                        ),
                        _chip(
                          'Attendance',
                          () => _push(context, const AttendanceScreen()),
                          outline: true,
                        ),
                        _chip(
                          'My tasks',
                          () => _push(context, const TasksScreen()),
                          outline: true,
                        ),
                        _chip(
                          'Batch report',
                          () => _push(context, const ReportScreen()),
                          outline: true,
                        ),
                        _chip(
                          'Help',
                          () => _push(context, const HelpHubScreen()),
                          outline: true,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Upcoming classes
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 24, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Section('UPCOMING CLASSES'),
                    const SizedBox(height: 2),
                    if (sessions.isEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: Text(
                          'No live courses yet. Publish from admin.',
                          style: TextStyle(color: AppColors.muted, fontSize: 13),
                        ),
                      )
                    else
                      ...List.generate(sessions.length, (i) {
                        final s = sessions[i];
                        final course = _courseByTitle(batches, s.courseTitle);
                        return Column(
                          children: [
                            _row(
                              icon: CupertinoIcons.time,
                              title: s.courseTitle,
                              subtitle: '${s.batch}, Live catalog',
                              trailing: 'Open',
                              onTap: () {
                                if (course == null) {
                                  ui.showSnack('${s.courseTitle}, ${s.batch}');
                                  return;
                                }
                                courses.selectCourse(course);
                                _push(
                                  context,
                                  CourseDetailScreen(courseId: course.id),
                                );
                              },
                            ),
                            if (i < sessions.length - 1) const _Line(),
                          ],
                        );
                      }),
                  ],
                ),
              ),
            ),

            // All batches / courses (full catalog data)
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
                    const SizedBox(height: 2),
                    if (batches.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          'No batches yet',
                          style: TextStyle(color: AppColors.muted),
                        ),
                      )
                    else
                      ...List.generate(batches.length, (i) {
                        final c = batches[i];
                        final due = (c.totalFee - c.paidAmount).clamp(0, c.totalFee);
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
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                child: Row(
                                  children: [
                                    const Icon(
                                      CupertinoIcons.book,
                                      color: AppColors.blue,
                                      size: 20,
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
                                              fontWeight: FontWeight.w600,
                                              fontSize: 15,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${c.batch}, ${c.category}',
                                            style: const TextStyle(
                                              color: AppColors.muted,
                                              fontSize: 12,
                                            ),
                                          ),
                                          const SizedBox(height: 6),
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
                                          const SizedBox(height: 4),
                                          Text(
                                            'Progress ${c.progressPercent.toStringAsFixed(0)}%, Attend ${c.attendancePercent.toStringAsFixed(0)}%, Fee due Rs $due',
                                            style: const TextStyle(
                                              color: AppColors.muted,
                                              fontSize: 11,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Icon(
                                      CupertinoIcons.chevron_forward,
                                      color: AppColors.muted,
                                      size: 18,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (i < batches.length - 1) const _Line(),
                          ],
                        );
                      }),
                  ],
                ),
              ),
            ),

            // Staff tasks
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 24, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: _Section('TEACHER / STAFF TASKS')),
                        if (myTasks.length > 2)
                          GestureDetector(
                            onTap: () => _push(context, const TasksScreen()),
                            child: const Text(
                              'See all',
                              style: TextStyle(
                                color: AppColors.blue,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    if (myTasks.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          'No staff tasks yet',
                          style: TextStyle(color: AppColors.muted),
                        ),
                      )
                    else
                      ...List.generate(myTasks.take(3).length, (i) {
                        final t = myTasks[i];
                        return Column(
                          children: [
                            _row(
                              icon: CupertinoIcons.checkmark_seal,
                              title: t.title,
                              subtitle:
                                  '${t.status}, ${(t.spentSeconds / 60).floor()}m worked, ${t.courseTitle}',
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

            // Students from courses this teacher instructs
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 24, pad, 0),
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
                              color: AppColors.blue,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    if (teaching.courses.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          'No students yet. Admin must set you as course instructor.',
                          style: TextStyle(color: AppColors.muted, height: 1.35),
                        ),
                      )
                    else
                      ...() {
                        final flat = teaching.courses
                            .expand(
                              (c) => c.students.map(
                                (s) => (s, c.title, c.batch ?? c.category),
                              ),
                            )
                            .take(8)
                            .toList();
                        return List.generate(flat.length, (i) {
                          final row = flat[i];
                          final s = row.$1;
                          return Column(
                            children: [
                              _row(
                                icon: CupertinoIcons.person,
                                title: s.name,
                                subtitle:
                                    '${s.accountType}, ${row.$3}, ${row.$2}',
                                onTap: () =>
                                    _push(context, const TeacherClassScreen()),
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

            // Office attendance today
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 24, pad, bottom),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: _Section('TODAY, OFFICE')),
                        GestureDetector(
                          onTap: () => _push(context, const AttendanceScreen()),
                          child: const Text(
                            'Open',
                            style: TextStyle(
                              color: AppColors.blue,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    if (attendance.today.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          'No office check-ins yet. Open Attendance to mark.',
                          style: TextStyle(color: AppColors.muted, height: 1.35),
                        ),
                      )
                    else
                      ...List.generate(attendance.today.length, (i) {
                        final m = attendance.today[i];
                        final out = m.checkOutAt;
                        return Column(
                          children: [
                            _row(
                              icon: CupertinoIcons.person_crop_circle,
                              title: m.personName,
                              subtitle:
                                  '${m.role}, ${m.status}${out == null ? ', still in' : ', OUT'}',
                              onTap: () =>
                                  _push(context, const AttendanceScreen()),
                            ),
                            if (i < attendance.today.length - 1) const _Line(),
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

  Course? _courseByTitle(List<Course> list, String title) {
    final match = list.where((c) => c.title == title);
    return match.isEmpty ? null : match.first;
  }

  void _push(BuildContext context, Widget page) {
    HapticFeedback.selectionClick();
    Navigator.of(context).push(AppMotion.fadeSlide(page));
  }

  Widget _statBox(String label, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.softBlue,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.blue,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.ink,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, VoidCallback onTap, {bool outline = false}) {
    return SizedBox(
      height: 40,
      child: outline
          ? OutlinedButton(
              onPressed: onTap,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.blue,
                side: const BorderSide(color: AppColors.blue),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(100),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14),
              ),
              child: Text(
                label,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            )
          : ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.blue,
                foregroundColor: Colors.white,
                elevation: 0,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(100),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14),
              ),
              child: Text(
                label,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
    );
  }

  Widget _row({
    required IconData icon,
    required String title,
    required String subtitle,
    String? trailing,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Icon(icon, color: AppColors.blue, size: 20),
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
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                ],
              ),
            ),
            if (trailing != null) ...[
              const SizedBox(width: 8),
              Text(
                trailing,
                style: const TextStyle(
                  color: AppColors.blue,
                  fontWeight: FontWeight.w700,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ] else
              const Icon(
                CupertinoIcons.chevron_forward,
                color: AppColors.muted,
                size: 18,
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
        fontWeight: FontWeight.w600,
        letterSpacing: 0.6,
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
