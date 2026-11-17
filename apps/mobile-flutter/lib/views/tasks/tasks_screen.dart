import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
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
                const SizedBox(height: 12),
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
                  ...List.generate(mine.length, (i) {
                    final task = mine[i];
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
                              crossAxisAlignment: CrossAxisAlignment.start,
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
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 15,
                                          color: AppColors.ink,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${task.courseTitle}, by ${task.assignedBy}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          color: AppColors.muted,
                                          fontSize: 12,
                                        ),
                                      ),
                                      if (auth.isTeacher) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          'Assigned to ${task.assignedToName}',
                                          style: const TextStyle(
                                            color: AppColors.blue,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                      const SizedBox(height: 6),
                                      Text(
                                        '${task.status}, ${(task.spentSeconds / 60).floor()}m worked, ${task.chat.length} chat',
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
                        if (i < mine.length - 1)
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
    );
  }
}
