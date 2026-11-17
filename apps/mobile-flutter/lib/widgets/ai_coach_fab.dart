import 'package:flutter/material.dart';
import '../core/constants/app_brand.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import '../views/ai/ai_coach_screen.dart';

/// Compact AI coach bubble — tail toward navbar, brand soft-blue fill.
class AiCoachFab extends StatelessWidget {
  const AiCoachFab({super.key});

  static const double _size = 54;

  @override
  Widget build(BuildContext context) {
    final px = ((_size + 8) * MediaQuery.devicePixelRatioOf(context)).round();

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
            fill: AppColors.softBlue,
            border: const Color(0xFFD4AF37),
          ),
          child: Padding(
            // Tight padding so robot reads larger/clearer inside.
            padding: const EdgeInsets.fromLTRB(2, 1, 2, 9),
            child: ClipOval(
              child: Transform.scale(
                scale: 1.18,
                child: Image.asset(
                  AppBrand.aiRobotBubbleAsset,
                  fit: BoxFit.cover,
                  filterQuality: FilterQuality.high,
                  isAntiAlias: true,
                  cacheWidth: px,
                  cacheHeight: px,
                  errorBuilder: (_, __, ___) => const ColoredBox(
                    color: AppColors.blue,
                    child: Icon(
                      Icons.smart_toy_rounded,
                      color: Colors.white,
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

/// Speech bubble with a small arrow at bottom-left (toward navbar).
class _BubbleTailPainter extends CustomPainter {
  final Color fill;
  final Color border;

  _BubbleTailPainter({required this.fill, required this.border});

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
      oldDelegate.fill != fill || oldDelegate.border != border;
}
