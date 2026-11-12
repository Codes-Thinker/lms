import 'package:flutter/material.dart';
import 'app_space.dart';

/// Layout helpers — tight side insets so content isn’t “floating cards”.
class AppBreakpoints {
  static const double compact = 360;
  static const double wide = 600;
}

class AppResponsive {
  static Size sizeOf(BuildContext context) => MediaQuery.sizeOf(context);

  static double widthOf(BuildContext context) => sizeOf(context).width;

  static bool isCompact(BuildContext context) =>
      widthOf(context) < AppBreakpoints.compact;

  static bool isWide(BuildContext context) =>
      widthOf(context) >= AppBreakpoints.wide;

  /// Horizontal page inset — tight (less empty left/right).
  static double pagePad(BuildContext context) => 12;

  static double shellBottom(BuildContext context) {
    final safe = MediaQuery.paddingOf(context).bottom;
    return 88 + (safe > 0 ? safe : 6);
  }

  static double pageBottom(BuildContext context) {
    return AppSpace.lg + MediaQuery.paddingOf(context).bottom;
  }

  static EdgeInsets pageInsets(
    BuildContext context, {
    double top = AppSpace.sm,
  }) {
    final h = pagePad(context);
    return EdgeInsets.fromLTRB(h, top, h, shellBottom(context));
  }

  static EdgeInsets pushInsets(
    BuildContext context, {
    double top = AppSpace.lg,
  }) {
    final h = pagePad(context);
    return EdgeInsets.fromLTRB(h, top, h, pageBottom(context));
  }
}

extension AppTextOverflowX on Text {
  Text get ellipsize => Text(
        data ?? '',
        key: key,
        style: style,
        strutStyle: strutStyle,
        textAlign: textAlign,
        textDirection: textDirection,
        locale: locale,
        softWrap: softWrap,
        overflow: TextOverflow.ellipsis,
        textScaler: textScaler,
        maxLines: maxLines ?? 1,
        semanticsLabel: semanticsLabel,
        textWidthBasis: textWidthBasis,
        textHeightBehavior: textHeightBehavior,
        selectionColor: selectionColor,
      );
}
