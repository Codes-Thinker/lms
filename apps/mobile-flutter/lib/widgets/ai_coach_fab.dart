import 'dart:ui';

import 'package:flutter/material.dart';
import '../core/constants/app_brand.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import '../views/ai/ai_coach_screen.dart';

/// Compact AI coach bubble — soft blur fill, small HD robot centered,
/// tail toward navbar (Zong-style presence, Codes Thinker colors).
class AiCoachFab extends StatelessWidget {
  const AiCoachFab({super.key});

  static const double _size = 54;

  @override
  Widget build(BuildContext context) {
    final dpr = MediaQuery.devicePixelRatioOf(context);
    // Decode sharp for the small inset character.
    final px = (36 * dpr).round().clamp(72, 256);

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          AppMotion.fadeSlide(const AiCoachScreen()),
        );
      },
      child: SizedBox(
        width: _size + 6,
        height: _size + 10,
        child: CustomPaint(
          painter: _BubbleTailPainter(
            fill: AppColors.softBlue.withValues(alpha: 0.92),
            glow: AppColors.blue.withValues(alpha: 0.22),
            border: const Color(0xFFD4AF37),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(5, 4, 5, 12),
            child: ClipOval(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Soft blur wash (Zong-like frosted bubble).
                  BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                    child: const ColoredBox(
                      color: Color(0x66EFF6FF),
                    ),
                  ),
                  // Soft brand glow behind character.
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        colors: [
                          Color(0x883B82F6),
                          Color(0x22EFF6FF),
                          Color(0x00FFFFFF),
                        ],
                        stops: [0.0, 0.55, 1.0],
                      ),
                    ),
                  ),
                  // Small HD robot, centered.
                  Center(
                    child: SizedBox(
                      width: 30,
                      height: 30,
                      child: Image.asset(
                        AppBrand.aiRobotBubbleAsset,
                        fit: BoxFit.contain,
                        alignment: Alignment.center,
                        filterQuality: FilterQuality.high,
                        isAntiAlias: true,
                        cacheWidth: px,
                        cacheHeight: px,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.smart_toy_rounded,
                          color: AppColors.blueDark,
                          size: 22,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BubbleTailPainter extends CustomPainter {
  final Color fill;
  final Color glow;
  final Color border;

  _BubbleTailPainter({
    required this.fill,
    required this.glow,
    required this.border,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final bodyH = h - 8;
    final r = bodyH / 2;

    final body = RRect.fromRectAndRadius(
      Rect.fromLTWH(1.5, 1.5, w - 3, bodyH - 3),
      Radius.circular(r),
    );

    final tail = Path()
      ..moveTo(w * 0.28, bodyH - 6)
      ..lineTo(w * 0.12, h - 1)
      ..lineTo(w * 0.42, bodyH - 4)
      ..close();

    // Soft outer glow.
    final glowPaint = Paint()
      ..color = glow
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
    canvas.drawRRect(body.inflate(1.5), glowPaint);

    final fillPaint = Paint()
      ..color = fill
      ..style = PaintingStyle.fill;
    final borderPaint = Paint()
      ..color = border
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeJoin = StrokeJoin.round;

    canvas.drawRRect(body, fillPaint);
    canvas.drawPath(tail, fillPaint);
    canvas.drawRRect(body, borderPaint);
    canvas.drawPath(tail, borderPaint);
  }

  @override
  bool shouldRepaint(covariant _BubbleTailPainter oldDelegate) =>
      oldDelegate.fill != fill ||
      oldDelegate.glow != glow ||
      oldDelegate.border != border;
}
