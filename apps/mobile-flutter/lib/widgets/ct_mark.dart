import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Crisp vector CT mark (C + crowned T) — scales perfectly for Home / nav.
class CtMark extends StatelessWidget {
  final double size;
  final Color plate;

  const CtMark({
    super.key,
    this.size = 42,
    this.plate = const Color(0xFF0A1228),
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: plate,
          border: Border.all(color: Colors.white.withValues(alpha: 0.85), width: 1),
        ),
        child: Padding(
          padding: EdgeInsets.all(size * 0.14),
          child: CustomPaint(
            painter: _CtPainter(),
          ),
        ),
      ),
    );
  }
}

class _CtPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final cx = w / 2;
    final cy = h / 2;
    final r = math.min(w, h) / 2;

    // White C (open on the right)
    final cPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = r * 0.34
      ..strokeCap = StrokeCap.round;

    final cRect = Rect.fromCircle(center: Offset(cx - r * 0.06, cy), radius: r * 0.72);
    canvas.drawArc(cRect, math.pi * 0.28, math.pi * 1.55, false, cPaint);

    // Soft inner bevel on C
    final bevel = Paint()
      ..color = const Color(0xFFB8B8BC)
      ..style = PaintingStyle.stroke
      ..strokeWidth = r * 0.10
      ..strokeCap = StrokeCap.round;
    final bevelRect = Rect.fromCircle(center: Offset(cx - r * 0.06, cy), radius: r * 0.58);
    canvas.drawArc(bevelRect, math.pi * 0.85, math.pi * 0.55, false, bevel);

    // Orange T
    const orange = Color(0xFFE8922A);
    final tPaint = Paint()..color = orange;
    final barW = r * 1.05;
    final barH = r * 0.22;
    final stemW = r * 0.28;
    final stemH = r * 0.95;
    final barLeft = cx - barW / 2 + r * 0.04;
    final barTop = cy - r * 0.42;
    final stemLeft = cx - stemW / 2 + r * 0.04;
    final stemTop = barTop + barH * 0.65;

    final bar = RRect.fromRectAndRadius(
      Rect.fromLTWH(barLeft, barTop, barW, barH),
      Radius.circular(r * 0.04),
    );
    final stem = RRect.fromRectAndRadius(
      Rect.fromLTWH(stemLeft, stemTop, stemW, stemH),
      Radius.circular(r * 0.04),
    );
    canvas.drawRRect(bar, tPaint);
    canvas.drawRRect(stem, tPaint);

    // Crown
    final crown = Path();
    final kx = cx + r * 0.04;
    final ky = barTop - r * 0.08;
    crown.moveTo(kx - r * 0.28, ky + r * 0.18);
    crown.lineTo(kx - r * 0.28, ky - r * 0.02);
    crown.lineTo(kx - r * 0.12, ky + r * 0.10);
    crown.lineTo(kx, ky - r * 0.16);
    crown.lineTo(kx + r * 0.12, ky + r * 0.10);
    crown.lineTo(kx + r * 0.28, ky - r * 0.02);
    crown.lineTo(kx + r * 0.28, ky + r * 0.18);
    crown.close();
    canvas.drawPath(crown, tPaint);
    canvas.drawCircle(Offset(kx, ky - r * 0.18), r * 0.05, tPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
