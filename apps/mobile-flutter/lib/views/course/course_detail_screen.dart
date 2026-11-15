import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/ui_provider.dart';
import '../../services/api_client.dart';
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
      body: course.enrolled
          ? _EnrolledContent(course: course, courses: courses)
          : _NonEnrolledContent(course: course),
    );
  }
}

/// Full content for enrolled students — roadmap, lessons, progress, mark done.
class _EnrolledContent extends StatelessWidget {
  final dynamic course;
  final CourseProvider courses;

  const _EnrolledContent({required this.course, required this.courses});

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    return ListView(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottom),
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
                  child: Text('Class starts in',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                ),
                LiveCountdown(
                  target: course.nextClassAt!,
                  style: const TextStyle(
                      color: AppColors.blue, fontWeight: FontWeight.w800),
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
            _chip('${course.installmentCount}× inst.',
                'Rs ${course.installmentFee}'),
            const SizedBox(width: 8),
            _chip('Complete', 'Rs ${course.totalFee}'),
          ],
        ),
        const SizedBox(height: 20),
        const Text('Roadmap',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        ...course.outline.map((section) {
          return ExpansionTile(
            initiallyExpanded: true,
            tilePadding: EdgeInsets.zero,
            title: Text(section.title,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            children: section.topics.map((topic) {
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  topic.completed
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                  color: topic.completed ? AppColors.green : AppColors.muted,
                ),
                title: Text(topic.title),
                subtitle: Text('${topic.minutes} min'),
                trailing: topic.completed
                    ? null
                    : TextButton(
                        onPressed: () =>
                            courses.markTopicComplete(course.id, topic.id),
                        child: const Text('Done'),
                      ),
              );
            }).toList(),
          );
        }),
      ],
    );
  }

  Widget _chip(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(14)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.muted, fontSize: 11)),
            const SizedBox(height: 4),
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

/// Limited public info for non-enrolled students — no roadmap, locked content.
class _NonEnrolledContent extends StatefulWidget {
  final dynamic course;

  const _NonEnrolledContent({required this.course});

  @override
  State<_NonEnrolledContent> createState() => _NonEnrolledContentState();
}

class _NonEnrolledContentState extends State<_NonEnrolledContent> {
  bool _enrolling = false;

  Future<void> _enroll() async {
    setState(() => _enrolling = true);
    try {
      await ApiClient.instance.post('/courses/${widget.course.id}/enroll');
      if (!mounted) return;
      context
          .read<UiProvider>()
          .showSnack('Enrolled! Tap again to view full content.');
      context.read<CourseProvider>().fetchEnrolledCourses();
    } catch (e) {
      if (!mounted) return;
      context.read<UiProvider>().showSnack('Enrollment failed. Try again.');
    }
    setState(() => _enrolling = false);
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.course;
    final bottom = MediaQuery.paddingOf(context).bottom;
    return ListView(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottom),
      children: [
        CourseCover(url: c.thumbnailUrl, title: c.title, height: 200),
        const SizedBox(height: 16),
        Text(c.title,
            style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppColors.ink)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.bg,
            borderRadius: BorderRadius.circular(100),
          ),
          child: Text(c.category,
              style: const TextStyle(
                  color: AppColors.muted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ),
        const SizedBox(height: 14),
        if (c.description.isNotEmpty)
          Text(c.description,
              style: const TextStyle(color: AppColors.muted, height: 1.45)),
        const SizedBox(height: 20),
        Row(
          children: [
            _infoBox('Duration', '${c.durationMonths} months'),
            const SizedBox(width: 8),
            _infoBox('Monthly Fee', 'Rs ${c.monthlyFee}'),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _infoBox('Total Fee', 'Rs ${c.totalFee}'),
            const SizedBox(width: 8),
            _infoBox('Installments',
                '${c.installmentCount}× Rs ${c.installmentFee}'),
          ],
        ),
        const SizedBox(height: 28),
        // Locked content indicator
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.softBlue,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              const Icon(Icons.lock_outline_rounded,
                  size: 36, color: AppColors.blue),
              const SizedBox(height: 8),
              const Text(
                'Course content is locked',
                style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: AppColors.ink),
              ),
              const SizedBox(height: 4),
              const Text(
                'Enroll in this course to access the full roadmap, lessons, assignments, and learning materials.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: AppColors.muted, fontSize: 13, height: 1.4),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _enrolling ? null : _enroll,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: _enrolling
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Text('Enroll Now',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }

  Widget _infoBox(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(14)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(color: AppColors.muted, fontSize: 11)),
            const SizedBox(height: 4),
            Text(value,
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}
