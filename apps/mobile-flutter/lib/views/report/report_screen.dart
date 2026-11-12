import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/responsive.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';

class ReportScreen extends StatelessWidget {
  const ReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isTeacher = context.watch<AuthProvider>().isTeacher;
    final courses = context.watch<CourseProvider>();
    final list = isTeacher ? courses.courses : courses.enrolledCourses;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: Text(isTeacher ? 'Batch Report' : 'Course Report'),
        backgroundColor: AppColors.bg,
      ),
      body: ListView(
        padding: AppResponsive.pageInsets(context, top: 8),
        children: [
          if (!isTeacher) ...[
            _statRow(
              'Attendance',
              '${courses.overallAttendance.toStringAsFixed(0)}%',
              AppColors.softGreen,
              AppColors.green,
            ),
            const SizedBox(height: 10),
            _statRow(
              'Fees pending',
              'Rs ${courses.totalFeeDue}',
              AppColors.softPink,
              AppColors.pink,
            ),
            const SizedBox(height: 16),
          ],
          ...list.map((course) {
            final remaining = course.topicsRemaining;
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
                  Text(course.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: course.progressPercent / 100,
                      minHeight: 8,
                      backgroundColor: AppColors.line,
                      color: AppColors.blue,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${course.topicsDone}/${course.topicsTotal} topics · $remaining remaining · Attend ${course.attendancePercent.toStringAsFixed(0)}%',
                    style: const TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                  if (!isTeacher) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Next: ${course.nextTopic?.title ?? 'Course complete'}',
                      style: const TextStyle(color: AppColors.blue, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ],
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _statRow(String label, String value, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w600)),
          const Spacer(),
          Text(value, style: TextStyle(color: fg, fontWeight: FontWeight.w800, fontSize: 18)),
        ],
      ),
    );
  }
}
