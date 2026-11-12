import 'package:flutter/cupertino.dart';
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
import '../../providers/task_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_loader.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/course_cover.dart';
import '../course/course_detail_screen.dart';
import '../fees/fees_screen.dart';
import '../tasks/task_detail_screen.dart';
import '../tasks/tasks_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  static const categories = [
    ('All', CupertinoIcons.square_grid_2x2),
    ('Coding', CupertinoIcons.chevron_left_slash_chevron_right),
    ('Design', CupertinoIcons.paintbrush),
    ('Business', CupertinoIcons.briefcase),
    ('Education', CupertinoIcons.book),
  ];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final courses = context.watch<CourseProvider>();
    final tasks = context.watch<TaskProvider>();
    final ui = context.watch<UiProvider>();
    final now = ui.now;
    final pad = AppResponsive.pagePad(context);
    final bottom = AppResponsive.shellBottom(context);
    final myTasks = tasks.tasksForUser(auth.user?.id ?? '');
    final previewTasks = myTasks.take(3).toList();
    final continueCourse = courses.continueCourse;
    final nextTopic = continueCourse?.nextTopic;
    final filtered = courses.filteredCourses;
    final featured = courses.featuredCourses;

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
            // Header
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 8, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const BrandMark(size: 36),
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
                        IconButton(
                          onPressed: () {
                            ui.showSnack(
                              myTasks.isEmpty
                                  ? 'No new notifications'
                                  : '${myTasks.length} assigned task${myTasks.length == 1 ? '' : 's'}',
                            );
                          },
                          icon: Badge(
                            isLabelVisible: myTasks.isNotEmpty,
                            smallSize: 8,
                            backgroundColor: AppColors.danger,
                            child: const Icon(
                              CupertinoIcons.bell,
                              color: AppColors.ink,
                              size: 22,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      TimeUtils.greeting(now),
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      auth.user?.name ?? 'Learner',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: AppColors.ink,
                        letterSpacing: -0.4,
                      ),
                    ),
                    Text(
                      auth.user?.roleLabel ?? '',
                      style: const TextStyle(
                        color: AppColors.blue,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Stats — clear soft containers (same blue sequence)
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 20, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Expanded(
                      child: _statBox(
                        'Courses',
                        '${courses.enrolledCourses.length}',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _statBox(
                        'Attend',
                        '${courses.overallAttendance.toStringAsFixed(0)}%',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _statBox(
                        'Due',
                        'Rs ${courses.totalFeeDue}',
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Timers — flat rows
            if (continueCourse?.nextClassAt != null ||
                continueCourse?.feeDueAt != null)
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 22, pad, 0),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'UPCOMING',
                        style: TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.6,
                        ),
                      ),
                      if (continueCourse?.nextClassAt != null) ...[
                        const SizedBox(height: 8),
                        _timerRow(
                          icon: CupertinoIcons.time,
                          title: 'Next class',
                          subtitle:
                              '${continueCourse!.title} · ${nextTopic?.title ?? 'Continue'}',
                          timer: TimeUtils.countdown(
                            continueCourse.nextClassAt!,
                            now,
                          ),
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
                        const Divider(height: 1, thickness: 0.5, color: AppColors.line),
                      if (continueCourse?.feeDueAt != null)
                        _timerRow(
                          icon: CupertinoIcons.money_dollar_circle,
                          title: 'Fee due · Rs ${continueCourse!.monthlyFee}',
                          subtitle: TimeUtils.dueLabel(continueCourse.feeDueAt!, now),
                          timer: TimeUtils.countdown(continueCourse.feeDueAt!, now),
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

            // Assigned tasks
            if (previewTasks.isNotEmpty)
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 24, pad, 0),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'ASSIGNED TO ME',
                              style: TextStyle(
                                color: AppColors.muted,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ),
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
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                child: Row(
                                  children: [
                                    const Icon(
                                      CupertinoIcons.checkmark_seal,
                                      color: AppColors.blue,
                                      size: 22,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
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
                                            '${task.status} · ${task.timerMinutes}m timer',
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
                                      size: 18,
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

            // Categories
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 22, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'CATEGORIES',
                      style: TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 36,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: categories.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final item = categories[index];
                          final selected = courses.selectedCategory == item.$1;
                          return GestureDetector(
                            onTap: () => courses.setCategory(item.$1),
                            child: AnimatedContainer(
                              duration: AppMotion.fast,
                              curve: AppMotion.curve,
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              decoration: BoxDecoration(
                                color: selected ? AppColors.blue : Colors.transparent,
                                borderRadius: BorderRadius.circular(100),
                                border: Border.all(
                                  color: selected ? AppColors.blue : AppColors.line,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    item.$2,
                                    size: 15,
                                    color: selected ? Colors.white : AppColors.muted,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    item.$1,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: selected ? Colors.white : AppColors.ink,
                                    ),
                                  ),
                                ],
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

            // Featured
            if (featured.isNotEmpty) ...[
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 24, pad, 0),
                sliver: const SliverToBoxAdapter(
                  child: Text(
                    'FEATURED',
                    style: TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.6,
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 210,
                  child: ListView.separated(
                    padding: EdgeInsets.fromLTRB(pad, 10, pad, 0),
                    scrollDirection: Axis.horizontal,
                    itemCount: featured.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      return _featuredTile(context, featured[index], courses);
                    },
                  ),
                ),
              ),
            ],

            // My courses
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 24, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'MY COURSES',
                        style: TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ),
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
              ),
            ),
            if (filtered.isEmpty)
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 24, pad, bottom),
                sliver: const SliverToBoxAdapter(
                  child: Center(
                    child: Text(
                      'No courses in this category',
                      style: TextStyle(color: AppColors.muted),
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 4, pad, bottom),
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
          ],
        ),
      ),
    );
  }

  Widget _statBox(String label, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
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
              fontSize: 12,
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
              fontWeight: FontWeight.w700,
              fontSize: 16,
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
    required String timer,
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
                    style: const TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              timer,
              style: const TextStyle(
                color: AppColors.blue,
                fontWeight: FontWeight.w700,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _featuredTile(
    BuildContext context,
    Course course,
    CourseProvider courses,
  ) {
    return PressableScale(
      onTap: () {
        courses.selectCourse(course);
        Navigator.of(context).push(
          AppMotion.fadeSlide(CourseDetailScreen(courseId: course.id)),
        );
      },
      child: SizedBox(
        width: 220,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CourseCover(
              url: course.thumbnailUrl,
              height: 124,
              borderRadius: BorderRadius.circular(12),
            ),
            const SizedBox(height: 8),
            Text(
              course.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
            const SizedBox(height: 2),
            Text(
              'Rs ${course.monthlyFee} · ${course.durationMonths} mo · ${course.rating}★',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
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
                    'Mo Rs ${course.monthlyFee} · ${course.installmentCount}× Rs ${course.installmentFee}',
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
                      'Progress ${course.progressPercent.toStringAsFixed(0)}% · Attend ${course.attendancePercent.toStringAsFixed(0)}%',
                      style: const TextStyle(color: AppColors.muted, fontSize: 11),
                    ),
                  ] else
                    Text(
                      'Not enrolled · ${course.rating}★',
                      style: const TextStyle(color: AppColors.muted, fontSize: 12),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
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
