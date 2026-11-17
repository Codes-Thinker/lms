import 'package:flutter/material.dart';
import '../core/constants/app_brand.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import '../views/ai/ai_coach_screen.dart';

/// Small HD robot FAB (mockup style) — no square plate, navbar unchanged.
class AiCoachFab extends StatelessWidget {
  const AiCoachFab({super.key});

  static const double _size = 52;

  @override
  Widget build(BuildContext context) {
    final px = (_size * MediaQuery.devicePixelRatioOf(context)).round().clamp(96, 256);

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          AppMotion.fadeSlide(const AiCoachScreen()),
        );
      },
      child: SizedBox(
        width: _size,
        height: _size,
        child: Image.asset(
          AppBrand.aiRobotBubbleAsset,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          isAntiAlias: true,
          cacheWidth: px,
          cacheHeight: px,
          errorBuilder: (_, __, ___) => const DecoratedBox(
            decoration: BoxDecoration(
              color: AppColors.softBlue,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.smart_toy_rounded,
              color: AppColors.blueDark,
              size: 26,
            ),
          ),
        ),
      ),
    );
  }
}
