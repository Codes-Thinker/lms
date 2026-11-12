import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile_flutter/core/constants/app_brand.dart';
import 'package:mobile_flutter/core/mock_data.dart';
import 'package:mobile_flutter/main.dart';
import 'package:mobile_flutter/providers/attendance_provider.dart';
import 'package:mobile_flutter/providers/auth_provider.dart';
import 'package:mobile_flutter/providers/course_provider.dart';
import 'package:mobile_flutter/providers/fee_provider.dart';
import 'package:mobile_flutter/providers/progress_provider.dart';
import 'package:mobile_flutter/providers/support_provider.dart';
import 'package:mobile_flutter/providers/task_provider.dart';
import 'package:mobile_flutter/providers/ui_provider.dart';
import 'package:mobile_flutter/providers/version_provider.dart';
import 'package:mobile_flutter/views/auth/login_screen.dart';
import 'package:mobile_flutter/views/home/home_screen.dart';
import 'package:mobile_flutter/views/shell/app_shell.dart';
import 'package:mobile_flutter/views/splash/splash_screen.dart';
import 'package:mobile_flutter/views/teacher/teacher_home_screen.dart';
import 'package:mobile_flutter/widgets/brand_logo.dart';

Widget appHarness({
  required Widget home,
  AuthProvider? auth,
  CourseProvider? courses,
  TaskProvider? tasks,
}) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<UiProvider>(create: (_) => UiProvider()),
      ChangeNotifierProvider<AuthProvider>(create: (_) => auth ?? AuthProvider()),
      ChangeNotifierProvider<CourseProvider>(
        create: (_) => courses ?? CourseProvider(),
      ),
      ChangeNotifierProvider<ProgressProvider>(create: (_) => ProgressProvider()),
      ChangeNotifierProvider<TaskProvider>(create: (_) => tasks ?? TaskProvider()),
      ChangeNotifierProvider<AttendanceProvider>(create: (_) => AttendanceProvider()),
      ChangeNotifierProvider<FeeProvider>(create: (_) => FeeProvider()),
      ChangeNotifierProvider<SupportProvider>(create: (_) => SupportProvider()),
      ChangeNotifierProvider<VersionProvider>(create: (_) => VersionProvider()),
    ],
    child: MaterialApp(home: home),
  );
}

Future<void> pumpQuiet(WidgetTester tester, {int frames = 6}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 16));
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('splash shows brand LMS footer', (tester) async {
    await tester.pumpWidget(const CodesThinkerApp());
    await tester.pump();
    expect(find.byType(SplashScreen), findsOneWidget);
    expect(find.text(AppBrand.lms), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pump(const Duration(milliseconds: 1900));
  });

  testWidgets('login is responsive on narrow phone', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(appHarness(home: const LoginScreen()));
    await pumpQuiet(tester);

    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Student'), findsOneWidget);
    expect(find.text("Code's Thinker"), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('student home has no overflow on compact width', (tester) async {
    tester.view.physicalSize = const Size(360, 780);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final auth = AuthProvider()..useDemoSession(LoginRole.student);
    final courses = CourseProvider()..seedMockCourses();

    await tester.pumpWidget(
      appHarness(
        home: const Scaffold(body: HomeScreen()),
        auth: auth,
        courses: courses,
      ),
    );
    await pumpQuiet(tester, frames: 10);

    expect(find.text("Code's Thinker"), findsWidgets);
    expect(find.byType(BrandMark), findsOneWidget);
    expect(find.text(MockData.student.name), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('teacher home has no overflow', (tester) async {
    tester.view.physicalSize = const Size(360, 780);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final auth = AuthProvider()..useDemoSession(LoginRole.staff);

    await tester.pumpWidget(
      appHarness(
        home: const Scaffold(body: TeacherHomeScreen()),
        auth: auth,
      ),
    );
    await pumpQuiet(tester);

    expect(find.text("Code's Thinker"), findsOneWidget);
    expect(find.text(MockData.staff.name), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('liquid glass shell tabs render', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final auth = AuthProvider()..useDemoSession(LoginRole.student);
    final courses = CourseProvider()..seedMockCourses();
    final tasks = TaskProvider()..seedMockTasks();

    await tester.pumpWidget(
      appHarness(
        home: const AppShell(),
        auth: auth,
        courses: courses,
        tasks: tasks,
      ),
    );
    await pumpQuiet(tester, frames: 12);

    expect(find.text('Home'), findsWidgets);
    expect(find.text('Fees'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);

    await tester.tap(find.text('Profile'));
    await pumpQuiet(tester, frames: 20);
    expect(tester.takeException(), isNull);
  });

  testWidgets('brand assets load cleanly', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              BrandLogoBanner(height: 64),
              BrandMark(size: 40),
            ],
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.byType(BrandLogoBanner), findsOneWidget);
    expect(find.byType(BrandMark), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
