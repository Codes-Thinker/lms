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
import '../../providers/task_provider.dart';
import '../../providers/ui_provider.dart';
import '../../services/avatar_service.dart';
import '../../services/office_location_service.dart';
import '../../services/push_notification_service.dart';
import '../ai/ai_coach_screen.dart';
import '../auth/login_screen.dart';
import '../certificates/certificates_screen.dart';
import '../fees/fees_screen.dart';
import '../help/admin_chat_screen.dart';
import '../help/complain_screen.dart';
import '../help/report_issue_screen.dart';
import '../help/survey_screen.dart';
import '../quizzes/quizzes_screen.dart';
import '../report/report_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<void> _pickPhoto(BuildContext context, ImageSource source) async {
    final auth = context.read<AuthProvider>();
    final ui = context.read<UiProvider>();
    try {
      final path = await AvatarService.pickAndCrop(source: source, context: context);
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
      ui.showSnack('Could not save photo. Try a smaller image.',
          tone: AppSnackTone.error);
    }
  }

  Future<void> _showPhotoSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(14)),
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
                  leading: const Icon(Icons.photo_library_outlined, color: AppColors.blue),
                  title: const Text('Gallery'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickPhoto(context, ImageSource.gallery);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.photo_camera_outlined, color: AppColors.blue),
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
      backgroundColor: Colors.white,
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
                      color: Colors.black12,
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
                Text(
                  "Iske baad aapka account nahi rahega. Courses, fees, attendance, "
                  "chat aur saara data permanently delete ho jayega. Admin ko bhi "
                  "pata chal jayega. Dobara login invalid email/password dikhayega.",
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.45,
                    color: Colors.black.withValues(alpha: 0.65),
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
    context.read<CourseProvider>().clearMemory();
    context.read<TaskProvider>().clearMemory();
    context.read<FeeProvider>().clearMemory();
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

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final courses = context.watch<CourseProvider>();
    final avatarImage = auth.avatarImage;
    final pad = AppResponsive.pagePad(context);

    final details = <(String, String)>[
      if (auth.isStudent) ...[
        ('Track', auth.trackLabel),
        ('Batch', auth.user?.batch?.trim().isNotEmpty == true
            ? auth.user!.batch!
            : 'Not set'),
        ('Attendance', '${courses.overallAttendance.toStringAsFixed(0)}%'),
        ('Fees pending', 'Rs ${courses.totalFeeDue}'),
        ('Enrolled courses', '${courses.enrolledCourses.length}'),
      ] else ...[
        ('Department', auth.user?.department?.trim().isNotEmpty == true
            ? auth.user!.department!
            : 'Not set'),
        ('Track', auth.trackLabel),
        ('Active batches', '${courses.courses.length}'),
      ],
    ];

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: AppColors.bg,
        centerTitle: true,
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(pad, 4, pad, AppResponsive.shellBottom(context)),
        children: [
          Center(
            child: Column(
              children: [
                GestureDetector(
                  onTap: () => _showPhotoSheet(context),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      CircleAvatar(
                        radius: 44,
                        backgroundColor: AppColors.softBlue,
                        backgroundImage: avatarImage,
                        child: avatarImage == null
                            ? Text(
                                auth.user?.firstName.substring(0, 1) ?? 'U',
                                style: const TextStyle(
                                  color: AppColors.blue,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 28,
                                ),
                              )
                            : null,
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
                            border: Border.all(color: AppColors.bg, width: 2.5),
                          ),
                          child: const Icon(
                            Icons.camera_alt_rounded,
                            size: 14,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  auth.user?.name ?? 'Guest',
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 22,
                    letterSpacing: -0.3,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  auth.user?.email ?? '',
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AppColors.muted, fontSize: 14),
                ),
                const SizedBox(height: 6),
                Text(
                  auth.user?.roleLabel ?? 'User',
                  style: const TextStyle(
                    color: AppColors.blue,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 28),
          const Text(
            'DETAILS',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 6),
          // Flat rows — no white container (admin data, read-only)
          for (final row in details)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 11),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      row.$1,
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  Flexible(
                    child: Text(
                      row.$2,
                      textAlign: TextAlign.right,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.ink,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 18),
          const Text(
            'HELP & SUPPORT',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'Report, complain, survey aur admin chat sab yahan.',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 6),
          // Flat rows — no card / shadow / blur so options stay clear.
          ..._supportLinks(context, auth).expand((item) {
            return [
              InkWell(
                onTap: item.$4,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    children: [
                      Icon(item.$3, color: AppColors.blue, size: 22),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.$1,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                                color: AppColors.ink,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item.$2,
                              style: const TextStyle(
                                color: AppColors.muted,
                                fontSize: 12,
                                height: 1.3,
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
              const Divider(height: 1, thickness: 0.5, color: AppColors.line),
            ];
          }),

          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () async {
                await PushNotificationService.instance.unregisterFromBackend();
                await OfficeLocationService.instance.stop();
                context.read<CourseProvider>().clearMemory();
                context.read<TaskProvider>().clearMemory();
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
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton(
              onPressed: () => _deleteAccount(context),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.danger,
                side: const BorderSide(color: AppColors.danger),
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

  /// Flat help links on Profile — no card, shadow, or blur.
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
