import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_motion.dart';
import '../../core/notification_router.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../providers/fee_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/ui_provider.dart';
import '../../services/office_location_service.dart';
import '../../services/push_notification_service.dart';
import '../../widgets/ct_mark.dart';
import '../auth/login_screen.dart';
import '../shell/app_shell.dart';

/// Yango-style branded splash — motion logo, rings, progress (not a plain spinner).
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _intro;
  late final AnimationController _pulse;
  late final AnimationController _progress;

  late final Animation<double> _markScale;
  late final Animation<double> _markOpacity;
  late final Animation<double> _titleSlide;
  late final Animation<double> _titleOpacity;
  late final Animation<double> _tagOpacity;
  late final Animation<double> _footerOpacity;

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );

    _intro = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat();
    _progress = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat();

    _markScale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.55, end: 1.08)
            .chain(CurveTween(curve: Curves.easeOutBack)),
        weight: 65,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.08, end: 1.0)
            .chain(CurveTween(curve: Curves.easeOutCubic)),
        weight: 35,
      ),
    ]).animate(_intro);

    _markOpacity = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0.0, 0.35, curve: Curves.easeOut),
    );
    _titleSlide = Tween<double>(begin: 18, end: 0).animate(
      CurvedAnimation(
        parent: _intro,
        curve: const Interval(0.28, 0.7, curve: Curves.easeOutCubic),
      ),
    );
    _titleOpacity = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0.28, 0.65, curve: Curves.easeOut),
    );
    _tagOpacity = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0.48, 0.85, curve: Curves.easeOut),
    );
    _footerOpacity = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0.62, 1.0, curve: Curves.easeOut),
    );

    if (!NotificationRouter.launchedFromNotification) {
      _intro.forward();
    }
    _boot();
  }

  Future<void> _boot() async {
    final fromNotif = NotificationRouter.launchedFromNotification;
    if (!fromNotif) {
      // Let the brand intro play before navigating.
      await Future<void>.delayed(const Duration(milliseconds: 1100));
    }

    if (!mounted) return;
    final auth = context.read<AuthProvider>();

    for (var i = 0; i < 40 && !auth.hydrated; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }

    if (!mounted) return;

    if (auth.isAuthenticated) {
      final type = NotificationRouter.pendingType;
      if (type != null) {
        context.read<UiProvider>().setNavIndex(
              NotificationRouter.tabForType(type),
            );
      }
      final courses = context.read<CourseProvider>();
      final tasks = context.read<TaskProvider>();
      final fees = context.read<FeeProvider>();
      final attendance = context.read<AttendanceProvider>();
      final notes = context.read<NotificationProvider>();
      await Future.wait([
        courses.fetchAll(),
        tasks.load(),
        fees.load(),
        attendance.loadMine(),
        notes.load(),
      ]);
      await PushNotificationService.instance.registerWithBackend();
      OfficeLocationService.instance.bind(attendance);
      unawaited(OfficeLocationService.instance.start());
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        AppMotion.fadeSlide(const AppShell()),
      );
      return;
    }

    Navigator.of(context).pushReplacement(
      AppMotion.fadeSlide(const LoginScreen()),
    );
  }

  @override
  void dispose() {
    _intro.dispose();
    _pulse.dispose();
    _progress.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (NotificationRouter.launchedFromNotification) {
      return const Scaffold(
        backgroundColor: Color(0xFF1A1C2E),
        body: SizedBox.expand(),
      );
    }

    return Scaffold(
      body: AnimatedBuilder(
        animation: Listenable.merge([_intro, _pulse, _progress]),
        builder: (context, _) {
          return Stack(
            fit: StackFit.expand,
            children: [
              const _SplashBackdrop(),
              _PulseOrbs(t: _pulse.value),
              SafeArea(
                child: Column(
                  children: [
                    const Spacer(flex: 3),
                    // Mark + rings
                    SizedBox(
                      width: 168,
                      height: 168,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          _Ring(
                            size: 148 + 18 * math.sin(_pulse.value * math.pi),
                            opacity: 0.18 *
                                (1 - (_pulse.value - 0.15).clamp(0.0, 1.0)),
                          ),
                          _Ring(
                            size: 118 +
                                10 *
                                    math.sin(
                                      (_pulse.value + 0.35) * math.pi * 2,
                                    ),
                            opacity: 0.28,
                          ),
                          Opacity(
                            opacity: _markOpacity.value,
                            child: Transform.scale(
                              scale: _markScale.value,
                              child: Container(
                                width: 96,
                                height: 96,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(
                                        alpha: 0.18,
                                      ),
                                      blurRadius: 28,
                                      offset: const Offset(0, 12),
                                    ),
                                  ],
                                ),
                                alignment: Alignment.center,
                                child: const CtMark(size: 58),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),
                    Opacity(
                      opacity: _titleOpacity.value,
                      child: Transform.translate(
                        offset: Offset(0, _titleSlide.value),
                        child: const Text(
                          AppBrand.shortName,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.6,
                            height: 1.1,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Opacity(
                      opacity: _tagOpacity.value,
                      child: Text(
                        AppBrand.tagline,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.white.withValues(alpha: 0.78),
                          letterSpacing: 0.1,
                        ),
                      ),
                    ),
                    const Spacer(flex: 3),
                    Opacity(
                      opacity: _footerOpacity.value,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(48, 0, 48, 36),
                        child: Column(
                          children: [
                            _BrandProgress(t: _progress.value),
                            const SizedBox(height: 18),
                            Text(
                              AppBrand.lms,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.55),
                                fontWeight: FontWeight.w600,
                                fontSize: 12.5,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SplashBackdrop extends StatelessWidget {
  const _SplashBackdrop();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
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
    );
  }
}

class _PulseOrbs extends StatelessWidget {
  final double t;

  const _PulseOrbs({required this.t});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final dx = math.sin(t * math.pi * 2) * 24;
    final dy = math.cos(t * math.pi * 2) * 18;
    return Stack(
      children: [
        Positioned(
          left: -80 + dx,
          top: size.height * 0.12 + dy,
          child: _Orb(
            diameter: 220,
            color: const Color(0xFF3B82F6).withValues(alpha: 0.22),
          ),
        ),
        Positioned(
          right: -60 - dx,
          bottom: size.height * 0.18 - dy,
          child: _Orb(
            diameter: 260,
            color: Colors.white.withValues(alpha: 0.08),
          ),
        ),
        Positioned(
          right: size.width * 0.2 + dx * 0.5,
          top: size.height * 0.42,
          child: _Orb(
            diameter: 120,
            color: const Color(0xFF60A5FA).withValues(alpha: 0.16),
          ),
        ),
      ],
    );
  }
}

class _Orb extends StatelessWidget {
  final double diameter;
  final Color color;

  const _Orb({required this.diameter, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: diameter,
      height: diameter,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
      ),
    );
  }
}

class _Ring extends StatelessWidget {
  final double size;
  final double opacity;

  const _Ring({required this.size, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: Colors.white.withValues(alpha: opacity.clamp(0.0, 1.0)),
          width: 1.4,
        ),
      ),
    );
  }
}

/// Sliding brand progress — Yango-like, not a spinner.
class _BrandProgress extends StatelessWidget {
  final double t;

  const _BrandProgress({required this.t});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final bar = w * 0.38;
        final x = (w + bar) * t - bar;
        return ClipRRect(
          borderRadius: BorderRadius.circular(100),
          child: SizedBox(
            height: 3.5,
            width: w,
            child: Stack(
              children: [
                Container(color: Colors.white.withValues(alpha: 0.18)),
                Positioned(
                  left: x,
                  width: bar,
                  top: 0,
                  bottom: 0,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(100),
                      gradient: LinearGradient(
                        colors: [
                          Colors.white.withValues(alpha: 0.05),
                          Colors.white.withValues(alpha: 0.95),
                          Colors.white.withValues(alpha: 0.05),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
