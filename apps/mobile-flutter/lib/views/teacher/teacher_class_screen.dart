import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_errors.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/teaching_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_loader.dart';

/// Teacher view: own courses → students → assign & track tasks.
class TeacherClassScreen extends StatefulWidget {
  const TeacherClassScreen({super.key});

  @override
  State<TeacherClassScreen> createState() => _TeacherClassScreenState();
}

class _TeacherClassScreenState extends State<TeacherClassScreen> {
  String? _courseId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TeachingProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final teaching = context.watch<TeachingProvider>();
    final courses = teaching.courses;
    final selected = _courseId == null
        ? (courses.isNotEmpty ? courses.first : null)
        : teaching.courseById(_courseId!);
    final courseId = selected?.id;
    final assigned = teaching.assigned
        .where((t) => courseId == null || t.courseId == courseId)
        .toList();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('My classes'),
        backgroundColor: AppColors.bg,
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: teaching.loading ? null : () => teaching.load(),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      floatingActionButton: selected == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openAssign(context, selected),
              backgroundColor: AppColors.blue,
              icon: const Icon(Icons.assignment_outlined),
              label: const Text('Assign task'),
            ),
      body: teaching.loading && courses.isEmpty
          ? const Center(child: AppLoader())
          : courses.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'No courses assigned to you yet.\nAdmin must set you as course instructor.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.muted, height: 1.4),
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  children: [
                    SizedBox(
                      height: 40,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: courses.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (_, i) {
                          final c = courses[i];
                          final active = c.id == selected?.id;
                          return ChoiceChip(
                            label: Text(
                              c.batch?.isNotEmpty == true
                                  ? '${c.title} · ${c.batch}'
                                  : c.title,
                            ),
                            selected: active,
                            onSelected: (_) =>
                                setState(() => _courseId = c.id),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      '${selected?.students.length ?? 0} students',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...(selected?.students ?? const []).map(
                      (s) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: AppColors.softBlue,
                              child: Text(
                                s.name.isNotEmpty
                                    ? s.name[0].toUpperCase()
                                    : '?',
                                style: const TextStyle(
                                  color: AppColors.blue,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(s.name,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700)),
                                  Text(
                                    [
                                      s.batch,
                                      s.accountType,
                                    ].where((e) => e != null && e.isNotEmpty).join(' · '),
                                    style: const TextStyle(
                                        color: AppColors.muted, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () => _openAssign(
                                context,
                                selected!,
                                preselect: [s.id],
                              ),
                              child: const Text('Assign'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Assignments',
                      style:
                          TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    if (assigned.isEmpty)
                      const Text('No assignments yet',
                          style: TextStyle(color: AppColors.muted)),
                    ...assigned.map((t) {
                      final statusLabel = t.isDone
                          ? 'Done'
                          : t.isSubmitted
                              ? 'Submitted'
                              : t.status;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(t.title,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w800)),
                                ),
                                Text(
                                  statusLabel,
                                  style: const TextStyle(
                                    color: AppColors.blue,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              t.assignedToName ?? 'Student',
                              style: const TextStyle(
                                  color: AppColors.muted, fontSize: 13),
                            ),
                            if (t.isSubmitted && !t.isDone) ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  TextButton(
                                    onPressed: () async {
                                      await context
                                          .read<TeachingProvider>()
                                          .reviewTask(
                                            taskId: t.id,
                                            reviewStatus: 'APPROVED',
                                          );
                                      if (!context.mounted) return;
                                      context.read<UiProvider>().showSnack(
                                            'Marked done',
                                            tone: AppSnackTone.success,
                                          );
                                    },
                                    child: const Text('Approve'),
                                  ),
                                  TextButton(
                                    onPressed: () async {
                                      await context
                                          .read<TeachingProvider>()
                                          .reviewTask(
                                            taskId: t.id,
                                            reviewStatus: 'REVISION_REQUESTED',
                                            feedback: 'Please revise',
                                          );
                                    },
                                    child: const Text('Ask revision'),
                                  ),
                                ],
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

  Future<void> _openAssign(
    BuildContext context,
    TeachingCourse course, {
    List<String>? preselect,
  }) async {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final selected = <String>{...(preselect ?? const [])};
    final wholeBatch = preselect == null || preselect.isEmpty;

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        var assignAll = wholeBatch;
        return StatefulBuilder(
          builder: (ctx, setModal) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                16,
                20,
                20 + MediaQuery.viewInsetsOf(ctx).bottom,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Assign · ${course.title}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: titleCtrl,
                      decoration: const InputDecoration(
                        hintText: 'Task title',
                        filled: true,
                        fillColor: AppColors.bg,
                        border: OutlineInputBorder(
                          borderSide: BorderSide.none,
                          borderRadius: BorderRadius.all(Radius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: descCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText: 'Instructions (optional)',
                        filled: true,
                        fillColor: AppColors.bg,
                        border: OutlineInputBorder(
                          borderSide: BorderSide.none,
                          borderRadius: BorderRadius.all(Radius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Whole batch / course'),
                      value: assignAll,
                      onChanged: (v) => setModal(() {
                        assignAll = v;
                        if (v) selected.clear();
                      }),
                    ),
                    if (!assignAll)
                      ...course.students.map(
                        (s) => CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          value: selected.contains(s.id),
                          title: Text(s.name),
                          onChanged: (v) => setModal(() {
                            if (v == true) {
                              selected.add(s.id);
                            } else {
                              selected.remove(s.id);
                            }
                          }),
                        ),
                      ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () {
                          if (titleCtrl.text.trim().isEmpty) return;
                          if (!assignAll && selected.isEmpty) return;
                          Navigator.pop(ctx, true);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.blue,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Send assignment'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (ok != true || !context.mounted) {
      titleCtrl.dispose();
      descCtrl.dispose();
      return;
    }

    final ui = context.read<UiProvider>();
    try {
      final count = await context.read<TeachingProvider>().assignTask(
            courseId: course.id,
            title: titleCtrl.text,
            description: descCtrl.text,
            assigneeIds: selected.isEmpty ? null : selected.toList(),
          );
      if (!context.mounted) return;
      ui.showSnack(
        'Assigned to $count student${count == 1 ? '' : 's'}',
        tone: AppSnackTone.success,
      );
    } catch (e) {
      if (!context.mounted) return;
      ui.showSnack(ApiErrors.friendly(e), tone: AppSnackTone.error);
    } finally {
      titleCtrl.dispose();
      descCtrl.dispose();
    }
  }
}
