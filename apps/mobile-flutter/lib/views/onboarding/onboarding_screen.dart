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
  late final AnimationController _cta;

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
      duration: const Duration(milliseconds: 5200),
    )..repeat();
    _cta = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _page.dispose();
    _index.dispose();
    _loop.dispose();
    _cta.dispose();
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
    final size = MediaQuery.sizeOf(context);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Full-screen living blur (not clipped into a card).
          AnimatedBuilder(
            animation: _loop,
            builder: (_, __) => _FullScreenBlurField(t: _loop.value, size: size),
          ),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 6, 8, 0),
                  child: Row(
                    children: [
                      const CtMark(size: 30),
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
                        padding: const EdgeInsets.fromLTRB(22, 0, 22, 0),
                        child: Column(
                          children: [
                            Expanded(
                              flex: 12,
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
                          _EmojiCtaButton(
                            label: last ? 'Get started' : 'Continue',
                            emoji: last ? '🚀' : '✨',
                            loop: _cta,
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

/// Soft blurred color field that fills the whole screen and slowly drifts.
class _FullScreenBlurField extends StatelessWidget {
  final double t;
  final Size size;

  const _FullScreenBlurField({required this.t, required this.size});

  @override
  Widget build(BuildContext context) {
    final a = t * math.pi * 2;
    return Stack(
      fit: StackFit.expand,
      children: [
        const ColoredBox(color: AppColors.bg),
        Positioned(
          left: size.width * 0.05 + math.sin(a) * 36,
          top: size.height * 0.08 + math.cos(a) * 28,
          child: _blurBlob(220, const Color(0xFF60A5FA), 0.34),
        ),
        Positioned(
          right: size.width * 0.0 - math.sin(a * 0.9) * 40,
          top: size.height * 0.28 + math.sin(a) * 22,
          child: _blurBlob(260, const Color(0xFF2563EB), 0.26),
        ),
        Positioned(
          left: size.width * 0.18 + math.cos(a) * 30,
          bottom: size.height * 0.18 - math.sin(a) * 24,
          child: _blurBlob(200, const Color(0xFF93C5FD), 0.3),
        ),
        Positioned(
          right: size.width * 0.12 + math.sin(a * 1.2) * 26,
          bottom: size.height * 0.08 + math.cos(a * 0.8) * 20,
          child: _blurBlob(160, const Color(0xFF3B82F6), 0.22),
        ),
        // Soft frost veil so content stays readable.
        BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 0.5, sigmaY: 0.5),
          child: ColoredBox(
            color: Colors.white.withValues(alpha: 0.18),
          ),
        ),
      ],
    );
  }

  Widget _blurBlob(double size, Color color, double alpha) {
    return ImageFiltered(
      imageFilter: ImageFilter.blur(sigmaX: 48, sigmaY: 48),
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

/// Slim CTA with a bouncing forward emoji instead of a Material icon.
class _EmojiCtaButton extends StatelessWidget {
  final String label;
  final String emoji;
  final AnimationController loop;
  final VoidCallback onTap;

  const _EmojiCtaButton({
    required this.label,
    required this.emoji,
    required this.loop,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: loop,
      builder: (_, __) {
        // Loop: nudge right + soft scale like a tiny GIF.
        final wave = math.sin(loop.value * math.pi * 2);
        final dx = 2 + wave * 5;
        final scale = 1 + wave.abs() * 0.08;
        final glow = 0.14 + wave.abs() * 0.1;

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
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
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
                  offset: Offset(dx, 0),
                  child: Transform.scale(
                    scale: scale,
                    child: Text(
                      emoji,
                      style: const TextStyle(fontSize: 18, height: 1),
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

/// Borderless floating scene art (no cards / panels).
class _OpenScene extends StatelessWidget {
  final _SceneKind kind;
  final double t;

  const _OpenScene({required this.kind, required this.t});

  @override
  Widget build(BuildContext context) {
    return switch (kind) {
      _SceneKind.welcome => _WelcomeAnim(t: t),
      _SceneKind.learn => _LearnAnim(t: t),
      _SceneKind.team => _TeamAnim(t: t),
      _SceneKind.sync => _SyncAnim(t: t),
    };
  }
}

class _WelcomeAnim extends StatelessWidget {
  final double t;

  const _WelcomeAnim({required this.t});

  @override
  Widget build(BuildContext context) {
    final bob = math.sin(t * math.pi * 2) * 10;
    final spark = 0.75 + 0.25 * math.sin(t * math.pi * 2);

    return Stack(
      alignment: Alignment.center,
      clipBehavior: Clip.none,
      children: [
        Transform.translate(
          offset: Offset(0, bob),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 124,
                height: 124,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.92),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.blue.withValues(alpha: 0.22),
                      blurRadius: 40,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: const CtMark(size: 74),
              ),
              const SizedBox(height: 18),
              Text(
                AppBrand.tagline,
                style: TextStyle(
                  color: AppColors.ink.withValues(alpha: 0.78),
                  fontWeight: FontWeight.w700,
                  fontSize: 14.5,
                ),
              ),
            ],
          ),
        ),
        Positioned(
          left: 28,
          top: 42,
          child: Opacity(
            opacity: spark,
            child: Transform.translate(
              offset: Offset(0, -bob * 0.4),
              child: const Text('✨', style: TextStyle(fontSize: 28)),
            ),
          ),
        ),
        Positioned(
          right: 36,
          top: 64,
          child: Opacity(
            opacity: 1.15 - spark,
            child: Transform.translate(
              offset: Offset(0, bob * 0.5),
              child: const Text('💡', style: TextStyle(fontSize: 26)),
            ),
          ),
        ),
        Positioned(
          right: 48,
          bottom: 36,
          child: Transform.translate(
            offset: Offset(math.sin(t * math.pi * 2) * 6, 0),
            child: const Text('🚀', style: TextStyle(fontSize: 30)),
          ),
        ),
      ],
    );
  }
}

class _LearnAnim extends StatelessWidget {
  final double t;

  const _LearnAnim({required this.t});

  @override
  Widget build(BuildContext context) {
    final a = math.sin(t * math.pi * 2) * 10;
    final b = math.cos(t * math.pi * 2) * 8;

    return Stack(
      alignment: Alignment.center,
      clipBehavior: Clip.none,
      children: [
        Transform.translate(
          offset: Offset(-70, -36 + a),
          child: const Text('📚', style: TextStyle(fontSize: 64)),
        ),
        Transform.translate(
          offset: Offset(68, -10 + b),
          child: const Text('🤖', style: TextStyle(fontSize: 58)),
        ),
        Transform.translate(
          offset: Offset(0, 58 + a * 0.4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _floatingStat('Course progress', '82%', t, 0),
              const SizedBox(height: 10),
              _floatingStat('AI Study Coach', 'Ready', t, 0.2),
              const SizedBox(height: 10),
              _floatingStat('Next lecture', 'Widgets', t, 0.4),
            ],
          ),
        ),
        Positioned(
          left: 24,
          bottom: 28,
          child: Transform.translate(
            offset: Offset(0, -b),
            child: const Text('🧠', style: TextStyle(fontSize: 28)),
          ),
        ),
        Positioned(
          right: 22,
          bottom: 40,
          child: Transform.translate(
            offset: Offset(0, a * 0.5),
            child: const Text('⚡', style: TextStyle(fontSize: 26)),
          ),
        ),
      ],
    );
  }

  Widget _floatingStat(String label, String value, double t, double phase) {
    final on = ((t + phase) % 1.0) < 0.72;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: TextStyle(
            color: AppColors.ink.withValues(alpha: 0.55),
            fontWeight: FontWeight.w600,
            fontSize: 13.5,
          ),
        ),
        const SizedBox(width: 10),
        Opacity(
          opacity: on ? 1 : 0.35,
          child: Text(
            value,
            style: const TextStyle(
              color: AppColors.blueDark,
              fontWeight: FontWeight.w800,
              fontSize: 13.5,
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
    final lift = math.sin(t * math.pi * 2) * 9;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Transform.translate(
              offset: Offset(0, -lift),
              child: _emojiRole('🎓', 'Student'),
            ),
            const SizedBox(width: 22),
            Transform.translate(
              offset: Offset(0, lift),
              child: _emojiRole('👨‍🏫', 'Teacher'),
            ),
            const SizedBox(width: 22),
            Transform.translate(
              offset: Offset(0, -lift * 0.55),
              child: _emojiRole('🧑‍💻', 'Intern'),
            ),
          ],
        ),
        const SizedBox(height: 26),
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

  Widget _emojiRole(String emoji, String label) {
    return Column(
      children: [
        Text(emoji, style: const TextStyle(fontSize: 52)),
        const SizedBox(height: 8),
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
    final bob = math.sin(t * math.pi * 2) * 8;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 160,
          height: 160,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Transform.rotate(
                angle: spin,
                child: const Text('🔄', style: TextStyle(fontSize: 64)),
              ),
              Transform.translate(
                offset: Offset(math.cos(spin) * 58, math.sin(spin) * 58),
                child: const Text('✅', style: TextStyle(fontSize: 26)),
              ),
              Transform.translate(
                offset: Offset(
                  math.cos(spin + 2.1) * 58,
                  math.sin(spin + 2.1) * 58,
                ),
                child: const Text('💬', style: TextStyle(fontSize: 26)),
              ),
              Transform.translate(
                offset: Offset(
                  math.cos(spin + 4.2) * 58,
                  math.sin(spin + 4.2) * 58,
                ),
                child: const Text('💳', style: TextStyle(fontSize: 26)),
              ),
            ],
          ),
        ),
        Transform.translate(
          offset: Offset(0, bob),
          child: Text(
            'Live with the dashboard',
            style: TextStyle(
              color: AppColors.ink.withValues(alpha: 0.7),
              fontWeight: FontWeight.w700,
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }
}
