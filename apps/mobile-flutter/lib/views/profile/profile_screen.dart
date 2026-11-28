import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/fee_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/ui_provider.dart';
import '../../services/avatar_service.dart';
import '../../services/office_location_service.dart';
import '../../services/push_notification_service.dart';
import '../../widgets/unread_count_badge.dart';
import '../ai/ai_coach_screen.dart';
import '../auth/login_screen.dart';
import '../certificates/certificates_screen.dart';
import '../attendance/attendance_screen.dart';
import '../fees/fees_screen.dart';
import '../help/admin_chat_screen.dart';
import '../help/complain_screen.dart';
import '../help/report_issue_screen.dart';
import '../help/survey_screen.dart';
import '../leave/leave_screen.dart';
import '../quizzes/quizzes_screen.dart';
import '../report/report_screen.dart';
import '../../providers/leave_provider.dart';

/// Profile — AppColors only, consistent spacing & alignment with Home.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<void> _pickPhoto(BuildContext context, ImageSource source) async {
    final auth = context.read<AuthProvider>();
    final ui = context.read<UiProvider>();
    try {
      final path =
          await AvatarService.pickAndCrop(source: source, context: context);
      if (path == null) return;
      ui.showLoading();
      try {
        await auth.setAvatarPath(path);
        if (!context.mounted) return;
        ui.showSnack('Profile photo updated', tone: AppSnackTone.success);
      } finally {
        ui.hideLoading();
      }
    } catch (_) {
      if (!context.mounted) return;
      ui.showSnack(
        'Could not save photo. Try a smaller image.',
        tone: AppSnackTone.error,
      );
    }
  }

  Future<void> _showPhotoSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 10, 8, 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.line,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                const SizedBox(height: 8),
                ListTile(
                  leading: const Icon(
                    CupertinoIcons.photo,
                    color: AppColors.blue,
                  ),
                  title: const Text('Gallery'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickPhoto(context, ImageSource.gallery);
                  },
                ),
                ListTile(
                  leading: const Icon(
                    CupertinoIcons.camera,
                    color: AppColors.blue,
                  ),
                  title: const Text('Camera'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickPhoto(context, ImageSource.camera);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _deleteAccount(BuildContext context) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.line,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Delete account?',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Your account will be permanently removed. Courses, fees, '
                  'attendance, chat, and all related data will be deleted. '
                  'Admins will be notified. Signing in again will show an '
                  'invalid email or password error.',
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.45,
                    color: AppColors.muted,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'This cannot be undone.',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.danger.withValues(alpha: 0.9),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.danger,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(100),
                      ),
                    ),
                    child: const Text(
                      'Yes, delete my account',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('Cancel'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (ok != true || !context.mounted) return;

    final ui = context.read<UiProvider>();
    ui.showLoading();
    await PushNotificationService.instance.unregisterFromBackend();
    await OfficeLocationService.instance.stop();
    if (!context.mounted) return;
    context.read<CourseProvider>().clearMemory();
    context.read<TaskProvider>().clearMemory();
    context.read<ProjectProvider>().clear();
    context.read<FeeProvider>().clearMemory();
    context.read<LeaveProvider>().clearMemory();
    context.read<AttendanceProvider>().clearMemory();
    context.read<NotificationProvider>().clearMemory();
    final auth = context.read<AuthProvider>();
    final done = await auth.deleteAccount();
    ui.hideLoading();
    if (!context.mounted) return;
    if (done) {
      ui.showSnack('Account deleted', tone: AppSnackTone.warning);
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (_) => false,
      );
    } else {
      ui.showSnack(
        auth.error ?? 'Could not delete account',
        tone: AppSnackTone.error,
      );
    }
  }

  String _initials(AuthProvider auth) {
    final name = (auth.user?.name ?? '').trim();
    if (name.isEmpty) return 'U';
    final parts =
        name.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final courses = context.watch<CourseProvider>();
    final notes = context.watch<NotificationProvider>();
    final leaveUnread = notes.unreadForTypes(const ['LEAVE']);
    final attendanceUnread = notes.unreadForTypes(const ['ATTENDANCE']);
    final chatUnread = notes.unreadForTypes(const ['CHAT']);
    final avatarImage = auth.avatarImage;
    final pad = AppResponsive.pagePad(context);
    final bottom = AppResponsive.shellBottom(context);
    final attendancePct = courses.overallAttendance;
    final feesDue = courses.totalFeeDue;
    final enrolledCount = courses.enrolledCourses.length;
    final batch = auth.user?.batch?.trim().isNotEmpty == true
        ? auth.user!.batch!
        : 'Not set';
    final name = auth.user?.name.trim().isNotEmpty == true
        ? auth.user!.name.trim()
        : 'Guest';
    final email = auth.user?.email ?? '';
    final role = auth.user?.roleLabel ?? 'User';

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        centerTitle: true,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: EdgeInsets.fromLTRB(pad, 4, pad, bottom),
        children: [
          // —— Identity (light brand surface, centered) ——
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 22),
            decoration: BoxDecoration(
              color: AppColors.softBlue,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              children: [
                GestureDetector(
                  onTap: () => _showPhotoSheet(context),
                  child: Stack(
                    alignment: Alignment.center,
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.card,
                          border: Border.all(
                            color: AppColors.blue.withValues(alpha: 0.35),
                            width: 3,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: avatarImage != null
                            ? Image(
                                image: avatarImage,
                                fit: BoxFit.cover,
                              )
                            : Center(
                                child: Text(
                                  _initials(auth),
                                  style: const TextStyle(
                                    color: AppColors.blueDark,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 30,
                                    letterSpacing: 0.4,
                                  ),
                                ),
                              ),
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: AppColors.blue,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.softBlue,
                              width: 2.5,
                            ),
                          ),
                          child: const Icon(
                            CupertinoIcons.camera_fill,
                            size: 13,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  name,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 22,
                    letterSpacing: -0.4,
                    color: AppColors.ink,
                    height: 1.2,
                  ),
                ),
                if (email.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    email,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.blue,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    role,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 12.5,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // —— Stats (equal tiles, brand palette) ——
          if (auth.isStudent) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _statTile(
                    icon: CupertinoIcons.book_fill,
                    label: 'Courses',
                    value: '$enrolledCount',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _statTile(
                    icon: CupertinoIcons.chart_pie_fill,
                    label: 'Attendance',
                    value: '${attendancePct.toStringAsFixed(0)}%',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _statTile(
                    icon: CupertinoIcons.creditcard_fill,
                    label: 'Fees due',
                    value: 'Rs $feesDue',
                    danger: feesDue > 0,
                  ),
                ),
              ],
            ),
          ],

          // —— Batch & course (moved from Dashboard) ——
          if (auth.isStudent) ...[
            const SizedBox(height: 24),
            const _SectionLabel('BATCH & COURSE'),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.line),
              ),
              child: Column(
                children: [
                  _infoRow(
                    icon: CupertinoIcons.person_3_fill,
                    label: 'Batch',
                    value: (courses.reportBatch ?? batch),
                  ),
                  const _RowDivider(),
                  _infoRow(
                    icon: CupertinoIcons.book_fill,
                    label: 'Course',
                    value: courses.continueCourse?.title ??
                        (courses.enrolledCourses.isNotEmpty
                            ? courses.enrolledCourses.first.title
                            : '—'),
                  ),
                  const _RowDivider(),
                  _infoRow(
                    icon: CupertinoIcons.person_crop_rectangle,
                    label: 'Instructor',
                    value: courses.continueCourse?.instructorName?.trim().isNotEmpty ==
                            true
                        ? courses.continueCourse!.instructorName!
                        : '—',
                  ),
                  const _RowDivider(),
                  _infoRow(
                    icon: CupertinoIcons.chart_bar_fill,
                    label: 'Progress',
                    value:
                        '${(courses.continueCourse?.progressPercent ?? 0).toStringAsFixed(0)}%',
                  ),
                  const _RowDivider(),
                  _infoRow(
                    icon: CupertinoIcons.calendar,
                    label: 'Admission',
                    value: () {
                      final raw = courses.reportCreatedAt;
                      if (raw == null || raw.isEmpty) return '—';
                      final d = DateTime.tryParse(raw);
                      if (d == null) {
                        return raw.length >= 10 ? raw.substring(0, 10) : raw;
                      }
                      return '${d.day}/${d.month}/${d.year}';
                    }(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const _SectionLabel('LEAVE MANAGEMENT'),
            const SizedBox(height: 10),
            Material(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: () {
                  unawaited(
                    context.read<NotificationProvider>().markTypesRead(
                      const ['LEAVE'],
                    ),
                  );
                  Navigator.of(context).push(
                    AppMotion.fadeSlide(const LeaveScreen()),
                  );
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Row(
                    children: [
                      const Icon(CupertinoIcons.calendar_badge_minus,
                          color: AppColors.blue),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Request & track leave',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              '2 days per month · pending / approved / rejected',
                              style: TextStyle(
                                color: AppColors.muted,
                                fontSize: 12.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      UnreadCountBadge(count: leaveUnread),
                      const SizedBox(width: 6),
                      const Icon(Icons.chevron_right_rounded,
                          color: AppColors.muted),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Material(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: () {
                  unawaited(
                    context.read<NotificationProvider>().markTypesRead(
                      const ['ATTENDANCE'],
                    ),
                  );
                  Navigator.of(context).push(
                    AppMotion.fadeSlide(const AttendanceScreen()),
                  );
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.fingerprint, color: AppColors.blue),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Attendance',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      UnreadCountBadge(count: attendanceUnread),
                      const SizedBox(width: 6),
                      const Icon(Icons.chevron_right_rounded,
                          color: AppColors.muted),
                    ],
                  ),
                ),
              ),
            ),
          ],

          // Staff / intern: leave + attendance tiles with unread counts
          if (!auth.isStudent) ...[
            const SizedBox(height: 24),
            const _SectionLabel('LEAVE & ATTENDANCE'),
            const SizedBox(height: 10),
            Material(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: () {
                  unawaited(
                    context.read<NotificationProvider>().markTypesRead(
                      const ['LEAVE'],
                    ),
                  );
                  Navigator.of(context).push(
                    AppMotion.fadeSlide(const LeaveScreen()),
                  );
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Row(
                    children: [
                      const Icon(CupertinoIcons.calendar_badge_minus,
                          color: AppColors.blue),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Leave requests',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      UnreadCountBadge(count: leaveUnread),
                      const SizedBox(width: 6),
                      const Icon(Icons.chevron_right_rounded,
                          color: AppColors.muted),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Material(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: () {
                  unawaited(
                    context.read<NotificationProvider>().markTypesRead(
                      const ['ATTENDANCE'],
                    ),
                  );
                  context.read<UiProvider>().setNavIndex(2);
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.fingerprint, color: AppColors.blue),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Attendance',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      UnreadCountBadge(count: attendanceUnread),
                      const SizedBox(width: 6),
                      const Icon(Icons.chevron_right_rounded,
                          color: AppColors.muted),
                    ],
                  ),
                ),
              ),
            ),
          ],

          // —— Account details ——
          const SizedBox(height: 24),
          const _SectionLabel('ACCOUNT'),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              children: [
                if (auth.isStudent) ...[
                  _infoRow(
                    icon: CupertinoIcons.hammer_fill,
                    label: 'Track',
                    value: auth.trackLabel,
                  ),
                  const _RowDivider(),
                  _infoRow(
                    icon: CupertinoIcons.phone_fill,
                    label: 'Phone',
                    value: (courses.reportPhone ?? auth.user?.phone)?.trim().isNotEmpty ==
                            true
                        ? (courses.reportPhone ?? auth.user!.phone!)
                        : 'Not set',
                  ),
                  const _RowDivider(),
                  _infoRow(
                    icon: CupertinoIcons.mail_solid,
                    label: 'Email',
                    value: email.isNotEmpty ? email : 'Not set',
                  ),
                ] else ...[
                  _infoRow(
                    icon: CupertinoIcons.building_2_fill,
                    label: 'Department',
                    value: auth.user?.department?.trim().isNotEmpty == true
                        ? auth.user!.department!
                        : 'Not set',
                  ),
                  const _RowDivider(),
                  _infoRow(
                    icon: CupertinoIcons.hammer_fill,
                    label: 'Track',
                    value: auth.trackLabel,
                  ),
                  const _RowDivider(),
                  _infoRow(
                    icon: CupertinoIcons.person_3_fill,
                    label: 'Active batches',
                    value: '${courses.courses.length}',
                  ),
                ],
              ],
            ),
          ),

          // —— Help (flat, aligned) ——
          const SizedBox(height: 24),
          const _SectionLabel('HELP & SUPPORT'),
          const SizedBox(height: 4),
          const Text(
            'Reports, complaints, surveys, and admin chat are all here.',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 13,
              height: 1.35,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          ...() {
            final links = _supportLinks(context, auth);
            return links.asMap().entries.map((entry) {
            final item = entry.value;
            final isLast = entry.key == links.length - 1;
            final isChat = item.$1.toLowerCase().contains('chat');
            return Column(
              children: [
                InkWell(
                  onTap: () {
                    if (isChat) {
                      unawaited(
                        context
                            .read<NotificationProvider>()
                            .markTypesRead(const ['CHAT']),
                      );
                    }
                    item.$4();
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: AppColors.softBlue,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            item.$3,
                            color: AppColors.blueDark,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.$1,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                  color: AppColors.ink,
                                  height: 1.25,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                item.$2,
                                style: const TextStyle(
                                  color: AppColors.muted,
                                  fontSize: 12.5,
                                  height: 1.3,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (isChat) UnreadCountBadge(count: chatUnread),
                        const SizedBox(width: 8),
                        const Icon(
                          CupertinoIcons.chevron_forward,
                          color: AppColors.muted,
                          size: 16,
                        ),
                      ],
                    ),
                  ),
                ),
                if (!isLast)
                  const Divider(
                    height: 1,
                    thickness: 0.5,
                    color: AppColors.line,
                  ),
              ],
            );
          });
          }(),

          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: () async {
                await PushNotificationService.instance.unregisterFromBackend();
                await OfficeLocationService.instance.stop();
                if (!context.mounted) return;
                context.read<CourseProvider>().clearMemory();
                context.read<TaskProvider>().clearMemory();
                context.read<ProjectProvider>().clear();
                context.read<FeeProvider>().clearMemory();
                context.read<AttendanceProvider>().clearMemory();
                context.read<NotificationProvider>().clearMemory();
                await auth.logout();
                if (!context.mounted) return;
                context.read<UiProvider>().showSnack('Signed out');
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (_) => false,
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.blue,
                foregroundColor: Colors.white,
                elevation: 0,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
              child: const Text(
                'Sign out',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: OutlinedButton(
              onPressed: () => _deleteAccount(context),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.danger,
                side: BorderSide(
                  color: AppColors.danger.withValues(alpha: 0.5),
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
              child: const Text(
                'Delete account',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statTile({
    required IconData icon,
    required String label,
    required String value,
    bool danger = false,
  }) {
    final accent = danger ? AppColors.danger : AppColors.blueDark;
    final tint = danger
        ? AppColors.danger.withValues(alpha: 0.08)
        : AppColors.softBlue;

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      decoration: BoxDecoration(
        color: tint,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: accent),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: accent,
              fontSize: 15,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  /// Icon + label left, full value wraps below — consistent left edge.
  Widget _infoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.softBlue,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 18, color: AppColors.blueDark),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  softWrap: true,
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    height: 1.35,
                    letterSpacing: -0.15,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<(String, String, IconData, VoidCallback)> _supportLinks(
    BuildContext context,
    AuthProvider auth,
  ) {
    void go(Widget page) {
      Navigator.of(context).push(AppMotion.fadeSlide(page));
    }

    return [
      if (auth.isStudent)
        (
          'Fees & payments',
          'Pay online, screenshot, admin approve',
          CupertinoIcons.creditcard,
          () => go(const FeesScreen()),
        ),
      (
        'AI Study Coach',
        'Study plans, explanations, quiz prep',
        CupertinoIcons.sparkles,
        () => go(const AiCoachScreen()),
      ),
      (
        'Quizzes',
        'Take course MCQ exams',
        CupertinoIcons.doc_on_clipboard,
        () => go(const QuizzesScreen()),
      ),
      (
        'Certificates',
        'View and share verification codes',
        CupertinoIcons.rosette,
        () => go(const CertificatesScreen()),
      ),
      (
        'Report',
        'Batch / class issue report to admin',
        CupertinoIcons.flag,
        () => go(const ReportIssueScreen()),
      ),
      (
        'Complain',
        'Office / facility complain',
        CupertinoIcons.exclamationmark_circle,
        () => go(const ComplainScreen()),
      ),
      (
        'Survey',
        'Complete admin survey, quick fill',
        CupertinoIcons.doc_checkmark,
        () => go(const SurveyScreen()),
      ),
      (
        "Chat with Code's Thinker",
        'Direct support, real-time replies',
        CupertinoIcons.chat_bubble_2,
        () => go(const AdminChatScreen()),
      ),
      (
        'My progress report',
        'Attendance, fees, course stats',
        CupertinoIcons.chart_bar,
        () => go(const ReportScreen()),
      ),
    ];
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;

  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: AppColors.muted,
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.7,
      ),
    );
  }
}

class _RowDivider extends StatelessWidget {
  const _RowDivider();

  @override
  Widget build(BuildContext context) {
    return const Divider(
      height: 1,
      indent: 66,
      color: AppColors.line,
    );
  }
}
