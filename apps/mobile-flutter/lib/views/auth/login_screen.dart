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

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _obscure = ValueNotifier<bool>(true);
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  late final AnimationController _enter;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );
    _enter = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 560),
    );
    _fade = CurvedAnimation(parent: _enter, curve: Curves.easeOutCubic);
    _slide = Tween<Offset>(
      begin: const Offset(0, 0.04),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _enter, curve: Curves.easeOutCubic));
    _enter.forward();
  }

  @override
  void dispose() {
    _enter.dispose();
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
    final size = MediaQuery.sizeOf(context);

    return PopScope(
      canPop: false,
      child: Scaffold(
        body: Stack(
          fit: StackFit.expand,
          children: [
            // Splash-like backdrop (static).
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF1A1C2E),
                    Color(0xFF1E3A5F),
                    Color(0xFF2563EB),
                  ],
                  stops: [0.0, 0.55, 1.0],
                ),
              ),
            ),
            // Static soft orbs (same feel as splash, no motion).
            Positioned(
              left: -80,
              top: size.height * 0.12,
              child: IgnorePointer(
                child: Container(
                  width: 220,
                  height: 220,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF3B82F6).withValues(alpha: 0.22),
                  ),
                ),
              ),
            ),
            Positioned(
              right: -60,
              bottom: size.height * 0.18,
              child: IgnorePointer(
                child: Container(
                  width: 260,
                  height: 260,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.08),
                  ),
                ),
              ),
            ),
            Positioned(
              right: size.width * 0.2,
              top: size.height * 0.42,
              child: IgnorePointer(
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF60A5FA).withValues(alpha: 0.16),
                  ),
                ),
              ),
            ),
            SafeArea(
              child: FadeTransition(
                opacity: _fade,
                child: SlideTransition(
                  position: _slide,
                  child: Column(
                    children: [
                      // Logo at top — splash style.
                      Padding(
                        padding: EdgeInsets.fromLTRB(pad, 18, pad, 8),
                        child: Column(
                          children: [
                            Container(
                              width: 72,
                              height: 72,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.18),
                                    blurRadius: 22,
                                    offset: const Offset(0, 10),
                                  ),
                                ],
                              ),
                              alignment: Alignment.center,
                              child: const CtMark(size: 44),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              AppBrand.shortName,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                letterSpacing: -0.4,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              AppBrand.tagline,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w500,
                                color: Colors.white.withValues(alpha: 0.75),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Form centered on screen.
                      Expanded(
                        child: Center(
                          child: SingleChildScrollView(
                            padding: EdgeInsets.fromLTRB(pad, 8, pad, 20),
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 420),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.fromLTRB(
                                  18,
                                  22,
                                  18,
                                  20,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(24),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.18),
                                      blurRadius: 32,
                                      offset: const Offset(0, 14),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Text(
                                      'Sign in',
                                      style: TextStyle(
                                        fontSize: 28,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.ink,
                                        letterSpacing: -0.7,
                                        height: 1.1,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    const Text(
                                      'Use your Code\'s Thinker account to continue.',
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        height: 1.4,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.muted,
                                      ),
                                    ),
                                    const SizedBox(height: 20),
                                    const Text(
                                      'CONTINUE AS',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.8,
                                        color: AppColors.muted,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    _RoleCards(
                                      role: auth.loginRole,
                                      onChanged: auth.selectLoginRole,
                                    ),
                                    const SizedBox(height: 20),
                                    _LabeledField(
                                      label: 'Email',
                                      child: TextField(
                                        controller: _email,
                                        focusNode: _emailFocus,
                                        keyboardType:
                                            TextInputType.emailAddress,
                                        textInputAction: TextInputAction.next,
                                        onSubmitted: (_) =>
                                            _passwordFocus.requestFocus(),
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
                                    const SizedBox(height: 14),
                                    ValueListenableBuilder<bool>(
                                      valueListenable: _obscure,
                                      builder: (_, obscure, __) {
                                        return _LabeledField(
                                          label: 'Password',
                                          child: TextField(
                                            controller: _password,
                                            focusNode: _passwordFocus,
                                            obscureText: obscure,
                                            textInputAction:
                                                TextInputAction.done,
                                            onSubmitted: (_) =>
                                                _submit(context),
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
                                                      : CupertinoIcons
                                                          .eye_slash,
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
                                        onPressed: busy
                                            ? null
                                            : () => _forgot(context),
                                        style: TextButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 4,
                                            vertical: 8,
                                          ),
                                          minimumSize: Size.zero,
                                          tapTargetSize:
                                              MaterialTapTargetSize.shrinkWrap,
                                        ),
                                        child: const Text(
                                          'Forgot password?',
                                          style: TextStyle(
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.blue,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    SizedBox(
                                      width: double.infinity,
                                      height: 52,
                                      child: FilledButton(
                                        onPressed: busy
                                            ? null
                                            : () => _submit(context),
                                        style: FilledButton.styleFrom(
                                          backgroundColor: AppColors.blue,
                                          foregroundColor: Colors.white,
                                          disabledBackgroundColor: AppColors
                                              .blue
                                              .withValues(alpha: 0.55),
                                          disabledForegroundColor: Colors.white,
                                          elevation: 0,
                                          shadowColor: Colors.transparent,
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(28),
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
                      ),
                    ],
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
    const radius = 28.0;
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
      fillColor: const Color(0xFFF8FAFC),
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
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
            fontSize: 13.5,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

class _RoleCards extends StatelessWidget {
  final LoginRole role;
  final ValueChanged<LoginRole> onChanged;

  static const _roles = [
    (LoginRole.student, 'Student', CupertinoIcons.person_fill),
    (LoginRole.intern, 'Intern', CupertinoIcons.briefcase_fill),
    (LoginRole.staff, 'Staff', CupertinoIcons.person_3_fill),
  ];

  const _RoleCards({required this.role, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < _roles.length; i++) ...[
          if (i > 0) const SizedBox(width: 10),
          Expanded(
            child: _RoleCard(
              label: _roles[i].$2,
              icon: _roles[i].$3,
              selected: role == _roles[i].$1,
              onTap: () {
                HapticFeedback.selectionClick();
                onChanged(_roles[i].$1);
              },
            ),
          ),
        ],
      ],
    );
  }
}

class _RoleCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _RoleCard({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedScale(
        scale: selected ? 1.02 : 1.0,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutBack,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
          decoration: BoxDecoration(
            color: selected ? AppColors.softBlue : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? AppColors.blue : Colors.transparent,
              width: 2,
            ),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: AppColors.blue.withValues(alpha: 0.14),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : const [],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 280),
                curve: Curves.easeOutCubic,
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: selected ? AppColors.blue : const Color(0xFFE8EEF6),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: selected ? Colors.white : AppColors.muted,
                ),
              ),
              const SizedBox(height: 8),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: selected ? AppColors.blue : AppColors.muted,
                ),
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
