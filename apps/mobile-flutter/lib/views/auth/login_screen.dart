import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/notification_router.dart';
import '../../core/responsive.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/fee_provider.dart';
import '../../providers/leave_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/teaching_provider.dart';
import '../../providers/ui_provider.dart';
import '../../services/office_location_service.dart';
import '../../services/push_notification_service.dart';
import '../../widgets/ct_mark.dart';
import '../shell/app_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _obscure = ValueNotifier<bool>(true);
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
      ),
    );
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _obscure.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  Future<void> _submit(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    final ui = context.read<UiProvider>();
    final courses = context.read<CourseProvider>();
    final tasks = context.read<TaskProvider>();

    if (ui.globalLoading) return;
    FocusScope.of(context).unfocus();
    ui.showLoading();
    try {
      final ok = await auth.login(email: _email.text, password: _password.text);
      if (!context.mounted) return;
      if (!ok) {
        ui.showSnack(auth.error ?? 'Login failed', tone: AppSnackTone.error);
        return;
      }

      final fees = context.read<FeeProvider>();
      final attendance = context.read<AttendanceProvider>();
      final notes = context.read<NotificationProvider>();
      final teaching = context.read<TeachingProvider>();
      await Future.wait([
        courses.fetchAll(),
        tasks.load(),
        fees.load(),
        if (auth.isStudent || auth.isIntern)
          context.read<LeaveProvider>().load(silent: true),
        attendance.loadMine(),
        notes.load(),
        if (auth.isStaff) teaching.load(),
      ]);
      await PushNotificationService.instance.registerWithBackend();
      // Start office geofence immediately — do not wait for Attend tab.
      final userId = auth.user?.id;
      OfficeLocationService.instance.bind(attendance, userId: userId);
      unawaited(OfficeLocationService.instance.start(userId: userId));
      if (!context.mounted) return;
      final pendingType = NotificationRouter.pendingType;
      ui.setNavIndex(
        pendingType != null
            ? NotificationRouter.tabForType(
                pendingType,
                isStudent: auth.isStudent,
              )
            : 0,
      );
      ui.showSnack(
        'Welcome ${auth.user?.firstName ?? ''}, ${auth.user?.roleLabel}',
      );
      Navigator.of(context).pushReplacement(
        AppMotion.fadeSlide(const AppShell()),
      );
    } finally {
      ui.hideLoading();
    }
  }

  Future<void> _forgot(BuildContext context) async {
    final email = _email.text.trim();
    if (email.isEmpty) {
      context.read<UiProvider>().showSnack(
            'Enter your email first',
            tone: AppSnackTone.warning,
          );
      return;
    }
    final msg = await context.read<AuthProvider>().requestPasswordReset(email);
    if (!context.mounted) return;
    context.read<UiProvider>().showSnack(
          msg ?? 'Check your email for a reset link',
          tone: AppSnackTone.info,
        );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final busy = context.watch<UiProvider>().globalLoading;
    final pad = AppResponsive.pagePad(context);
    final bottom = MediaQuery.paddingOf(context).bottom;

    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        body: Column(
          children: [
            Expanded(
              child: SafeArea(
                bottom: false,
                child: SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(pad, 12, pad, 24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Brand — left aligned, product header
                        Row(
                          children: [
                            const CtMark(size: 40),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Text(
                                AppBrand.shortName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.ink,
                                  letterSpacing: -0.2,
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 36),
                        const Text(
                          'Sign in',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w800,
                            color: AppColors.ink,
                            letterSpacing: -0.8,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Use your Code\'s Thinker account to continue.',
                          style: TextStyle(
                            fontSize: 14.5,
                            height: 1.4,
                            fontWeight: FontWeight.w500,
                            color: AppColors.muted,
                          ),
                        ),

                        const SizedBox(height: 28),
                        const Text(
                          'CONTINUE AS',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.7,
                            color: AppColors.muted,
                          ),
                        ),
                        const SizedBox(height: 10),
                        _RoleSegment(
                          role: auth.loginRole,
                          onChanged: auth.selectLoginRole,
                        ),

                        const SizedBox(height: 24),
                        _LabeledField(
                          label: 'Email',
                          child: TextField(
                            controller: _email,
                            focusNode: _emailFocus,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            onSubmitted: (_) => _passwordFocus.requestFocus(),
                            cursorColor: AppColors.blue,
                            style: const TextStyle(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w500,
                              color: AppColors.ink,
                            ),
                            decoration: _inputDecoration(
                              hint: 'you@gmail.com',
                              prefix: CupertinoIcons.mail,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        ValueListenableBuilder<bool>(
                          valueListenable: _obscure,
                          builder: (_, obscure, __) {
                            return _LabeledField(
                              label: 'Password',
                              child: TextField(
                                controller: _password,
                                focusNode: _passwordFocus,
                                obscureText: obscure,
                                textInputAction: TextInputAction.done,
                                onSubmitted: (_) => _submit(context),
                                cursorColor: AppColors.blue,
                                style: const TextStyle(
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.ink,
                                ),
                                decoration: _inputDecoration(
                                  hint: 'Your password',
                                  prefix: CupertinoIcons.lock,
                                  suffix: IconButton(
                                    onPressed: () =>
                                        _obscure.value = !obscure,
                                    splashRadius: 20,
                                    icon: Icon(
                                      obscure
                                          ? CupertinoIcons.eye
                                          : CupertinoIcons.eye_slash,
                                      color: AppColors.muted,
                                      size: 20,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),

                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: busy ? null : () => _forgot(context),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 4,
                                vertical: 8,
                              ),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text(
                              'Forgot password?',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.blueDark,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: FilledButton(
                            onPressed: busy ? null : () => _submit(context),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.blue,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor:
                                  AppColors.blue.withValues(alpha: 0.55),
                              disabledForegroundColor: Colors.white,
                              elevation: 0,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
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
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: EdgeInsets.fromLTRB(pad, 8, pad, bottom > 0 ? 8 : 16),
                child: Text(
                  AppBrand.tagline,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.muted.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w500,
                    fontSize: 12.5,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({
    required String hint,
    required IconData prefix,
    Widget? suffix,
  }) {
    const radius = 12.0;
    OutlineInputBorder border(Color color, [double width = 1]) {
      return OutlineInputBorder(
        borderRadius: BorderRadius.circular(radius),
        borderSide: BorderSide(color: color, width: width),
      );
    }

    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
        color: AppColors.muted,
        fontWeight: FontWeight.w400,
        fontSize: 15,
      ),
      prefixIcon: Icon(prefix, color: AppColors.muted, size: 18),
      suffixIcon: suffix,
      filled: true,
      fillColor: AppColors.card,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      border: border(AppColors.line),
      enabledBorder: border(AppColors.line),
      focusedBorder: border(AppColors.blue, 1.5),
      errorBorder: border(AppColors.danger),
      focusedErrorBorder: border(AppColors.danger, 1.5),
    );
  }
}

class _LabeledField extends StatelessWidget {
  final String label;
  final Widget child;

  const _LabeledField({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
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
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

/// Compact segmented role control — not three tall vibe cards.
class _RoleSegment extends StatelessWidget {
  final LoginRole role;
  final ValueChanged<LoginRole> onChanged;

  const _RoleSegment({required this.role, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          _seg('Student', LoginRole.student),
          _seg('Intern', LoginRole.intern),
          _seg('Staff', LoginRole.staff),
        ],
      ),
    );
  }

  Widget _seg(String label, LoginRole value) {
    final selected = role == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => onChanged(value),
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: AppMotion.fast,
          curve: AppMotion.curve,
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            color: selected ? AppColors.blue : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : AppColors.muted,
            ),
          ),
        ),
      ),
    );
  }
}
