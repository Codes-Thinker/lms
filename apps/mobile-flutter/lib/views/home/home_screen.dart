import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/constants/time_utils.dart';
import '../../core/responsive.dart';
import '../../models/course.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/task_provider.dart';
import '../../widgets/app_loader.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/course_cover.dart';
import '../../widgets/live_clock.dart';
import '../../widgets/live_countdown.dart';
import '../course/course_detail_screen.dart';
import '../course/all_courses_screen.dart';
import '../fees/fees_screen.dart';
import '../notifications/notifications_screen.dart';
import '../tasks/task_detail_screen.dart';
import '../tasks/tasks_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final courses = context.watch<CourseProvider>();
    final tasks = context.watch<TaskProvider>();
    final notes = context.watch<NotificationProvider>();
    final now = DateTime.now();
    final pad = AppResponsive.pagePad(context);
    final bottom = AppResponsive.shellBottom(context);
    final myTasks = tasks.tasksForUser(auth.user?.id ?? '');
    final previewTasks = myTasks.take(3).toList();
    final continueCourse = courses.continueCourse;
    final nextTopic = continueCourse?.nextTopic;
    final filtered = courses.filteredCourses;
    final displayName = auth.user?.name.trim().isNotEmpty == true
        ? auth.user!.name.trim()
        : 'Student';
    final unread = notes.unreadCount;

    if (courses.loading && courses.courses.isEmpty) {
      return const Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(child: AppLoader()),
      );
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // 1 — Top bar
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 8, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    const BrandMark(size: 34),
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

            // 2 — Name only (no greeting / role line)
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 18, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Text(
                  displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                    letterSpacing: -0.5,
                    height: 1.15,
                  ),
                ),
              ),
            ),

            // 3 — Continue learning (primary)
            if (continueCourse != null)
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 20, pad, 0),
                sliver: SliverToBoxAdapter(
                  child: InkWell(
                    onTap: () {
                      courses.selectCourse(continueCourse);
                      Navigator.of(context).push(
                        AppMotion.fadeSlide(
                          CourseDetailScreen(courseId: continueCourse.id),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Ink(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.softBlue,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          CourseCover(
                            url: continueCourse.thumbnailUrl,
                            title: continueCourse.title,
                            height: 52,
                            width: 52,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Continue',
                                  style: TextStyle(
                                    color: AppColors.blue,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  continueCourse.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                    color: AppColors.ink,
                                  ),
                                ),
                                Text(
                                  nextTopic?.title ??
                                      '${continueCourse.progressPercent.toStringAsFixed(0)}% complete',
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
                            Icons.play_circle_fill_rounded,
                            color: AppColors.blue,
                            size: 28,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

            // 4 — Overview stats
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 18, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Expanded(
                      child: _statBox(
                        icon: Icons.menu_book_rounded,
                        label: 'Courses',
                        value: '${courses.enrolledCourses.length}',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _statBox(
                        icon: Icons.fingerprint_rounded,
                        label: 'Attendance',
                        value:
                            '${courses.overallAttendance.toStringAsFixed(0)}%',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _statBox(
                        icon: Icons.account_balance_wallet_outlined,
                        label: 'Due',
                        value: 'Rs ${courses.totalFeeDue}',
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 5 — Upcoming class / fee
            if (continueCourse?.nextClassAt != null ||
                continueCourse?.feeDueAt != null)
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 22, pad, 0),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _SectionLabel('Upcoming'),
                      if (continueCourse?.nextClassAt != null) ...[
                        const SizedBox(height: 4),
                        _timerRow(
                          icon: Icons.schedule_rounded,
                          title: 'Next class',
                          subtitle:
                              '${continueCourse!.title}, ${nextTopic?.title ?? 'Continue'}',
                          target: continueCourse.nextClassAt!,
                          onTap: () {
                            courses.selectCourse(continueCourse);
                            Navigator.of(context).push(
                              AppMotion.fadeSlide(
                                CourseDetailScreen(courseId: continueCourse.id),
                              ),
                            );
                          },
                        ),
                      ],
                      if (continueCourse?.nextClassAt != null &&
                          continueCourse?.feeDueAt != null)
                        const Divider(
                          height: 1,
                          thickness: 0.5,
                          color: AppColors.line,
                        ),
                      if (continueCourse?.feeDueAt != null)
                        _timerRow(
                          icon: Icons.payments_outlined,
                          title: 'Fee due, Rs ${continueCourse!.monthlyFee}',
                          subtitle: TimeUtils.dueLabel(
                            continueCourse.feeDueAt!,
                            now,
                          ),
                          target: continueCourse.feeDueAt!,
                          onTap: () {
                            Navigator.of(context).push(
                              AppMotion.fadeSlide(const FeesScreen()),
                            );
                          },
                        ),
                    ],
                  ),
                ),
              ),

            // 6 — My courses
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 24, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: _SectionLabel('All courses')),
                        GestureDetector(
                          onTap: () {
                            Navigator.of(context).push(
                              AppMotion.fadeSlide(const AllCoursesScreen()),
                            );
                          },
                          child: const Text(
                            'View all',
                            style: TextStyle(
                              color: AppColors.blue,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          '${filtered.length}',
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 36,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: courses.categoryNames.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final name = courses.categoryNames[index];
                          final selected = courses.selectedCategory == name;
                          return GestureDetector(
                            onTap: () => courses.setCategory(name),
                            child: AnimatedContainer(
                              duration: AppMotion.fast,
                              curve: AppMotion.curve,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              decoration: BoxDecoration(
                                color: selected ? AppColors.blue : Colors.white,
                                borderRadius: BorderRadius.circular(100),
                                border: Border.all(
                                  color: selected
                                      ? AppColors.blue
                                      : AppColors.line,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  name,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color:
                                        selected ? Colors.white : AppColors.ink,
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (filtered.isEmpty)
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 20, pad, 0),
                sliver: const SliverToBoxAdapter(
                  child: Text(
                    'No courses in this category',
                    style: TextStyle(color: AppColors.muted),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 4, pad, 0),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final course = filtered[index];
                      return Column(
                        children: [
                          _courseRow(context, course, courses),
                          if (index < filtered.length - 1)
                            const Divider(
                              height: 1,
                              thickness: 0.5,
                              color: AppColors.line,
                            ),
                        ],
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              ),

            // 7 — Tasks
            if (previewTasks.isNotEmpty)
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 24, pad, 0),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Expanded(child: _SectionLabel('Tasks')),
                          if (myTasks.length > 3)
                            GestureDetector(
                              onTap: () {
                                Navigator.of(context).push(
                                  AppMotion.fadeSlide(const TasksScreen()),
                                );
                              },
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
                      const SizedBox(height: 4),
                      ...List.generate(previewTasks.length, (i) {
                        final task = previewTasks[i];
                        return Column(
                          children: [
                            InkWell(
                              onTap: () {
                                Navigator.of(context).push(
                                  AppMotion.fadeSlide(
                                    TaskDetailScreen(taskId: task.id),
                                  ),
                                );
                              },
                              child: Padding(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12),
                                child: Row(
                                  children: [
                                    Icon(
                                      task.status == 'DONE'
                                          ? Icons.check_circle_rounded
                                          : Icons.radio_button_unchecked,
                                      color: task.status == 'DONE'
                                          ? AppColors.blue
                                          : AppColors.muted,
                                      size: 22,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            task.title,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                              fontSize: 15,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${task.status}, ${(task.spentSeconds / 60).floor()}m worked',
                                            style: const TextStyle(
                                              color: AppColors.muted,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Icon(
                                      Icons.chevron_right_rounded,
                                      color: AppColors.muted,
                                      size: 22,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (i < previewTasks.length - 1)
                              const Divider(
                                height: 1,
                                thickness: 0.5,
                                color: AppColors.line,
                              ),
                          ],
                        );
                      }),
                    ],
                  ),
                ),
              ),

            SliverToBoxAdapter(child: SizedBox(height: bottom + 8)),
          ],
        ),
      ),
    );
  }

  Widget _statBox({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.blue),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.ink,
              fontWeight: FontWeight.w700,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }

  Widget _timerRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required DateTime target,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Icon(icon, color: AppColors.blue, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style:
                        const TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            LiveCountdown(target: target),
          ],
        ),
      ),
    );
  }

  Widget _courseRow(
    BuildContext context,
    Course course,
    CourseProvider courses,
  ) {
    return InkWell(
      onTap: () {
        courses.selectCourse(course);
        Navigator.of(context).push(
          AppMotion.fadeSlide(CourseDetailScreen(courseId: course.id)),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            CourseCover(
              url: course.thumbnailUrl,
              title: course.title,
              height: 56,
              width: 56,
              borderRadius: BorderRadius.circular(10),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    course.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Rs ${course.monthlyFee}/mo, ${course.installmentCount}× Rs ${course.installmentFee}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.blue,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 6),
                  if (course.enrolled) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(100),
                      child: LinearProgressIndicator(
                        value: (course.progressPercent / 100).clamp(0.0, 1.0),
                        minHeight: 4,
                        backgroundColor: AppColors.line,
                        color: AppColors.blue,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${course.progressPercent.toStringAsFixed(0)}%, Attendance ${course.attendancePercent.toStringAsFixed(0)}%',
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 11,
                      ),
                    ),
                  ] else
                    const Text(
                      'Available to enroll',
                      style: TextStyle(color: AppColors.muted, fontSize: 12),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.muted,
              size: 22,
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        color: AppColors.muted,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.7,
      ),
    );
  }
}
