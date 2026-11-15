import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
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
import '../../widgets/app_loader.dart';
import '../../widgets/ct_mark.dart';
import '../auth/login_screen.dart';
import '../shell/app_shell.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final _ready = ValueNotifier<bool>(false);

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
      ),
    );
    _boot();
  }

  Future<void> _boot() async {
    final fromNotif = NotificationRouter.launchedFromNotification;
    if (!fromNotif) {
      await Future<void>.delayed(const Duration(milliseconds: 80));
      _ready.value = true;
      await Future<void>.delayed(const Duration(milliseconds: 900));
    } else {
      _ready.value = true;
    }

    if (!mounted) return;
    final auth = context.read<AuthProvider>();

    // Wait for session restore (JWT).
    for (var i = 0; i < 40 && !auth.hydrated; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }

    if (!mounted) return;

    if (auth.isAuthenticated) {
      // Apply deep-link tab before opening shell.
      final type = NotificationRouter.pendingType;
      if (type != null) {
        context.read<UiProvider>().setNavIndex(
              NotificationRouter.tabForType(type),
            );
      }
      // Cache-first hydrate then background refresh — keeps UI smooth.
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
      // Fire-and-forget: geofence stream + once/day arrival reminder.
      unawaited(OfficeLocationService.instance.start());
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        AppMotion.fadeSlide(const AppShell()),
      );
      NotificationRouter.clear();
      return;
    }

    Navigator.of(context).pushReplacement(
      AppMotion.fadeSlide(const LoginScreen()),
    );
  }

  @override
  void dispose() {
    _ready.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Cold-start from notification: blank flash only (no brand splash).
    if (NotificationRouter.launchedFromNotification) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: AppLoader(size: 36, color: AppColors.blue)),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ValueListenableBuilder<bool>(
          valueListenable: _ready,
          builder: (_, ready, __) {
            return AnimatedOpacity(
              opacity: ready ? 1 : 0,
              duration: const Duration(milliseconds: 400),
              curve: Curves.easeOut,
              child: Column(
                children: [
                  const Spacer(flex: 2),
                  const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CtMark(size: 88),
                        SizedBox(height: 18),
                        Text(
                          AppBrand.name,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w700,
                            color: AppColors.ink,
                          ),
                        ),
                        SizedBox(height: 6),
                        Text(
                          AppBrand.tagline,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(flex: 2),
                  const AppLoader(size: 36, color: AppColors.blue),
                  const SizedBox(height: 14),
                  const Padding(
                    padding: EdgeInsets.only(bottom: 28),
                    child: Text(
                      AppBrand.footer,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.muted,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
