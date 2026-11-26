import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/notification_router.dart';
import '../../core/responsive.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/ui_provider.dart';
import '../../services/office_location_service.dart';
import '../../widgets/ai_coach_fab.dart';
import '../../widgets/app_liquid_nav_bar.dart';
import '../home/home_screen.dart';
import '../attendance/attendance_screen.dart';
import '../course/all_courses_screen.dart';
import '../fees/fees_screen.dart';
import '../help/help_hub_screen.dart';
import '../profile/profile_screen.dart';
import '../teacher/teacher_home_screen.dart';
import '../tasks/tasks_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

/// PageController + ValueNotifier only — no setState.
class _AppShellState extends State<AppShell> {
  late final PageController _pageController;
  late final ValueNotifier<int> _index;
  DateTime? _lastBackAt;

  @override
  void initState() {
    super.initState();
    final start = context.read<UiProvider>().navIndex;
    _index = ValueNotifier(start);
    _pageController = PageController(initialPage: start);
    NotificationRouter.shellHandler = _onNotificationOpen;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _ensureOfficeTracking();
      _consumePendingNotification();
    });
  }

  void _ensureOfficeTracking() {
    if (!mounted) return;
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) return;
    final attendance = context.read<AttendanceProvider>();
    final userId = auth.user?.id;
    OfficeLocationService.instance.bind(attendance, userId: userId);
    unawaited(OfficeLocationService.instance.start(userId: userId));
  }

  @override
  void dispose() {
    if (NotificationRouter.shellHandler == _onNotificationOpen) {
      NotificationRouter.shellHandler = null;
    }
    _pageController.dispose();
    _index.dispose();
    super.dispose();
  }

  void _goTo(int index) {
    final ui = context.read<UiProvider>();
    if (_index.value != index) {
      _index.value = index;
      ui.setNavIndex(index);
      if (_pageController.hasClients) {
        _pageController.jumpToPage(index);
      }
    } else {
      ui.setNavIndex(index);
    }
  }

  void _onNotificationOpen(String type) {
    if (!mounted) return;
    final auth = context.read<AuthProvider>();
    final noteId = NotificationRouter.pendingNotificationId;
    if (noteId != null && noteId.isNotEmpty) {
      context.read<NotificationProvider>().markRead(noteId);
    }
    NotificationRouter.openDeepLink(
      context,
      type: type,
      taskId: NotificationRouter.pendingTaskId,
      feeCaseId: NotificationRouter.pendingFeeCaseId,
      courseId: NotificationRouter.pendingCourseId,
      event: NotificationRouter.pendingEvent,
      isStaff: auth.isStaff,
      isStudent: auth.isStudent,
      goToTab: _goTo,
    ).whenComplete(NotificationRouter.clear);
  }

  void _consumePendingNotification() {
    if (!mounted) return;
    if (!NotificationRouter.hasPendingDeepLink &&
        NotificationRouter.pendingType == null) {
      return;
    }
    final type = NotificationRouter.pendingType ?? 'GENERAL';
    _onNotificationOpen(type);
  }

  void _onBack() {
    if (_index.value > 0) {
      _lastBackAt = null;
      _goTo(0);
      return;
    }
    final now = DateTime.now();
    final again = _lastBackAt != null &&
        now.difference(_lastBackAt!) < const Duration(seconds: 2);
    if (again) {
      SystemNavigator.pop();
      return;
    }
    _lastBackAt = now;
    context.read<UiProvider>().showSnack(
          'Press back again to exit',
          tone: AppSnackTone.info,
        );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final desiredTab = context.watch<UiProvider>().navIndex;
    if (_index.value != desiredTab) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        if (_index.value == desiredTab) return;
        _index.value = desiredTab;
        if (_pageController.hasClients) {
          _pageController.jumpToPage(desiredTab);
        }
      });
    }

    // Student: Dashboard · Assignments · Fees · All Courses · Profile
    // Staff/Intern keep Attend + Help (existing workflows).
    final pages = <Widget>[
      if (auth.isStaff) const TeacherHomeScreen() else const HomeScreen(),
      const TasksScreen(),
      if (auth.isStudent) const FeesScreen() else const AttendanceScreen(),
      if (auth.isStudent) const AllCoursesScreen() else const HelpHubScreen(),
      const ProfileScreen(),
    ];

    final items = <AppLiquidNavItem>[
      AppLiquidNavItem(
        label: auth.isStudent ? 'Dashboard' : 'Home',
        useBrandMark: true,
      ),
      AppLiquidNavItem(
        icon: CupertinoIcons.checkmark_seal_fill,
        label: auth.isIntern
            ? 'Projects'
            : auth.isStaff
                ? 'Staff'
                : 'Assignments',
      ),
      if (auth.isStudent)
        const AppLiquidNavItem(
          icon: CupertinoIcons.creditcard_fill,
          label: 'Fees',
        )
      else
        const AppLiquidNavItem(icon: Icons.fingerprint, label: 'Attend'),
      if (auth.isStudent)
        const AppLiquidNavItem(
          icon: CupertinoIcons.book_fill,
          label: 'Courses',
        )
      else
        const AppLiquidNavItem(
          icon: CupertinoIcons.chat_bubble_2_fill,
          label: 'Help',
        ),
      const AppLiquidNavItem(icon: CupertinoIcons.person_fill, label: 'Profile'),
    ];

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _onBack();
      },
      child: Scaffold(
        backgroundColor: AppColors.bg,
        body: Stack(
          fit: StackFit.expand,
          children: [
            PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              onPageChanged: (i) {
                _index.value = i;
                context.read<UiProvider>().setNavIndex(i);
              },
              children: pages,
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: ValueListenableBuilder<int>(
                valueListenable: _index,
                builder: (_, index, __) {
                  return AppLiquidNavBar(
                    currentIndex: index.clamp(0, pages.length - 1),
                    items: items,
                    onTap: _goTo,
                  );
                },
              ),
            ),
            // AI coach only on Home tab — hide on Tasks/Attend/Fees/Profile.
            Positioned(
              right: 10,
              bottom: AppResponsive.shellBottom(context) - 8,
              child: ValueListenableBuilder<int>(
                valueListenable: _index,
                builder: (_, index, __) {
                  if (index != 0) return const SizedBox.shrink();
                  return const AiCoachFab();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
