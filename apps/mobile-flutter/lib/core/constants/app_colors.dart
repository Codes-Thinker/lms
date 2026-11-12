import 'package:flutter/material.dart';

/// One brand sequence: ink → muted → line → blue.
/// Semantic colors only for true danger (delete / error).
class AppColors {
  static const Color bg = Color(0xFFF7F8FA);
  static const Color ink = Color(0xFF1F2937);
  static const Color muted = Color(0xFF6B7280);
  static const Color line = Color(0xFFE8ECF1);
  static const Color card = Color(0xFFFFFFFF);

  /// Primary brand blue (only accent for UI chrome / actions)
  static const Color blue = Color(0xFF3B82F6);
  static const Color blueDark = Color(0xFF2563EB);
  static const Color softBlue = Color(0xFFEFF6FF);

  /// Danger only — never use as decorative accent
  static const Color danger = Color(0xFFEF4444);

  // Kept for rare legacy refs; prefer blue / softBlue in UI.
  static const Color pink = blue;
  static const Color yellow = blue;
  static const Color green = blue;
  static const Color orange = blue;
  static const Color softPink = softBlue;
  static const Color softGreen = softBlue;
  static const Color softOrange = softBlue;
}
