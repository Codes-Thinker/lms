import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_space.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/notification_router.dart';
import '../../core/responsive.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/fee_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/ui_provider.dart';
import '../../services/push_notification_service.dart';
import '../../widgets/ct_mark.dart';
import '../shell/app_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

/// Controllers + ValueNotifier only — no setState.
class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _obscure = ValueNotifier<bool>(true);

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _obscure.dispose();
    super.dispose();
  }

  Future<void> _submit(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    final ui = context.read<UiProvider>();
    final courses = context.read<CourseProvider>();
    final tasks = context.read<TaskProvider>();

    if (ui.globalLoading) return;
    ui.showLoading();
    try {
      final ok = await auth.login(email: _email.text, password: _password.text);
      if (!context.mounted) return;
      if (!ok) {
        ui.showSnack(auth.error ?? 'Login failed', tone: AppSnackTone.error);
        return;
      }

      // Full catalog + tasks + fees + attendance for every role.
      final fees = context.read<FeeProvider>();
      final attendance = context.read<AttendanceProvider>();
      final notes = context.read<NotificationProvider>();
      await courses.fetchEnrolledCourses();
      await tasks.load();
      await fees.load();
      await attendance.loadMine();
      await PushNotificationService.instance.registerWithBackend();
      await notes.load();
      if (!context.mounted) return;
      final pendingType = NotificationRouter.pendingType;
      ui.setNavIndex(
        pendingType != null
            ? NotificationRouter.tabForType(pendingType)
            : 0,
      );
      // Keep pending deep-link for AppShell (chat / task / fee).
      ui.showSnack('Welcome ${auth.user?.firstName ?? ''}, ${auth.user?.roleLabel}');
      Navigator.of(context).pushReplacement(AppMotion.fadeSlide(const AppShell()));
    } finally {
      ui.hideLoading();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final pad = AppResponsive.pagePad(context) + AppSpace.sm;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.symmetric(horizontal: pad, vertical: AppSpace.xxl),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 400),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const CtMark(size: 68),
                          AppSpace.gapXl,
                          const Text(
                            AppBrand.name,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w700,
                              color: AppColors.ink,
                              letterSpacing: -0.3,
                            ),
                          ),
                          AppSpace.gapSm,
                          const Text(
                            AppBrand.tagline,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppColors.muted,
                            ),
                          ),
                          AppSpace.gapXxl,
                          Row(
                            children: [
                              _roleChip(
                                label: 'Student',
                                icon: Icons.school_rounded,
                                selected: auth.loginRole == LoginRole.student,
                                onTap: () => auth.selectLoginRole(LoginRole.student),
                              ),
                              AppSpace.wSm,
                              _roleChip(
                                label: 'Intern',
                                icon: Icons.workspace_premium_rounded,
                                selected: auth.loginRole == LoginRole.intern,
                                onTap: () => auth.selectLoginRole(LoginRole.intern),
                              ),
                              AppSpace.wSm,
                              _roleChip(
                                label: 'Teacher / Staff',
                                icon: Icons.badge_rounded,
                                selected: auth.loginRole == LoginRole.staff,
                                onTap: () => auth.selectLoginRole(LoginRole.staff),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpace.xxl - 4),
                          _field(
                            controller: _email,
                            label: 'Email',
                            hint: 'you@gmail.com',
                            keyboard: TextInputType.emailAddress,
                            icon: Icons.mail_outline_rounded,
                          ),
                          AppSpace.gapXl,
                          ValueListenableBuilder<bool>(
                            valueListenable: _obscure,
                            builder: (_, obscure, __) {
                              return _field(
                                controller: _password,
                                label: 'Password',
                                hint: 'Your password',
                                obscure: obscure,
                                icon: Icons.lock_outline_rounded,
                                suffix: IconButton(
                                  onPressed: () => _obscure.value = !obscure,
                                  icon: Icon(
                                    obscure
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                    color: AppColors.muted,
                                    size: 20,
                                  ),
                                ),
                              );
                            },
                          ),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () async {
                                final email = _email.text.trim();
                                if (email.isEmpty) {
                                  context.read<UiProvider>().showSnack(
                                        'Enter your email first',
                                        tone: AppSnackTone.warning,
                                      );
                                  return;
                                }
                                final msg = await context
                                    .read<AuthProvider>()
                                    .requestPasswordReset(email);
                                if (!context.mounted) return;
                                context.read<UiProvider>().showSnack(
                                      msg ?? 'Check your email for a reset link',
                                      tone: AppSnackTone.info,
                                    );
                              },
                              child: const Text(
                                'Forgot password?',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.blue,
                                ),
                              ),
                            ),
                          ),
                          AppSpace.gapXl,
                          Builder(
                            builder: (context) {
                              final busy = context.watch<UiProvider>().globalLoading;
                              return SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: ElevatedButton(
                                  onPressed: busy ? null : () => _submit(context),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.blue,
                                    foregroundColor: Colors.white,
                                    disabledBackgroundColor:
                                        AppColors.blue.withValues(alpha: 0.7),
                                    disabledForegroundColor: Colors.white,
                                    elevation: 0,
                                    shadowColor: Colors.transparent,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppSpace.rPill),
                                    ),
                                  ),
                                  child: const Text(
                                    'Sign in',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: EdgeInsets.only(bottom: bottom > 0 ? AppSpace.sm : AppSpace.lg),
                child: const Text(
                  AppBrand.footer,
                  style: TextStyle(
                    color: AppColors.muted,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _roleChip({
    required String label,
    required IconData icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: AppMotion.fast,
          curve: AppMotion.curve,
          padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
          decoration: BoxDecoration(
            color: selected ? AppColors.blue : AppColors.softBlue,
            borderRadius: BorderRadius.circular(AppSpace.rPill),
            border: Border.all(
              color: selected ? AppColors.blue : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: selected ? Colors.white : AppColors.blue, size: 20),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: selected ? Colors.white : AppColors.blue,
                  fontWeight: FontWeight.w700,
                  fontSize: label.contains('/') ? 10 : 12,
                  height: 1.15,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static const _fieldRadius = 16.0;

  OutlineInputBorder _fieldBorder({
    Color color = AppColors.line,
    double width = 1,
  }) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(_fieldRadius),
      borderSide: BorderSide(color: color, width: width),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboard,
    bool obscure = false,
    Widget? suffix,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 13,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: controller,
          keyboardType: keyboard,
          obscureText: obscure,
          cursorColor: AppColors.blue,
          style: const TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 15,
            color: AppColors.ink,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
              color: AppColors.muted,
              fontWeight: FontWeight.w400,
            ),
            prefixIcon: Icon(icon, color: AppColors.muted, size: 20),
            suffixIcon: suffix,
            filled: true,
            fillColor: AppColors.card,
            // Clean solid border only — no blur / shadow / glow.
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
            border: _fieldBorder(),
            enabledBorder: _fieldBorder(),
            focusedBorder: _fieldBorder(color: AppColors.blue, width: 1.5),
            errorBorder: _fieldBorder(color: AppColors.danger),
            focusedErrorBorder: _fieldBorder(color: AppColors.danger, width: 1.5),
          ),
        ),
      ],
    );
  }
}

