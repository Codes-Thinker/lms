import 'package:flutter/material.dart';
import '../core/constants/app_brand.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import '../views/ai/ai_coach_screen.dart';

/// HD robot chat FAB — soft circle + bottom-left tail toward navbar.
class AiCoachFab extends StatelessWidget {
  const AiCoachFab({super.key});

  static const double _size = 58;

  @override
  Widget build(BuildContext context) {
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final px = (_size * dpr * 1.5).round().clamp(180, 640);

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          AppMotion.fadeSlide(const AiCoachScreen()),
        );
      },
      child: SizedBox(
        width: _size + 6,
        height: _size + 12,
        child: CustomPaint(
          painter: const _TailBubblePainter(
            fill: Color(0xFFE8F1FF),
            border: Color(0xFFD4AF37),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(6, 5, 6, 13),
            child: ClipOval(
              child: ColoredBox(
                color: const Color(0xFFE8F1FF),
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Image.asset(
                    AppBrand.aiRobotBubbleAsset,
                    fit: BoxFit.contain,
                    alignment: Alignment.center,
                    filterQuality: FilterQuality.high,
                    isAntiAlias: true,
                    gaplessPlayback: true,
                    cacheWidth: px,
                    cacheHeight: px,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.smart_toy_rounded,
                      color: AppColors.blueDark,
                      size: 28,
                    ),
                  ),
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
    final bodyH = h - 10;
    final r = bodyH / 2;

    final body = RRect.fromRectAndRadius(
      Rect.fromLTWH(1.5, 1.5, w - 3, bodyH - 3),
      Radius.circular(r),
    );

    final tail = Path()
      ..moveTo(w * 0.30, bodyH - 5)
      ..lineTo(w * 0.12, h - 0.5)
      ..lineTo(w * 0.46, bodyH - 3)
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
