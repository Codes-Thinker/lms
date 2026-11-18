import 'dart:math' as math;
import 'dart:ui';

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
        'Your campus for courses, projects, and real growth. Built for students, teachers, and interns.',
    scene: _SceneKind.welcome,
  ),
  _OnboardPage(
    title: 'Learn by building',
    body:
        'Follow live courses, finish lectures at your pace, and get help from the AI Study Coach when you need it.',
    scene: _SceneKind.learn,
  ),
  _OnboardPage(
    title: 'Built for every role',
    body:
        'Students track classes and fees. Teachers run batches. Interns ship real projects in one place.',
    scene: _SceneKind.team,
  ),
  _OnboardPage(
    title: 'Always up to date',
    body:
        'Attendance, tasks, fees, and chat stay in sync with the admin dashboard. What you see is what staff set.',
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
    with TickerProviderStateMixin {
  final _page = PageController();
  final _index = ValueNotifier<int>(0);
  late final AnimationController _loop;
  late final AnimationController _ctaPulse;

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
      duration: const Duration(milliseconds: 4200),
    )..repeat();
    _ctaPulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _page.dispose();
    _index.dispose();
    _loop.dispose();
    _ctaPulse.dispose();
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
      body: Stack(
        children: [
          // Soft ambient wash behind the open hero (no hard card edge).
          Positioned(
            top: 72,
            left: -40,
            right: -40,
            height: MediaQuery.sizeOf(context).height * 0.42,
            child: AnimatedBuilder(
              animation: _loop,
              builder: (_, __) {
                final drift = math.sin(_loop.value * math.pi * 2) * 12;
                return IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        center: Alignment(0, -0.2 + drift / 80),
                        radius: 0.95,
                        colors: [
                          const Color(0xFF2563EB).withValues(alpha: 0.14),
                          const Color(0xFF2563EB).withValues(alpha: 0.04),
                          Colors.transparent,
                        ],
                        stops: const [0.0, 0.45, 1.0],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 6, 8, 0),
                  child: Row(
                    children: [
                      const CtMark(size: 32),
                      const SizedBox(width: 10),
                      const Text(
                        AppBrand.shortName,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: AppColors.ink,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const Spacer(),
                      ValueListenableBuilder<int>(
                        valueListenable: _index,
                        builder: (_, i, __) {
                          if (i >= _pages.length - 1) {
                            return const SizedBox(width: 56);
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
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                        child: Column(
                          children: [
                            Expanded(
                              flex: 11,
                              child: AnimatedBuilder(
                                animation: _loop,
                                builder: (_, __) => _OpenScene(
                                  kind: p.scene,
                                  t: _loop.value,
                                ),
                              ),
                            ),
                            Expanded(
                              flex: 7,
                              child: Column(
                                children: [
                                  const SizedBox(height: 8),
                                  Text(
                                    p.title,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontSize: 27,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.ink,
                                      height: 1.12,
                                      letterSpacing: -0.6,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    p.body,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      height: 1.5,
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
                  padding: EdgeInsets.fromLTRB(24, 0, 24, 14 + bottom),
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
                                margin:
                                    const EdgeInsets.symmetric(horizontal: 3.5),
                                height: 6,
                                width: active ? 20 : 6,
                                decoration: BoxDecoration(
                                  color: active
                                      ? AppColors.blue
                                      : AppColors.line,
                                  borderRadius: BorderRadius.circular(100),
                                ),
                              );
                            }),
                          ),
                          const SizedBox(height: 16),
                          _SlimCtaButton(
                            label: last ? 'Get started' : 'Continue',
                            icon: last
                                ? Icons.arrow_forward_rounded
                                : Icons.arrow_forward_ios_rounded,
                            pulse: _ctaPulse,
                            onTap: last ? _finish : _next,
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Slim animated CTA with icon and soft outer glow (not a heavy block).
class _SlimCtaButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final AnimationController pulse;
  final VoidCallback onTap;

  const _SlimCtaButton({
    required this.label,
    required this.icon,
    required this.pulse,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: pulse,
      builder: (_, __) {
        final glow = 0.12 + pulse.value * 0.14;
        final slide = (pulse.value - 0.5) * 3;
        return PressableScale(
          onTap: onTap,
          child: Container(
            width: double.infinity,
            height: 46,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(100),
              gradient: const LinearGradient(
                colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.blue.withValues(alpha: glow),
                  blurRadius: 18,
                  spreadRadius: 0,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              children: [
                // Soft shimmer sweep
                Positioned.fill(
                  child: IgnorePointer(
                    child: Transform.translate(
                      offset: Offset(
                        (pulse.value * 2 - 1) *
                            MediaQuery.sizeOf(context).width *
                            0.35,
                        0,
                      ),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.white.withValues(alpha: 0),
                              Colors.white.withValues(alpha: 0.18),
                              Colors.white.withValues(alpha: 0),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        label,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          letterSpacing: 0.1,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Transform.translate(
                        offset: Offset(slide, 0),
                        child: Icon(icon, color: Colors.white, size: 16),
                      ),
                    ],
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

/// Open hero: floating art with soft glow, no bordered card frame.
class _OpenScene extends StatelessWidget {
  final _SceneKind kind;
  final double t;

  const _OpenScene({required this.kind, required this.t});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      clipBehavior: Clip.none,
      children: [
        _AmbientGlow(t: t),
        switch (kind) {
          _SceneKind.welcome => _WelcomeAnim(t: t),
          _SceneKind.learn => _LearnAnim(t: t),
          _SceneKind.team => _TeamAnim(t: t),
          _SceneKind.sync => _SyncAnim(t: t),
        },
      ],
    );
  }
}

class _AmbientGlow extends StatelessWidget {
  final double t;

  const _AmbientGlow({required this.t});

  @override
  Widget build(BuildContext context) {
    final dx = math.sin(t * math.pi * 2) * 22;
    final dy = math.cos(t * math.pi * 2) * 14;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(
          left: 24 + dx,
          top: 28 + dy,
          child: _softOrb(150, const Color(0xFF60A5FA), 0.28),
        ),
        Positioned(
          right: 8 - dx,
          bottom: 18 - dy,
          child: _softOrb(170, const Color(0xFF2563EB), 0.22),
        ),
        Positioned(
          right: 72 + dx * 0.4,
          top: 48,
          child: _softOrb(70, Colors.white, 0.35),
        ),
      ],
    );
  }

  Widget _softOrb(double size, Color color, double alpha) {
    return ImageFiltered(
      imageFilter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color.withValues(alpha: alpha),
        ),
      ),
    );
  }
}

class _WelcomeAnim extends StatelessWidget {
  final double t;

  const _WelcomeAnim({required this.t});

  @override
  Widget build(BuildContext context) {
    final bob = math.sin(t * math.pi * 2) * 10;
    final ring = 1.0 + 0.04 * math.sin(t * math.pi * 2);
    final glow = 0.22 + 0.18 * math.sin(t * math.pi * 2);

    return Transform.translate(
      offset: Offset(0, bob),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 168,
            height: 168,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Transform.scale(
                  scale: ring,
                  child: Container(
                    width: 148,
                    height: 148,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.blue.withValues(alpha: 0.2),
                        width: 1.2,
                      ),
                    ),
                  ),
                ),
                Container(
                  width: 118,
                  height: 118,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.blue.withValues(alpha: glow),
                        blurRadius: 42,
                        spreadRadius: 2,
                      ),
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: const CtMark(size: 72),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Text(
            AppBrand.tagline,
            style: TextStyle(
              color: AppColors.ink.withValues(alpha: 0.78),
              fontWeight: FontWeight.w700,
              fontSize: 14.5,
              letterSpacing: 0.15,
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
    final floatA = math.sin(t * math.pi * 2) * 8;
    final floatB = math.cos(t * math.pi * 2) * 7;
    return Stack(
      alignment: Alignment.center,
      clipBehavior: Clip.none,
      children: [
        Transform.translate(
          offset: Offset(-8, floatA),
          child: _frostPanel(
            width: 250,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _metricRow('Course progress', '82%', t, 0),
                const SizedBox(height: 12),
                _metricRow('AI Study Coach', 'Ready', t, 0.22),
                const SizedBox(height: 12),
                _metricRow('Next lecture', 'Widgets', t, 0.44),
              ],
            ),
          ),
        ),
        Positioned(
          bottom: 18,
          child: Transform.translate(
            offset: Offset(0, floatB),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _floatChip(Icons.menu_book_rounded, 'Courses'),
                const SizedBox(width: 10),
                _floatChip(Icons.smart_toy_outlined, 'AI Coach'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _metricRow(String label, String value, double t, double phase) {
    final on = ((t + phase) % 1.0) < 0.7;
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              color: AppColors.ink.withValues(alpha: 0.55),
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Opacity(
          opacity: on ? 1 : 0.4,
          child: Text(
            value,
            style: const TextStyle(
              color: AppColors.blueDark,
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
    final lift = math.sin(t * math.pi * 2) * 8;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Transform.translate(
              offset: Offset(0, -lift),
              child: _roleOrb(Icons.school_rounded, 'Student'),
            ),
            const SizedBox(width: 14),
            Transform.translate(
              offset: Offset(0, lift),
              child: _roleOrb(Icons.cast_for_education_rounded, 'Teacher'),
            ),
            const SizedBox(width: 14),
            Transform.translate(
              offset: Offset(0, -lift * 0.55),
              child: _roleOrb(Icons.rocket_launch_rounded, 'Intern'),
            ),
          ],
        ),
        const SizedBox(height: 22),
        Text(
          'One portal. Three journeys.',
          style: TextStyle(
            color: AppColors.ink.withValues(alpha: 0.7),
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _roleOrb(IconData icon, String label) {
    return Column(
      children: [
        Container(
          width: 78,
          height: 78,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: AppColors.blue.withValues(alpha: 0.16),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Icon(icon, color: AppColors.blueDark, size: 30),
        ),
        const SizedBox(height: 10),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.ink,
            fontWeight: FontWeight.w700,
            fontSize: 12.5,
          ),
        ),
      ],
    );
  }
}

class _SyncAnim extends StatelessWidget {
  final double t;

  const _SyncAnim({required this.t});

  @override
  Widget build(BuildContext context) {
    final spin = t * math.pi * 2;
    final bob = math.sin(t * math.pi * 2) * 6;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Transform.translate(
          offset: Offset(0, bob),
          child: SizedBox(
            width: 110,
            height: 110,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Transform.rotate(
                  angle: spin,
                  child: CustomPaint(
                    size: const Size(110, 110),
                    painter: _OrbitPainter(
                      color: AppColors.blue.withValues(alpha: 0.35),
                    ),
                  ),
                ),
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.blue.withValues(alpha: 0.2),
                        blurRadius: 28,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.sync_rounded,
                    color: AppColors.blueDark,
                    size: 30,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 22),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          alignment: WrapAlignment.center,
          children: [
            _floatChip(Icons.fact_check_rounded, 'Attendance'),
            _floatChip(Icons.payments_outlined, 'Fees'),
            _floatChip(Icons.task_alt_rounded, 'Tasks'),
            _floatChip(Icons.chat_bubble_outline_rounded, 'Chat'),
          ],
        ),
      ],
    );
  }
}

class _OrbitPainter extends CustomPainter {
  final Color color;

  _OrbitPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 4;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6;
    canvas.drawCircle(center, radius, paint);
    final dot = Paint()..color = AppColors.blueDark;
    canvas.drawCircle(Offset(center.dx, center.dy - radius), 4.5, dot);
  }

  @override
  bool shouldRepaint(covariant _OrbitPainter oldDelegate) =>
      oldDelegate.color != color;
}

Widget _frostPanel({required double width, required Widget child}) {
  return ClipRRect(
    borderRadius: BorderRadius.circular(24),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
      child: Container(
        width: width,
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.82),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: AppColors.blue.withValues(alpha: 0.1),
              blurRadius: 28,
              offset: const Offset(0, 14),
            ),
          ],
        ),
        child: child,
      ),
    ),
  );
}

Widget _floatChip(IconData icon, String label) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(100),
      boxShadow: [
        BoxShadow(
          color: AppColors.blue.withValues(alpha: 0.12),
          blurRadius: 16,
          offset: const Offset(0, 6),
        ),
      ],
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: AppColors.blueDark),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.ink,
            fontWeight: FontWeight.w700,
            fontSize: 12,
          ),
        ),
      ],
    ),
  );
}
