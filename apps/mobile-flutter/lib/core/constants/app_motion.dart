import 'package:flutter/material.dart';

class AppMotion {
  static const Duration fast = Duration(milliseconds: 200);
  static const Duration normal = Duration(milliseconds: 320);
  static const Duration slow = Duration(milliseconds: 450);

  static const Curve curve = Curves.easeOutCubic;

  static Route<T> fadeSlide<T>(Widget page) {
    return PageRouteBuilder<T>(
      transitionDuration: normal,
      reverseTransitionDuration: fast,
      pageBuilder: (_, __, ___) => page,
      transitionsBuilder: (_, animation, secondary, child) {
        final curved = CurvedAnimation(parent: animation, curve: curve);
        return FadeTransition(
          opacity: curved,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0.04, 0.02),
              end: Offset.zero,
            ).animate(curved),
            child: child,
          ),
        );
      },
    );
  }
}

class FadeInUp extends StatelessWidget {
  final Widget child;
  final Duration duration;

  const FadeInUp({
    super.key,
    required this.child,
    this.duration = AppMotion.normal,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: duration,
      curve: AppMotion.curve,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, (1 - value) * 16),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}

/// Press scale without setState — ValueNotifier only.
class PressableScale extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;

  const PressableScale({super.key, required this.child, this.onTap});

  @override
  Widget build(BuildContext context) {
    final pressed = ValueNotifier<bool>(false);
    return GestureDetector(
      onTap: onTap,
      onTapDown: (_) => pressed.value = true,
      onTapUp: (_) => pressed.value = false,
      onTapCancel: () => pressed.value = false,
      child: ValueListenableBuilder<bool>(
        valueListenable: pressed,
        builder: (_, down, child) {
          return AnimatedScale(
            scale: down ? 0.97 : 1,
            duration: AppMotion.fast,
            curve: AppMotion.curve,
            child: child,
          );
        },
        child: child,
      ),
    );
  }
}
