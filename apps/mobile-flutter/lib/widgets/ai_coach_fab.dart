import 'package:flutter/material.dart';
import '../core/constants/app_brand.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import '../views/ai/ai_coach_screen.dart';

/// Small HD robot in soft bubble — arrow points down-left toward navbar.
class AiCoachFab extends StatelessWidget {
  const AiCoachFab({super.key});

  static const double _bubble = 56;

  @override
  Widget build(BuildContext context) {
    final dpr = MediaQuery.devicePixelRatioOf(context);
    // Decode sharp enough for 2x/3x screens (asset is 1280).
    final px = (40 * dpr * 2).round().clamp(160, 512);

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          AppMotion.fadeSlide(const AiCoachScreen()),
        );
      },
      child: SizedBox(
        width: _bubble + 4,
        height: _bubble + 10,
        child: CustomPaint(
          painter: const _TailBubblePainter(
            fill: AppColors.softBlue,
            border: Color(0xFFD4AF37),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 7, 8, 14),
            child: Center(
              child: Image.asset(
                AppBrand.aiRobotBubbleAsset,
                width: 34,
                height: 34,
                fit: BoxFit.contain,
                filterQuality: FilterQuality.high,
                isAntiAlias: true,
                gaplessPlayback: true,
                cacheWidth: px,
                cacheHeight: px,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.smart_toy_rounded,
                  color: AppColors.blueDark,
                  size: 24,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TailBubblePainter extends CustomPainter {
  final Color fill;
  final Color border;

  const _TailBubblePainter({required this.fill, required this.border});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final bodyH = h - 9;
    final r = bodyH / 2;

    final body = RRect.fromRectAndRadius(
      Rect.fromLTWH(1.5, 1.5, w - 3, bodyH - 3),
      Radius.circular(r),
    );

    // Bottom-left arrow → navbar.
    final tail = Path()
      ..moveTo(w * 0.30, bodyH - 5)
      ..lineTo(w * 0.14, h - 0.5)
      ..lineTo(w * 0.44, bodyH - 3.5)
      ..close();

    final fillPaint = Paint()
      ..color = fill
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;
    final borderPaint = Paint()
      ..color = border
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeJoin = StrokeJoin.round
      ..isAntiAlias = true;

    canvas.drawRRect(body, fillPaint);
    canvas.drawPath(tail, fillPaint);
    canvas.drawRRect(body, borderPaint);
    canvas.drawPath(tail, borderPaint);
  }

  @override
  bool shouldRepaint(covariant _TailBubblePainter oldDelegate) =>
      oldDelegate.fill != fill || oldDelegate.border != border;
}
