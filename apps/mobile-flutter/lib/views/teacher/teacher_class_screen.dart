import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_errors.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/teaching_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_loader.dart';

/// Teacher: course filter tabs + Students / Assignments + assign sheet.
class TeacherClassScreen extends StatefulWidget {
  const TeacherClassScreen({super.key});

  @override
  State<TeacherClassScreen> createState() => _TeacherClassScreenState();
}

class _TeacherClassScreenState extends State<TeacherClassScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _studentSearch = TextEditingController();
  final _assignmentSearch = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _tabs.addListener(() {
      if (_tabs.indexIsChanging) return;
      context.read<TeachingProvider>().setTabIndex(_tabs.index);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TeachingProvider>().load();
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    _studentSearch.dispose();
    _assignmentSearch.dispose();
    super.dispose();
  }

  String _shortCourseLabel(TeachingCourse c) {
    final batch = (c.batch ?? '').trim();
    if (batch.isNotEmpty) return batch;
    final title = c.title.trim();
    if (title.length <= 22) return title;
    return '${title.substring(0, 20)}…';
  }

  @override
  Widget build(BuildContext context) {
    final teaching = context.watch<TeachingProvider>();
    final courses = teaching.courses;
    final selected = teaching.selectedCourse;

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
        bottom: courses.isEmpty
            ? null
            : TabBar(
                controller: _tabs,
                labelColor: AppColors.blue,
                unselectedLabelColor: AppColors.muted,
                indicatorColor: AppColors.blue,
                tabs: [
                  Tab(
                    text:
                        'Students (${selected?.students.length ?? 0})',
                  ),
                  Tab(
                    text:
                        'Assignments (${teaching.filteredAssignments.length})',
                  ),
                ],
              ),
      ),
      floatingActionButton: selected == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openAssign(selected),
              backgroundColor: AppColors.blue,
              icon: const Icon(Icons.edit_note_rounded),
              label: const Text('New assignment'),
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
              : Column(
                  children: [
                    _CourseFilterBar(
                      courses: courses,
                      selectedId: selected?.id,
                      labelOf: _shortCourseLabel,
                      onSelect: teaching.selectCourse,
                    ),
                    Expanded(
                      child: TabBarView(
                        controller: _tabs,
                        children: [
                          _StudentsTab(
                            searchController: _studentSearch,
                            students: teaching.filteredStudents,
                            course: selected!,
                            onSearch: teaching.setStudentQuery,
                            onAssignOne: (id) =>
                                _openAssign(selected, preselect: [id]),
                          ),
                          _AssignmentsTab(
                            searchController: _assignmentSearch,
                            tasks: teaching.filteredAssignments,
                            onSearch: teaching.setAssignmentQuery,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }

  Future<void> _openAssign(
    TeachingCourse course, {
    List<String>? preselect,
  }) async {
    final result = await showModalBottomSheet<_AssignSheetResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _AssignTaskSheet(
        course: course,
        preselect: preselect,
      ),
    );

    if (result == null || !mounted) return;

    final ui = context.read<UiProvider>();
    final teaching = context.read<TeachingProvider>();
    try {
      final count = await teaching.assignTask(
        courseId: course.id,
        title: result.title,
        description: result.description,
        assigneeIds: result.assigneeIds,
      );
      if (!mounted) return;
      teaching.setTabIndex(1);
      if (_tabs.index != 1) _tabs.animateTo(1);
      ui.showSnack(
        'Assigned to $count student${count == 1 ? '' : 's'}',
        tone: AppSnackTone.success,
      );
    } catch (e) {
      if (!mounted) return;
      ui.showSnack(ApiErrors.friendly(e), tone: AppSnackTone.error);
    }
  }
}

class _AssignSheetResult {
  final String title;
  final String description;
  /// null = whole batch
  final List<String>? assigneeIds;

  const _AssignSheetResult({
    required this.title,
    required this.description,
    required this.assigneeIds,
  });
}

/// Owns its Text controllers so they are never used after dispose.
class _AssignTaskSheet extends StatefulWidget {
  final TeachingCourse course;
  final List<String>? preselect;

  const _AssignTaskSheet({
    required this.course,
    this.preselect,
  });

  @override
  State<_AssignTaskSheet> createState() => _AssignTaskSheetState();
}

class _AssignTaskSheetState extends State<_AssignTaskSheet> {
  late final TextEditingController _titleCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _filterCtrl;
  late final Set<String> _selectedIds;
  late bool _assignAll;

  @override
  void initState() {
    super.initState();
    _titleCtrl = TextEditingController();
    _descCtrl = TextEditingController();
    _filterCtrl = TextEditingController();
    _selectedIds = {...?(widget.preselect)};
    _assignAll = widget.preselect == null || widget.preselect!.isEmpty;
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _filterCtrl.dispose();
    super.dispose();
  }

  InputDecoration _fieldDec(String hint) => InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: AppColors.bg,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      );

  void _submit() {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;
    if (!_assignAll && _selectedIds.isEmpty) return;
    Navigator.pop(
      context,
      _AssignSheetResult(
        title: title,
        description: _descCtrl.text.trim(),
        assigneeIds: _assignAll ? null : _selectedIds.toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final course = widget.course;
    final q = _filterCtrl.text.trim().toLowerCase();
    final visible = course.students.where((s) {
      if (q.isEmpty) return true;
      return s.name.toLowerCase().contains(q) ||
          (s.batch ?? '').toLowerCase().contains(q);
    }).toList();

    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        12,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: AppColors.line,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const Text(
              'Write & assign',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
            ),
            const SizedBox(height: 4),
            Text(
              course.batch?.isNotEmpty == true
                  ? '${course.title} · ${course.batch}'
                  : course.title,
              style: const TextStyle(color: AppColors.muted, fontSize: 13),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _titleCtrl,
              textCapitalization: TextCapitalization.sentences,
              decoration: _fieldDec('Assignment title *'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _descCtrl,
              maxLines: 4,
              textCapitalization: TextCapitalization.sentences,
              decoration: _fieldDec('Instructions — what should they do?'),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.softBlue,
                borderRadius: BorderRadius.circular(12),
              ),
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'Entire batch',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(
                  _assignAll
                      ? 'All ${course.students.length} students'
                      : 'Pick individuals below',
                  style: const TextStyle(fontSize: 12),
                ),
                value: _assignAll,
                activeThumbColor: AppColors.blue,
                onChanged: (v) => setState(() {
                  _assignAll = v;
                  if (v) _selectedIds.clear();
                }),
              ),
            ),
            if (!_assignAll) ...[
              const SizedBox(height: 10),
              TextField(
                controller: _filterCtrl,
                onChanged: (_) => setState(() {}),
                decoration: _fieldDec('Filter students…'),
              ),
              const SizedBox(height: 6),
              ...visible.map(
                (s) => CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  value: _selectedIds.contains(s.id),
                  title: Text(s.name,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                    [s.batch, s.accountType]
                        .whereType<String>()
                        .where((e) => e.isNotEmpty)
                        .join(' · '),
                    style: const TextStyle(fontSize: 12),
                  ),
                  onChanged: (v) => setState(() {
                    if (v == true) {
                      _selectedIds.add(s.id);
                    } else {
                      _selectedIds.remove(s.id);
                    }
                  }),
                ),
              ),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.blue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  _assignAll
                      ? 'Assign to whole batch'
                      : 'Assign to ${_selectedIds.length} student${_selectedIds.length == 1 ? '' : 's'}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CourseFilterBar extends StatelessWidget {
  final List<TeachingCourse> courses;
  final String? selectedId;
  final String Function(TeachingCourse) labelOf;
  final ValueChanged<String> onSelect;

  const _CourseFilterBar({
    required this.courses,
    required this.selectedId,
    required this.labelOf,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      color: AppColors.bg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'BATCH / COURSE',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: AppColors.muted,
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final c in courses) ...[
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      selected: c.id == selectedId,
                      showCheckmark: false,
                      label: Text(
                        labelOf(c),
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: c.id == selectedId
                              ? Colors.white
                              : AppColors.ink,
                        ),
                      ),
                      selectedColor: AppColors.blue,
                      backgroundColor: Colors.white,
                      side: BorderSide(
                        color: c.id == selectedId
                            ? AppColors.blue
                            : AppColors.line,
                      ),
                      onSelected: (_) => onSelect(c.id),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (courses.any((c) => c.id == selectedId))
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                courses.firstWhere((c) => c.id == selectedId).title,
                style: const TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }
}

class _StudentsTab extends StatelessWidget {
  final TextEditingController searchController;
  final List<TeachingStudent> students;
  final TeachingCourse course;
  final ValueChanged<String> onSearch;
  final ValueChanged<String> onAssignOne;

  const _StudentsTab({
    required this.searchController,
    required this.students,
    required this.course,
    required this.onSearch,
    required this.onAssignOne,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      children: [
        TextField(
          controller: searchController,
          onChanged: onSearch,
          decoration: InputDecoration(
            hintText: 'Filter students by name…',
            prefixIcon: const Icon(Icons.search_rounded, size: 20),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        const SizedBox(height: 12),
        if (students.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text(
              'No students match this filter',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.muted),
            ),
          ),
        ...students.map(
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
                    s.name.isNotEmpty ? s.name[0].toUpperCase() : '?',
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
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text(
                        [
                          s.batch,
                          s.accountType,
                        ].whereType<String>().where((e) => e.isNotEmpty).join(' · '),
                        style: const TextStyle(
                            color: AppColors.muted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => onAssignOne(s.id),
                  child: const Text('Assign'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _AssignmentsTab extends StatelessWidget {
  final TextEditingController searchController;
  final List<AssignedStudentTask> tasks;
  final ValueChanged<String> onSearch;

  const _AssignmentsTab({
    required this.searchController,
    required this.tasks,
    required this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      children: [
        TextField(
          controller: searchController,
          onChanged: onSearch,
          decoration: InputDecoration(
            hintText: 'Filter by title or student…',
            prefixIcon: const Icon(Icons.search_rounded, size: 20),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        const SizedBox(height: 12),
        if (tasks.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text(
              'No assignments yet — tap New assignment',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.muted),
            ),
          ),
        ...tasks.map((t) {
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
                          style: const TextStyle(fontWeight: FontWeight.w800)),
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
                  style:
                      const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                if (t.isSubmitted && !t.isDone) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      TextButton(
                        onPressed: () async {
                          await context.read<TeachingProvider>().reviewTask(
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
                          await context.read<TeachingProvider>().reviewTask(
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
    );
  }
}
