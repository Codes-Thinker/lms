import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
import '../../models/course.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/task_provider.dart';
import '../../widgets/app_loader.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/course_cover.dart';
import '../course/all_courses_screen.dart';
import '../course/course_detail_screen.dart';
import '../fees/fees_screen.dart';
import '../notifications/notifications_screen.dart';
import '../tasks/task_detail_screen.dart';
import '../tasks/tasks_screen.dart';

/// Premium student home — navbar stays in AppShell (unchanged).
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  static const _navy = Color(0xFF1A1C2E);
  static const _softOrange = Color(0xFFFFF4EC);
  static const _softRose = Color(0xFFFFEEF0);

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final courses = context.watch<CourseProvider>();
    final tasks = context.watch<TaskProvider>();
    final notes = context.watch<NotificationProvider>();
    final pad = AppResponsive.pagePad(context);
    final bottom = AppResponsive.shellBottom(context);
    final myTasks = tasks.tasksForUser(auth.user?.id ?? '');
    final previewTasks = myTasks.take(3).toList();
    final continueCourse = courses.continueCourse;
    final nextTopic = continueCourse?.nextTopic;
    final filtered = courses.filteredCourses;
    // Home shows 3 course tiles when the catalog has them.
    final homeCourses = () {
      if (filtered.length >= 3) return filtered.take(3).toList();
      if (filtered.isEmpty) return courses.courses.take(3).toList();
      final ids = filtered.map((c) => c.id).toSet();
      final extras = courses.courses.where((c) => !ids.contains(c.id));
      return [...filtered, ...extras].take(3).toList();
    }();
    final displayName = auth.user?.name.trim().isNotEmpty == true
        ? auth.user!.name.trim()
        : 'Student';
    final batch = () {
      final fromCourse = continueCourse?.batch.trim() ?? '';
      if (fromCourse.isNotEmpty) return fromCourse;
      final fromUserBatch = auth.user?.batch?.trim() ?? '';
      if (fromUserBatch.isNotEmpty) return fromUserBatch;
      final fromTrack = auth.user?.track?.trim() ?? '';
      if (fromTrack.isNotEmpty) return fromTrack;
      return auth.user?.roleLabel ?? '';
    }();
    final unread = notes.unreadCount;

    if (courses.loading && courses.courses.isEmpty) {
      return const Scaffold(
        backgroundColor: AppColors.bg,
        body: Center(child: AppLoader()),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Top bar
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
                      onPressed: () {
                        Navigator.of(context).push(
                          AppMotion.fadeSlide(const AllCoursesScreen()),
                        );
                      },
                      icon: const Icon(
                        CupertinoIcons.search,
                        color: AppColors.ink,
                        size: 22,
                      ),
                    ),
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

            // Name + batch (tighter under top bar)
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 8, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        displayName,
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
                    ),
                    if (batch.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF1F6),
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Text(
                          batch,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.muted,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // Continue learning — brand blue + blurred CT logo watermark
            if (continueCourse != null)
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 12, pad, 0),
                sliver: SliverToBoxAdapter(
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        courses.selectCourse(continueCourse);
                        Navigator.of(context).push(
                          AppMotion.fadeSlide(
                            CourseDetailScreen(courseId: continueCourse.id),
                          ),
                        );
                      },
                      borderRadius: BorderRadius.circular(18),
                      child: Ink(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: AppColors.line),
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Color(0xFFEFF6FF),
                              Color(0xFFDBEAFE),
                              Color(0xFFBFDBFE),
                            ],
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(18),
                          child: Stack(
                            children: [
                              Positioned(
                                right: -18,
                                bottom: -22,
                                child: Opacity(
                                  opacity: 0.14,
                                  child: ImageFiltered(
                                    imageFilter: ImageFilter.blur(
                                      sigmaX: 10,
                                      sigmaY: 10,
                                    ),
                                    child: Image.asset(
                                      AppBrand.markHdAsset,
                                      width: 128,
                                      height: 128,
                                      fit: BoxFit.contain,
                                      filterQuality: FilterQuality.high,
                                      errorBuilder: (_, __, ___) =>
                                          Image.asset(
                                        AppBrand.markAsset,
                                        width: 128,
                                        height: 128,
                                        fit: BoxFit.contain,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                left: -28,
                                top: -36,
                                child: Opacity(
                                  opacity: 0.08,
                                  child: ImageFiltered(
                                    imageFilter: ImageFilter.blur(
                                      sigmaX: 14,
                                      sigmaY: 14,
                                    ),
                                    child: Image.asset(
                                      AppBrand.logoAsset,
                                      width: 160,
                                      height: 80,
                                      fit: BoxFit.contain,
                                      filterQuality: FilterQuality.high,
                                    ),
                                  ),
                                ),
                              ),
                              Padding(
                                padding:
                                    const EdgeInsets.fromLTRB(14, 12, 12, 12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'CONTINUE LEARNING',
                                      style: TextStyle(
                                        color: AppColors.blueDark,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.7,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.center,
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                continueCourse.title,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  color: AppColors.ink,
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.w800,
                                                  height: 1.2,
                                                  letterSpacing: -0.2,
                                                ),
                                              ),
                                              const SizedBox(height: 3),
                                              Text(
                                                nextTopic != null
                                                    ? 'Next: ${nextTopic.title}'
                                                    : '${continueCourse.progressPercent.toStringAsFixed(0)}% completed',
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  color: AppColors.muted,
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          width: 36,
                                          height: 36,
                                          decoration: const BoxDecoration(
                                            color: AppColors.blue,
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(
                                            CupertinoIcons.play_fill,
                                            color: Colors.white,
                                            size: 16,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(100),
                                      child: LinearProgressIndicator(
                                        value: (continueCourse.progressPercent /
                                                100)
                                            .clamp(0.0, 1.0),
                                        minHeight: 4,
                                        backgroundColor: Colors.white
                                            .withValues(alpha: 0.7),
                                        color: AppColors.blueDark,
                                      ),
                                    ),
                                    const SizedBox(height: 5),
                                    Text(
                                      '${continueCourse.progressPercent.toStringAsFixed(0)}% Completed',
                                      style: const TextStyle(
                                        color: AppColors.blueDark,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),

            // Soft pastel stats — iOS icons
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 10, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Expanded(
                      child: _pastelStat(
                        icon: CupertinoIcons.book_fill,
                        label: 'Courses',
                        value: '${courses.enrolledCourses.length}',
                        bg: AppColors.softBlue,
                        accent: AppColors.blueDark,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _pastelStat(
                        icon: CupertinoIcons.chart_pie_fill,
                        label: 'Attendance',
                        value:
                            '${courses.overallAttendance.toStringAsFixed(0)}%',
                        bg: _softOrange,
                        accent: const Color(0xFFEA580C),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          Navigator.of(context).push(
                            AppMotion.fadeSlide(const FeesScreen()),
                          );
                        },
                        child: _pastelStat(
                          icon: CupertinoIcons.creditcard_fill,
                          label: 'Due Fee',
                          value: 'Rs ${courses.totalFeeDue}',
                          bg: _softRose,
                          accent: const Color(0xFFDC2626),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // All courses header + chips
            SliverPadding(
              padding: EdgeInsets.fromLTRB(pad, 20, pad, 0),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'ALL COURSES',
                            style: TextStyle(
                              color: AppColors.ink,
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            Navigator.of(context).push(
                              AppMotion.fadeSlide(const AllCoursesScreen()),
                            );
                          },
                          child: Text(
                            'View all (${filtered.length})',
                            style: const TextStyle(
                              color: AppColors.blueDark,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 38,
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
                                horizontal: 14,
                              ),
                              decoration: BoxDecoration(
                                color: selected ? _navy : Colors.white,
                                borderRadius: BorderRadius.circular(100),
                                border: Border.all(
                                  color:
                                      selected ? _navy : AppColors.line,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  name,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: selected
                                        ? Colors.white
                                        : AppColors.ink,
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

            if (homeCourses.isEmpty)
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
                padding: EdgeInsets.fromLTRB(pad, 12, pad, 0),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final course = homeCourses[index];
                      return Padding(
                        padding: EdgeInsets.only(
                          bottom: index == homeCourses.length - 1 ? 0 : 10,
                        ),
                        child: _courseCard(context, course, courses),
                      );
                    },
                    childCount: homeCourses.length,
                  ),
                ),
              ),

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
                              'TASKS',
                              style: TextStyle(
                                color: AppColors.ink,
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
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
                                  color: AppColors.blueDark,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ...previewTasks.map((task) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Material(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () {
                                Navigator.of(context).push(
                                  AppMotion.fadeSlide(
                                    TaskDetailScreen(taskId: task.id),
                                  ),
                                );
                              },
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 14,
                                ),
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
                                              fontWeight: FontWeight.w700,
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
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),

            SliverToBoxAdapter(child: SizedBox(height: bottom + 12)),
          ],
        ),
      ),
    );
  }

  Widget _pastelStat({
    required IconData icon,
    required String label,
    required String value,
    required Color bg,
    required Color accent,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 11, 12, 11),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
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
              fontWeight: FontWeight.w800,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: accent.withValues(alpha: 0.85),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _courseCard(
    BuildContext context,
    Course course,
    CourseProvider courses,
  ) {
    final tag = course.enrolled
        ? 'Active'
        : course.enrollmentStatus == 'REQUEST_PENDING'
            ? 'Pending'
            : 'Available to enroll';
    final tagColor = course.enrolled
        ? const Color(0xFF059669)
        : course.enrollmentStatus == 'REQUEST_PENDING'
            ? const Color(0xFFD97706)
            : const Color(0xFF059669);

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          courses.selectCourse(course);
          Navigator.of(context).push(
            AppMotion.fadeSlide(CourseDetailScreen(courseId: course.id)),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CourseCover(
                url: course.thumbnailUrl,
                title: course.title,
                height: 72,
                width: 72,
                borderRadius: BorderRadius.circular(14),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        height: 1.25,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Rs ${course.monthlyFee}/mo · ${course.installmentCount}× Rs ${course.installmentFee}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.blueDark,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (course.enrolled) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(100),
                        child: LinearProgressIndicator(
                          value:
                              (course.progressPercent / 100).clamp(0.0, 1.0),
                          minHeight: 5,
                          backgroundColor: AppColors.line,
                          color: AppColors.blue,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${course.progressPercent.toStringAsFixed(0)}% · Attendance ${course.attendancePercent.toStringAsFixed(0)}%',
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: tagColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Text(
                        tag,
                        style: TextStyle(
                          color: tagColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
