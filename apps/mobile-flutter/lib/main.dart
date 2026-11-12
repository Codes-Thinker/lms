import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/constants/app_colors.dart';
import 'providers/attendance_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/course_provider.dart';
import 'providers/fee_provider.dart';
import 'providers/progress_provider.dart';
import 'providers/support_provider.dart';
import 'providers/task_provider.dart';
import 'providers/ui_provider.dart';
import 'providers/version_provider.dart';
import 'views/splash/splash_screen.dart';
import 'widgets/app_loader.dart';
import 'widgets/app_snackbar.dart';
import 'widgets/force_update_sheet.dart';

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
  runApp(const CodesThinkerApp());
}

class CodesThinkerApp extends StatelessWidget {
  const CodesThinkerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => UiProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CourseProvider()),
        ChangeNotifierProvider(create: (_) => ProgressProvider()),
        ChangeNotifierProvider(create: (_) => TaskProvider()),
        ChangeNotifierProvider(create: (_) => AttendanceProvider()),
        ChangeNotifierProvider(create: (_) => FeeProvider()),
        ChangeNotifierProvider(create: (_) => SupportProvider()),
        ChangeNotifierProvider(create: (_) => VersionProvider()),
      ],
      child: MaterialApp(
        title: "Code's Thinker LMS",
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.light,
          scaffoldBackgroundColor: AppColors.bg,
          // Platform default font (original) — no custom family.
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
          // Single global loader only — never stack with button spinners.
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
