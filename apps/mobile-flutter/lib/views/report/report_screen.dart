import 'package:flutter/material.dart';
import '../../widgets/app_loader.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/responsive.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/report_provider.dart';

class ReportScreen extends StatelessWidget {
  const ReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ReportProvider()..loadMe(),
      child: const _ReportView(),
    );
  }
}

class _ReportView extends StatelessWidget {
  const _ReportView();

  @override
  Widget build(BuildContext context) {
    final isTeacher = context.watch<AuthProvider>().isTeacher;
    final coursesFallback = context.watch<CourseProvider>();
    final report = context.watch<ReportProvider>();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: Text(isTeacher ? 'Batch Report' : 'Course Report'),
        backgroundColor: AppColors.bg,
      ),
      body: Builder(
        builder: (context) {
          if (report.loading && report.courses.isEmpty) {
            return const Center(child: AppLoader());
          }

          final useLive = report.courses.isNotEmpty;
          final attendance = useLive
              ? report.attendancePercent
              : coursesFallback.overallAttendance;
          final feesPending =
              useLive ? report.feesPending : coursesFallback.totalFeeDue;

          final liveRows = report.courses;
          final fallbackList = isTeacher
              ? coursesFallback.courses
              : coursesFallback.enrolledCourses;

          return ListView(
            padding: AppResponsive.pageInsets(context, top: 8),
            children: [
              if (!isTeacher) ...[
                _statRow(
                  'Attendance',
                  '${attendance.toStringAsFixed(0)}%',
                  AppColors.softGreen,
                  AppColors.green,
                ),
                const SizedBox(height: 10),
                _statRow(
                  'Fees pending',
                  'Rs $feesPending',
                  AppColors.softPink,
                  AppColors.pink,
                ),
                const SizedBox(height: 16),
              ],
              if (liveRows.isNotEmpty)
                ...liveRows.map((course) {
                  final remaining = course.topicsTotal - course.topicsDone;
                  return _courseCard(
                    title: course.title,
                    progress: course.progressPercent / 100,
                    subtitle:
                        '${course.topicsDone}/${course.topicsTotal} topics, $remaining remaining',
                    next: isTeacher
                        ? null
                        : (course.nextTopic ?? 'Course complete'),
                  );
                })
              else
                ...fallbackList.map((course) {
                  final remaining = course.topicsRemaining;
                  return _courseCard(
                    title: course.title,
                    progress: course.progressPercent / 100,
                    subtitle:
                        '${course.topicsDone}/${course.topicsTotal} topics, $remaining remaining, Attend ${course.attendancePercent.toStringAsFixed(0)}%',
                    next: isTeacher
                        ? null
                        : (course.nextTopic?.title ?? 'Course complete'),
                  );
                }),
            ],
          );
        },
      ),
    );
  }

  Widget _courseCard({
    required String title,
    required double progress,
    required String subtitle,
    String? next,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress.clamp(0, 1),
              minHeight: 8,
              backgroundColor: AppColors.line,
              color: AppColors.blue,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          if (next != null) ...[
            const SizedBox(height: 4),
            Text(
              'Next: $next',
              style: const TextStyle(
                color: AppColors.blue,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _statRow(String label, String value, Color soft, Color accent) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: soft,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Text(label, style: TextStyle(color: accent, fontWeight: FontWeight.w700)),
          const Spacer(),
          Text(value, style: TextStyle(color: accent, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}
