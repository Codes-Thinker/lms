import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/api_errors.dart' show ApiErrors;
import '../../models/course.dart';
import '../../models/fee_payment.dart';
import '../../providers/course_provider.dart';
import '../../providers/fee_provider.dart';
import '../../providers/ui_provider.dart';
import '../../services/api_client.dart';
import '../../widgets/app_loader.dart';
import '../../widgets/course_cover.dart';
import '../../widgets/live_countdown.dart';
import '../help/admin_chat_screen.dart';

class CourseDetailScreen extends StatefulWidget {
  final String courseId;

  const CourseDetailScreen({super.key, required this.courseId});

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CourseProvider>().fetchEnrolledCourses();
      context.read<FeeProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final courses = context.watch<CourseProvider>();
    final matches = courses.courses.where((c) => c.id == widget.courseId);
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
  final Course course;
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
          '${course.topicsDone}/${course.topicsTotal} lectures, ${course.topicsRemaining} remaining',
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
        if ((course.instructorName ?? '').isNotEmpty ||
            course.batch.isNotEmpty) ...[
          Row(
            children: [
              if ((course.instructorName ?? '').isNotEmpty)
                Expanded(
                  child: _infoCard(
                    'Instructor',
                    course.instructorName!,
                    subtitle: course.instructorExperience,
                  ),
                ),
              if ((course.instructorName ?? '').isNotEmpty &&
                  course.batch.isNotEmpty)
                const SizedBox(width: 8),
              if (course.batch.isNotEmpty)
                Expanded(
                  child: _infoCard('Batch', course.batch),
                ),
            ],
          ),
          const SizedBox(height: 10),
        ],
        Row(
          children: [
            _chip('Monthly', 'Rs ${course.monthlyFee}'),
            const SizedBox(width: 8),
            _chip(course.paymentPlanLabel, 'Rs ${course.installmentFee}'),
            const SizedBox(width: 8),
            _chip('Total fee', 'Rs ${course.totalFee}'),
          ],
        ),
        if (course.paymentType == 'TWO_INSTALLMENTS' &&
            (course.installment1Amount != null ||
                course.installment2Amount != null)) ...[
          const SizedBox(height: 10),
          Row(
            children: [
              _chip(
                'Installment 1',
                'Rs ${course.installment1Amount ?? course.installmentFee}',
              ),
              const SizedBox(width: 8),
              _chip(
                'Installment 2',
                'Rs ${course.installment2Amount ?? course.installmentFee}',
              ),
              const SizedBox(width: 8),
              const Expanded(child: SizedBox()),
            ],
          ),
        ],
        const SizedBox(height: 10),
        Row(
          children: [
            _chip('Paid', 'Rs ${course.paidAmount}'),
            const SizedBox(width: 8),
            _chip('Remaining', 'Rs ${course.remainingBalance}'),
            const SizedBox(width: 8),
            _chip('Status', course.feeStatusLabel),
          ],
        ),
        const SizedBox(height: 16),
        const Text('Payment history',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Consumer<FeeProvider>(
          builder: (context, fees, _) {
            final history = fees.cases
                .where((c) => c.courseId == course.id)
                .toList();
            if (history.isEmpty) {
              return Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Text(
                  'No payment records yet.',
                  style: TextStyle(color: AppColors.muted),
                ),
              );
            }
            return Column(
              children: history
                  .map((c) => _paymentHistoryTile(c))
                  .toList(),
            );
          },
        ),
        const SizedBox(height: 20),
        const Text('Lectures',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        ...course.outline.map<Widget>((section) {
          return ExpansionTile(
            initiallyExpanded: true,
            tilePadding: EdgeInsets.zero,
            title: Text(section.title,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            children: section.topics.map<Widget>((topic) {
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
                        onPressed: () async {
                          try {
                            await courses.markTopicComplete(
                                course.id, topic.id);
                          } catch (e) {
                            if (!context.mounted) return;
                            context.read<UiProvider>().showSnack(
                                  ApiErrors.friendly(e),
                                  tone: AppSnackTone.error,
                                );
                          }
                        },
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

  Widget _infoCard(String label, String value, {String? subtitle}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(color: AppColors.muted, fontSize: 11)),
          const SizedBox(height: 4),
          Text(value,
              style:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          if ((subtitle ?? '').isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(subtitle!,
                style: const TextStyle(color: AppColors.muted, fontSize: 11)),
          ],
        ],
      ),
    );
  }

  Widget _paymentHistoryTile(FeePaymentCase c) {
    final paid = c.status == 'APPROVED' || c.status == 'PAID';
    final statusLabel = paid
        ? 'Paid'
        : c.status == 'SENT'
            ? 'Under review'
            : c.status == 'REJECTED'
                ? 'Rejected'
                : 'Pending';
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(c.month,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  c.dueDate == null || c.dueDate!.isEmpty
                      ? 'Due amount Rs ${c.amount}'
                      : 'Due ${c.dueDate} · Rs ${c.amount}',
                  style:
                      const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                if (c.amountPaid > 0)
                  Text('Verified paid Rs ${c.amountPaid}',
                      style: const TextStyle(
                          color: AppColors.green, fontSize: 12)),
              ],
            ),
          ),
          Text(statusLabel,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: paid
                    ? AppColors.green
                    : c.status == 'REJECTED'
                        ? Colors.redAccent
                        : AppColors.blue,
              )),
        ],
      ),
    );
  }
}

/// Limited public info — enrollment requires admin approval.
class _NonEnrolledContent extends StatefulWidget {
  final Course course;

  const _NonEnrolledContent({required this.course});

  @override
  State<_NonEnrolledContent> createState() => _NonEnrolledContentState();
}

class _NonEnrolledContentState extends State<_NonEnrolledContent> {
  bool _busy = false;

  Future<void> _requestEnrollment() async {
    setState(() => _busy = true);
    try {
      await ApiClient.instance.post(
        '/courses/${widget.course.id}/enroll',
        body: {
          'note': 'Please enroll me in ${widget.course.title}',
        },
      );
      if (!mounted) return;
      context.read<UiProvider>().showSnack(
            'Request sent. Waiting for admin approval.',
          );
      await context.read<CourseProvider>().fetchEnrolledCourses();
    } catch (e) {
      if (!mounted) return;
      context.read<UiProvider>().showSnack(ApiErrors.friendly(e));
    }
    if (mounted) setState(() => _busy = false);
  }

  void _openAdminChat() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AdminChatScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.course;
    final bottom = MediaQuery.paddingOf(context).bottom;
    final pending = c.requestPending;
    final rejected = c.requestRejected;
    final canRequest = c.allowEnrollmentRequests && !pending;

    String lockTitle;
    String lockBody;
    if (pending) {
      lockTitle = 'Request pending';
      lockBody =
          'Your enrollment request is with the admin. You will get access once it is approved.';
    } else if (rejected) {
      lockTitle = 'Request rejected';
      lockBody =
          'Your last enrollment request was rejected. Contact the admin via chat for help.';
    } else if (!c.allowEnrollmentRequests) {
      lockTitle = 'Direct enrollment unavailable';
      lockBody =
          'This course does not accept self-enrollment. Please contact the admin through in-app chat to request enrollment.';
    } else {
      lockTitle = 'Admin approval required';
      lockBody =
          'Submit an enrollment request. An admin must Accept it before you can access lessons.';
    }

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
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
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
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.softBlue,
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                c.enrollmentStatus.replaceAll('_', ' '),
                style: const TextStyle(
                    color: AppColors.blue,
                    fontSize: 11,
                    fontWeight: FontWeight.w700),
              ),
            ),
          ],
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
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.softBlue,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              Icon(
                pending
                    ? Icons.hourglass_top_rounded
                    : rejected
                        ? Icons.block_rounded
                        : Icons.lock_outline_rounded,
                size: 36,
                color: AppColors.blue,
              ),
              const SizedBox(height: 8),
              Text(
                lockTitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: AppColors.ink),
              ),
              const SizedBox(height: 4),
              Text(
                lockBody,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: AppColors.muted, fontSize: 13, height: 1.4),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (canRequest)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _busy ? null : _requestEnrollment,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _busy
                  ? const AppLoader(size: 22, color: Colors.white)
                  : const Text('Request enrollment',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
        if (canRequest) const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _openAdminChat,
            icon: const Icon(Icons.chat_bubble_outline_rounded),
            label: const Text('Contact admin via chat',
                style: TextStyle(fontWeight: FontWeight.w700)),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
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
