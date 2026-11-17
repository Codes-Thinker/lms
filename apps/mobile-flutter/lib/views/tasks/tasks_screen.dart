import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
import '../../models/task.dart';
import '../../providers/auth_provider.dart';
import '../../providers/task_provider.dart';
import '../../widgets/app_loader.dart';
import 'task_detail_screen.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final tasks = context.watch<TaskProvider>();
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
            : 'My Tasks';

    final subtitle = auth.isStaff
        ? '${tasks.openCountFor(userId)} open, lecture batches + development work'
        : auth.isIntern
            ? '${tasks.openCountFor(userId)} open, internship projects'
            : '${tasks.openCountFor(userId)} open, assigned by admin';

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: 'Filter',
            onPressed: () {
              // Soft feedback — list already shows all assigned items.
              ScaffoldMessenger.maybeOf(context)?.hideCurrentSnackBar();
            },
            icon: Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.line),
              ),
              child: const Icon(
                Icons.filter_list_rounded,
                size: 18,
                color: AppColors.muted,
              ),
            ),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: tasks.loading
          ? const Center(child: AppLoader())
          : ListView(
              padding: EdgeInsets.fromLTRB(pad, 8, pad, bottom),
              children: [
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (auth.isStaff) ...[
                  const SizedBox(height: 6),
                  const Text(
                    'Teach your students in class, then complete development / mentor tasks here.',
                    style: TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                      height: 1.35,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                if (mine.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 48),
                    child: Center(
                      child: Text(
                        'No tasks assigned yet',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    ),
                  )
                else
                  ...mine.map(
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
    final done = task.status == 'DONE';
    final minutes = (task.spentSeconds / 60).floor();
    final chatCount = task.chat.length;
    final statusLabel = done
        ? 'DONE'
        : task.status == 'IN_PROGRESS'
            ? 'IN PROGRESS'
            : 'OPEN';
    final statusBg = done
        ? const Color(0xFFECFDF5)
        : task.status == 'IN_PROGRESS'
            ? AppColors.softBlue
            : const Color(0xFFF3F4F6);
    final statusFg = done
        ? const Color(0xFF059669)
        : task.status == 'IN_PROGRESS'
            ? AppColors.blueDark
            : AppColors.muted;

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
                  const SizedBox(width: 6),
                  const Icon(
                    CupertinoIcons.chevron_forward,
                    color: AppColors.muted,
                    size: 18,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _Chip(
                    icon: done
                        ? Icons.check_circle_rounded
                        : Icons.radio_button_checked,
                    label: statusLabel,
                    bg: statusBg,
                    fg: statusFg,
                  ),
                  _Chip(
                    icon: Icons.schedule_rounded,
                    label: '${minutes}m worked',
                    bg: const Color(0xFFF3F4F6),
                    fg: AppColors.muted,
                  ),
                  _Chip(
                    icon: Icons.chat_bubble_outline_rounded,
                    label: '$chatCount chat',
                    bg: const Color(0xFFF3F4F6),
                    fg: AppColors.muted,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color bg;
  final Color fg;

  const _Chip({
    required this.icon,
    required this.label,
    required this.bg,
    required this.fg,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
