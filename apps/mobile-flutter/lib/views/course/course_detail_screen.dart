import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/course_provider.dart';
import '../../widgets/app_loader.dart';
import '../../widgets/course_cover.dart';
import '../../widgets/live_countdown.dart';

class CourseDetailScreen extends StatelessWidget {
  final String courseId;

  const CourseDetailScreen({super.key, required this.courseId});

  @override
  Widget build(BuildContext context) {
    final courses = context.watch<CourseProvider>();
    final matches = courses.courses.where((c) => c.id == courseId);
    final course = matches.isEmpty ? null : matches.first;

    if (course == null) {
      return const Scaffold(body: Center(child: AppLoader()));
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: Text(course.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        backgroundColor: AppColors.bg,
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          20 + MediaQuery.paddingOf(context).bottom,
        ),
        children: [
          CourseCover(
            url: course.thumbnailUrl,
            title: course.title,
            height: 180,
          ),
          const SizedBox(height: 14),
          if (course.description.isNotEmpty) ...[
            Text(
              course.description,
              style: const TextStyle(color: AppColors.muted, height: 1.45),
            ),
            const SizedBox(height: 14),
          ],
          if (course.nextClassAt != null)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.softBlue,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Expanded(
                    child: Text('Class starts in', style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                  LiveCountdown(
                    target: course.nextClassAt!,
                    style: const TextStyle(
                      color: AppColors.blue,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          Text(
            '${course.topicsDone}/${course.topicsTotal} lectures · ${course.topicsRemaining} remaining',
            style: const TextStyle(color: AppColors.muted),
          ),
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
          const SizedBox(height: 16),
          Row(
            children: [
              _chip('Monthly', 'Rs ${course.monthlyFee}'),
              const SizedBox(width: 8),
              _chip(
                '${course.installmentCount}× inst.',
                'Rs ${course.installmentFee}',
              ),
              const SizedBox(width: 8),
              _chip('Complete', 'Rs ${course.totalFee}'),
            ],
          ),
          const SizedBox(height: 20),
          const Text(
            'Roadmap',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          ...course.outline.map((section) {
            return ExpansionTile(
              initiallyExpanded: true,
              tilePadding: EdgeInsets.zero,
              title: Text(section.title, style: const TextStyle(fontWeight: FontWeight.w700)),
              children: section.topics.map((topic) {
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    topic.completed ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: topic.completed ? AppColors.green : AppColors.muted,
                  ),
                  title: Text(topic.title),
                  subtitle: Text('${topic.minutes} min'),
                  trailing: topic.completed
                      ? null
                      : TextButton(
                          onPressed: () => courses.markTopicComplete(course.id, topic.id),
                          child: const Text('Done'),
                        ),
                );
              }).toList(),
            );
          }),
        ],
      ),
    );
  }

  Widget _chip(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.muted, fontSize: 11),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
