import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/constants/app_colors.dart';
import 'core/notification_router.dart';
import 'providers/attendance_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/course_provider.dart';
import 'providers/fee_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/progress_provider.dart';
import 'providers/support_provider.dart';
import 'providers/task_provider.dart';
import 'providers/teaching_provider.dart';
import 'providers/ui_provider.dart';
import 'providers/version_provider.dart';
import 'services/push_notification_service.dart';
import 'views/help/admin_chat_screen.dart';
import 'views/shell/app_shell.dart';
import 'views/splash/splash_screen.dart';
import 'widgets/app_loader.dart';
import 'widgets/app_snackbar.dart';
import 'widgets/force_update_sheet.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  try {
    await PushNotificationService.instance.init();
  } catch (e) {
    debugPrint('Push init skipped: $e');
  }
  runApp(const CodesThinkerApp());
}

class CodesThinkerApp extends StatefulWidget {
  const CodesThinkerApp({super.key});

  @override
  State<CodesThinkerApp> createState() => _CodesThinkerAppState();
}

class _CodesThinkerAppState extends State<CodesThinkerApp> {
  late final UiProvider _ui;
  late final AuthProvider _auth;

  @override
  void initState() {
    super.initState();
    _ui = UiProvider();
    _auth = AuthProvider();
    PushNotificationService.instance.bind(
      ui: _ui,
      currentUserId: () => _auth.user?.id,
      onOpenInApp: _openFromNotification,
    );
  }

  void _openFromNotification(String type) {
    final upper = type.toUpperCase();
    final tab = NotificationRouter.tabForType(type);
    _ui.setNavIndex(tab);

    final nav = appNavigatorKey.currentState;
    if (nav == null) return;

    if (!_auth.isAuthenticated) {
      // Session not ready — splash/login will consume pending type.
      return;
    }

    // Jump to shell, then open Code's Thinker chat when it's a CHAT push.
    nav.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const AppShell()),
      (route) => false,
    );

    if (upper == 'CHAT') {
      NotificationRouter.openAdminChat = true;
      Future<void>.delayed(const Duration(milliseconds: 280), () {
        final n = appNavigatorKey.currentState;
        if (n == null) return;
        n.push(
          MaterialPageRoute(builder: (_) => const AdminChatScreen()),
        );
        NotificationRouter.takeOpenAdminChat();
      });
    }

    NotificationRouter.clear();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _ui),
        ChangeNotifierProvider.value(value: _auth),
        ChangeNotifierProvider(create: (_) => CourseProvider()),
        ChangeNotifierProvider(create: (_) => ProgressProvider()),
        ChangeNotifierProvider(create: (_) => TaskProvider()),
        ChangeNotifierProvider(create: (_) => AttendanceProvider()),
        ChangeNotifierProvider(create: (_) => FeeProvider()),
        ChangeNotifierProvider(create: (_) => SupportProvider()),
        ChangeNotifierProvider(create: (_) => TeachingProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => VersionProvider()),
      ],
      child: MaterialApp(
        navigatorKey: appNavigatorKey,
        title: "Code's Thinker LMS",
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.light,
          scaffoldBackgroundColor: AppColors.bg,
          fontFamily: null,
          colorScheme: const ColorScheme.light(
            primary: AppColors.blue,
            secondary: AppColors.blueDark,
            tertiary: AppColors.blue,
            surface: AppColors.card,
            onSurface: AppColors.ink,
          ),
          textTheme: const TextTheme(
            headlineMedium: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.ink),
            titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.ink),
            titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.ink),
            bodyLarge: TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: AppColors.ink),
            bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.ink),
            bodySmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.muted),
          ),
          progressIndicatorTheme: const ProgressIndicatorThemeData(
            color: AppColors.blue,
          ),
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.transparent,
            foregroundColor: AppColors.ink,
            elevation: 0,
            scrolledUnderElevation: 0,
            surfaceTintColor: Colors.transparent,
            titleTextStyle: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.ink,
            ),
          ),
          cardTheme: const CardThemeData(
            elevation: 0,
            shadowColor: Colors.transparent,
            surfaceTintColor: Colors.transparent,
            color: AppColors.card,
            margin: EdgeInsets.zero,
          ),
          dialogTheme: const DialogThemeData(
            elevation: 0,
            shadowColor: Colors.transparent,
            surfaceTintColor: Colors.transparent,
          ),
          bottomSheetTheme: const BottomSheetThemeData(
            elevation: 0,
            shadowColor: Colors.transparent,
            surfaceTintColor: Colors.transparent,
            backgroundColor: Colors.white,
          ),
          pageTransitionsTheme: const PageTransitionsTheme(
            builders: {
              TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
              TargetPlatform.iOS: ZoomPageTransitionsBuilder(),
              TargetPlatform.macOS: FadeUpwardsPageTransitionsBuilder(),
            },
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.blue,
              foregroundColor: Colors.white,
              elevation: 0,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(100),
              ),
            ),
          ),
          outlinedButtonTheme: OutlinedButtonThemeData(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.ink,
              side: const BorderSide(color: AppColors.line),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(100),
              ),
            ),
          ),
          splashFactory: InkRipple.splashFactory,
          useMaterial3: true,
        ),
        builder: (context, child) {
          final ui = context.watch<UiProvider>();
          return ForceUpdateGate(
            child: AppSnackHost(
              child: AppLoadingOverlay(
                loading: ui.globalLoading,
                child: child ?? const SizedBox.shrink(),
              ),
            ),
          );
        },
        home: const SplashScreen(),
      ),
    );
  }
}
