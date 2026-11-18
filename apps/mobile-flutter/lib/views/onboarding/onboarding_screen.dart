import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../services/onboarding_prefs.dart';
import '../../widgets/ct_mark.dart';

class _OnboardPage {
  final String title;
  final String body;
  final _SceneKind scene;

  const _OnboardPage({
    required this.title,
    required this.body,
    required this.scene,
  });
}

enum _SceneKind { welcome, learn, team, sync }

const _pages = <_OnboardPage>[
  _OnboardPage(
    title: 'Welcome to ${AppBrand.shortName}',
    body:
        'Turn Ideas into Reality. Your campus for courses, projects, and growth — built for students, teachers, and interns.',
    scene: _SceneKind.welcome,
  ),
  _OnboardPage(
    title: 'Learn by building',
    body:
        'Follow live courses, mark lectures done, and get help from the AI Study Coach whenever you are stuck.',
    scene: _SceneKind.learn,
  ),
  _OnboardPage(
    title: 'Built for every role',
    body:
        'Students track classes and fees. Teachers run batches. Interns ship real projects — all in one clean app.',
    scene: _SceneKind.team,
  ),
  _OnboardPage(
    title: 'Stay in sync',
    body:
        'Attendance, tasks, fees, and chat stay updated with the admin dashboard — no mismatched info.',
    scene: _SceneKind.sync,
  ),
];

/// First-launch animated intro. Shown once per install after splash.
class OnboardingScreen extends StatefulWidget {
  final Widget next;

  const OnboardingScreen({super.key, required this.next});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with SingleTickerProviderStateMixin {
  final _page = PageController();
  final _index = ValueNotifier<int>(0);
  late final AnimationController _loop;

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
      ),
    );
    _loop = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    )..repeat();
  }

  @override
  void dispose() {
    _page.dispose();
    _index.dispose();
    _loop.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await OnboardingPrefs.markCompleted();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(AppMotion.fadeSlide(widget.next));
  }

  void _next() {
    final i = _index.value;
    if (i >= _pages.length - 1) {
      _finish();
      return;
    }
    _page.animateToPage(
      i + 1,
      duration: AppMotion.normal,
      curve: AppMotion.curve,
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
              child: Row(
                children: [
                  const SizedBox(width: 8),
                  const CtMark(size: 34),
                  const SizedBox(width: 10),
                  const Text(
                    AppBrand.shortName,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                      color: AppColors.ink,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const Spacer(),
                  ValueListenableBuilder<int>(
                    valueListenable: _index,
                    builder: (_, i, __) {
                      if (i >= _pages.length - 1) {
                        return const SizedBox(width: 64);
                      }
                      return TextButton(
                        onPressed: _finish,
                        child: const Text(
                          'Skip',
                          style: TextStyle(
                            color: AppColors.muted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _page,
                itemCount: _pages.length,
                onPageChanged: (i) => _index.value = i,
                itemBuilder: (context, i) {
                  final p = _pages[i];
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 8),
                    child: Column(
                      children: [
                        Expanded(
                          flex: 5,
                          child: AnimatedBuilder(
                            animation: _loop,
                            builder: (_, __) => _GifScene(
                              kind: p.scene,
                              t: _loop.value,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Expanded(
                          flex: 3,
                          child: Column(
                            children: [
                              Text(
                                p.title,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.ink,
                                  height: 1.15,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                p.body,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 15,
                                  height: 1.45,
                                  color: AppColors.muted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(24, 0, 24, 16 + bottom),
              child: ValueListenableBuilder<int>(
                valueListenable: _index,
                builder: (_, i, __) {
                  final last = i >= _pages.length - 1;
                  return Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(_pages.length, (dot) {
                          final active = dot == i;
                          return AnimatedContainer(
                            duration: AppMotion.fast,
                            curve: AppMotion.curve,
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            height: 8,
                            width: active ? 22 : 8,
                            decoration: BoxDecoration(
                              color: active
                                  ? AppColors.blue
                                  : AppColors.line,
                              borderRadius: BorderRadius.circular(100),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: FilledButton(
                          onPressed: last ? _finish : _next,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.blueDark,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            textStyle: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                          child: Text(last ? 'Get started' : 'Continue'),
                        ),
                      ),
                    ],
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

/// Looping “GIF-style” hero for each onboarding page.
class _GifScene extends StatelessWidget {
  final _SceneKind kind;
  final double t;

  const _GifScene({required this.kind, required this.t});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1A1C2E),
            Color(0xFF1E3A5F),
            Color(0xFF2563EB),
          ],
          stops: [0.0, 0.55, 1.0],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.blue.withValues(alpha: 0.18),
            blurRadius: 28,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          _FloatingOrbs(t: t),
          Center(
            child: switch (kind) {
              _SceneKind.welcome => _WelcomeAnim(t: t),
              _SceneKind.learn => _LearnAnim(t: t),
              _SceneKind.team => _TeamAnim(t: t),
              _SceneKind.sync => _SyncAnim(t: t),
            },
          ),
        ],
      ),
    );
  }
}

class _FloatingOrbs extends StatelessWidget {
  final double t;

  const _FloatingOrbs({required this.t});

  @override
  Widget build(BuildContext context) {
    final dx = math.sin(t * math.pi * 2) * 18;
    final dy = math.cos(t * math.pi * 2) * 12;
    return Stack(
      children: [
        Positioned(
          left: -40 + dx,
          top: 36 + dy,
          child: _blob(140, 0.16),
        ),
        Positioned(
          right: -30 - dx,
          bottom: 28 - dy,
          child: _blob(160, 0.12),
        ),
      ],
    );
  }

  Widget _blob(double size, double alpha) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: alpha),
      ),
    );
  }
}

class _WelcomeAnim extends StatelessWidget {
  final double t;

  const _WelcomeAnim({required this.t});

  @override
  Widget build(BuildContext context) {
    final bob = math.sin(t * math.pi * 2) * 8;
    final glow = 0.35 + 0.2 * math.sin(t * math.pi * 2);
    return Transform.translate(
      offset: Offset(0, bob),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 112,
            height: 112,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.white.withValues(alpha: glow),
                  blurRadius: 36,
                  spreadRadius: 4,
                ),
              ],
            ),
            alignment: Alignment.center,
            child: const CtMark(size: 68),
          ),
          const SizedBox(height: 18),
          Text(
            AppBrand.tagline,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.92),
              fontWeight: FontWeight.w700,
              fontSize: 15,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

class _LearnAnim extends StatelessWidget {
  final double t;

  const _LearnAnim({required this.t});

  @override
  Widget build(BuildContext context) {
    final pulse = 0.92 + 0.08 * math.sin(t * math.pi * 2);
    return Transform.scale(
      scale: pulse,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _glassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _codeLine('course.progress', '82%', t, 0),
                const SizedBox(height: 10),
                _codeLine('ai.coach', 'ready', t, 0.25),
                const SizedBox(height: 10),
                _codeLine('next.lecture', 'Widgets', t, 0.5),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _pill(Icons.menu_book_rounded, 'Courses'),
              const SizedBox(width: 8),
              _pill(Icons.smart_toy_outlined, 'AI Coach'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _codeLine(String key, String value, double t, double phase) {
    final on = ((t + phase) % 1.0) < 0.72;
    return Row(
      children: [
        Text(
          key,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.7),
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const Spacer(),
        Opacity(
          opacity: on ? 1 : 0.35,
          child: Text(
            value,
            style: const TextStyle(
              color: Color(0xFF93C5FD),
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }
}

class _TeamAnim extends StatelessWidget {
  final double t;

  const _TeamAnim({required this.t});

  @override
  Widget build(BuildContext context) {
    final lift = math.sin(t * math.pi * 2) * 6;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Transform.translate(
              offset: Offset(0, -lift),
              child: _roleChip(Icons.school_rounded, 'Student'),
            ),
            const SizedBox(width: 10),
            Transform.translate(
              offset: Offset(0, lift),
              child: _roleChip(Icons.cast_for_education_rounded, 'Teacher'),
            ),
            const SizedBox(width: 10),
            Transform.translate(
              offset: Offset(0, -lift * 0.6),
              child: _roleChip(Icons.rocket_launch_rounded, 'Intern'),
            ),
          ],
        ),
        const SizedBox(height: 18),
        _glassCard(
          child: Row(
            children: [
              Icon(Icons.groups_rounded,
                  color: Colors.white.withValues(alpha: 0.9), size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'One portal. Three journeys.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.92),
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _roleChip(IconData icon, String label) {
    return Container(
      width: 86,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
      ),
      child: Column(
        children: [
          Icon(icon, color: Colors.white, size: 26),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _SyncAnim extends StatelessWidget {
  final double t;

  const _SyncAnim({required this.t});

  @override
  Widget build(BuildContext context) {
    final spin = t * math.pi * 2;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 88,
          height: 88,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Transform.rotate(
                angle: spin,
                child: Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.28),
                      width: 2,
                    ),
                  ),
                  child: Align(
                    alignment: Alignment.topCenter,
                    child: Container(
                      width: 10,
                      height: 10,
                      margin: const EdgeInsets.only(top: 4),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ),
              ),
              Icon(
                Icons.sync_rounded,
                color: Colors.white.withValues(alpha: 0.95),
                size: 36,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: [
            _pill(Icons.fact_check_rounded, 'Attendance'),
            _pill(Icons.payments_outlined, 'Fees'),
            _pill(Icons.task_alt_rounded, 'Tasks'),
            _pill(Icons.chat_bubble_outline_rounded, 'Chat'),
          ],
        ),
      ],
    );
  }
}

Widget _glassCard({required Widget child}) {
  return Container(
    width: 280,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
    ),
    child: child,
  );
}

Widget _pill(IconData icon, String label) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.14),
      borderRadius: BorderRadius.circular(100),
      border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: Colors.white),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ],
    ),
  );
}
