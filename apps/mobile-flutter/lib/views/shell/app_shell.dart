import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_liquid_nav_bar.dart';
import '../home/home_screen.dart';
import '../attendance/attendance_screen.dart';
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
  }

  @override
  void dispose() {
    _pageController.dispose();
    _index.dispose();
    super.dispose();
  }

  void _goTo(int index) {
    final ui = context.read<UiProvider>();
    if (_index.value == index) return;
    _index.value = index;
    ui.setNavIndex(index);
    // Direct jump to ANY tab (Home → Profile OK) — no one-by-one flash.
    if (_pageController.hasClients) {
      _pageController.jumpToPage(index);
    }
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

    final pages = <Widget>[
      if (auth.isStaff) const TeacherHomeScreen() else const HomeScreen(),
      const TasksScreen(),
      const AttendanceScreen(),
      if (auth.isStudent) const FeesScreen() else const HelpHubScreen(),
      const ProfileScreen(),
    ];

    final items = <AppLiquidNavItem>[
      const AppLiquidNavItem(label: 'Home', useBrandMark: true),
      AppLiquidNavItem(
        icon: CupertinoIcons.checkmark_seal_fill,
        label: auth.isIntern
            ? 'Projects'
            : auth.isStaff
                ? 'Staff'
                : 'Tasks',
      ),
      const AppLiquidNavItem(icon: Icons.fingerprint, label: 'Attend'),
      AppLiquidNavItem(
        icon: auth.isStudent
            ? CupertinoIcons.creditcard_fill
            : CupertinoIcons.chat_bubble_2_fill,
        label: auth.isStudent ? 'Fees' : 'Help',
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
          ],
        ),
      ),
    );
  }
}
