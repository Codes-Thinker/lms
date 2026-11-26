import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
import '../../models/task.dart';
import '../../providers/auth_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/task_provider.dart';
import '../../widgets/app_loader.dart';
import 'task_detail_screen.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  /// all | pending | completed
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final tasks = context.watch<TaskProvider>();
    final projects = context.watch<ProjectProvider>();
    final userId = auth.user?.id ?? '';
    final mine = tasks.tasksForUser(userId);
    final pad = AppResponsive.pagePad(context);
    final pushed = ModalRoute.of(context)?.canPop ?? false;
    final bottom = pushed
        ? AppResponsive.pageBottom(context)
        : AppResponsive.shellBottom(context);

    final title = auth.isIntern
        ? 'My Projects'
        : auth.isStaff
            ? 'Teacher / Staff'
            : 'Assignments';

    final total = mine.length;
    final completed = tasks.completedCountFor(userId);
    final pending = tasks.pendingCountFor(userId) +
        tasks.inProgressCountFor(userId);
    final progress = tasks.progressPercentFor(userId);
    final lateCount = tasks.lateCountFor(userId);

    final filtered = mine.where((t) {
      if (_filter == 'pending') {
        return t.status != 'DONE' && t.status != 'REVIEWED';
      }
      if (_filter == 'completed') {
        return t.status == 'DONE' || t.status == 'REVIEWED';
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        centerTitle: true,
      ),
      body: tasks.loading && mine.isEmpty && projects.projects.isEmpty
          ? const Center(child: AppLoader())
          : RefreshIndicator(
              color: AppColors.blue,
              onRefresh: () async {
                await Future.wait([
                  context.read<TaskProvider>().load(),
                  if (auth.isIntern) context.read<ProjectProvider>().load(),
                ]);
              },
              child: ListView(
                padding: EdgeInsets.fromLTRB(pad, 8, pad, bottom),
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  if (auth.isStudent) ...[
                    _assignmentOverview(
                      total: total,
                      pending: pending,
                      completed: completed,
                      progress: progress,
                      lateCount: lateCount,
                      submitted: tasks.submittedCountFor(userId),
                      reviewed: tasks.reviewedCountFor(userId),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        _filterChip('All', 'all'),
                        const SizedBox(width: 8),
                        _filterChip('Pending', 'pending'),
                        const SizedBox(width: 8),
                        _filterChip('Completed', 'completed'),
                      ],
                    ),
                    const SizedBox(height: 14),
                  ] else ...[
                    Text(
                      auth.isStaff
                          ? '${tasks.openCountFor(userId)} open, lecture batches + development work'
                          : '${tasks.openCountFor(userId)} open, internship projects',
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],
                  if (auth.isIntern && projects.projects.isNotEmpty) ...[
                    const Text(
                      'ASSIGNED PROJECTS',
                      style: TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...projects.projects.map(
                      (p) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.card,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.line),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                p.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                [
                                  p.status,
                                  if (p.startDate != null)
                                    'Start ${p.startDate!.toLocal().toString().split(' ').first}',
                                  if (p.deadline != null)
                                    'Due ${p.deadline!.toLocal().toString().split(' ').first}',
                                  '${p.progressPercent}%',
                                  if ((p.techStack ?? '').isNotEmpty)
                                    p.techStack!,
                                ].join(' · '),
                                style: const TextStyle(
                                  color: AppColors.muted,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (filtered.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 48),
                      child: Center(
                        child: Text(
                          'No assignments in this filter',
                          style: TextStyle(color: AppColors.muted),
                        ),
                      ),
                    )
                  else
                    ...filtered.map(
                      (task) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _TaskCard(
                          task: task,
                          showAssignee: auth.isTeacher,
                          onTap: () {
                            Navigator.of(context).push(
                              AppMotion.fadeSlide(
                                TaskDetailScreen(taskId: task.id),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _filterChip(String label, String value) {
    final selected = _filter == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _filter = value),
        child: AnimatedContainer(
          duration: AppMotion.fast,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFF1A1C2E) : Colors.white,
            borderRadius: BorderRadius.circular(100),
            border: Border.all(
              color: selected ? const Color(0xFF1A1C2E) : AppColors.line,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : AppColors.ink,
            ),
          ),
        ),
      ),
    );
  }

  Widget _assignmentOverview({
    required int total,
    required int pending,
    required int completed,
    required double progress,
    required int lateCount,
    required int submitted,
    required int reviewed,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'ASSIGNMENT OVERVIEW',
            style: TextStyle(
              color: AppColors.ink,
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _metric('Total', '$total'),
              _metric('Pending', '$pending'),
              _metric('Done', '$completed'),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: LinearProgressIndicator(
              value: (progress / 100).clamp(0.0, 1.0),
              minHeight: 8,
              backgroundColor: AppColors.line,
              color: AppColors.blue,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${progress.toStringAsFixed(0)}% complete'
            '${lateCount > 0 ? ' · $lateCount late' : ''}'
            '${submitted > 0 ? ' · $submitted submitted' : ''}'
            '${reviewed > 0 ? ' · $reviewed reviewed' : ''}',
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _metric(String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 18,
              color: AppColors.ink,
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  final AssignedTask task;
  final bool showAssignee;
  final VoidCallback onTap;

  const _TaskCard({
    required this.task,
    required this.showAssignee,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final done = task.status == 'DONE' || task.status == 'REVIEWED';
    final late = !done && task.dueAt.isBefore(DateTime.now());
    final minutes = (task.spentSeconds / 60).floor();
    final chatCount = task.chat.length;
    final statusLabel = done
        ? (task.status == 'REVIEWED' ? 'REVIEWED' : 'DONE')
        : task.status == 'SUBMITTED'
            ? 'SUBMITTED'
            : task.status == 'IN_PROGRESS'
                ? 'IN PROGRESS'
                : late
                    ? 'LATE'
                    : 'PENDING';
    final statusBg = done
        ? const Color(0xFFECFDF5)
        : late
            ? const Color(0xFFFEE2E2)
            : task.status == 'IN_PROGRESS' || task.status == 'SUBMITTED'
                ? AppColors.softBlue
                : const Color(0xFFF3F4F6);
    final statusFg = done
        ? const Color(0xFF059669)
        : late
            ? const Color(0xFFDC2626)
            : task.status == 'IN_PROGRESS' || task.status == 'SUBMITTED'
                ? AppColors.blueDark
                : AppColors.muted;

    final due =
        '${task.dueAt.year}-${task.dueAt.month.toString().padLeft(2, '0')}-${task.dueAt.day.toString().padLeft(2, '0')}';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    done
                        ? CupertinoIcons.checkmark_seal_fill
                        : CupertinoIcons.checkmark_seal,
                    color: AppColors.blue,
                    size: 24,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: AppColors.ink,
                            height: 1.25,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${task.courseTitle}, by ${task.assignedBy}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (showAssignee) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Assigned to ${task.assignedToName}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.blue,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusBg,
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(
                        color: statusFg,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'Due $due · ${minutes}m worked'
                '${chatCount > 0 ? ' · $chatCount messages' : ''}',
                style: const TextStyle(
                  color: AppColors.muted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
