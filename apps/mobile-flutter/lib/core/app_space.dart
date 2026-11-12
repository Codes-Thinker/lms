import 'package:flutter/material.dart';
import '../widgets/app_loader.dart';
import 'constants/app_colors.dart';

/// Spacing + radius. Keep padding tight so content feels full-width.
abstract final class AppSpace {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;

  static const double rSm = 10;
  static const double rMd = 12;
  static const double rLg = 14;
  /// Full pill — use on every button.
  static const double rPill = 100;

  static SizedBox get gapXs => const SizedBox(height: xs);
  static SizedBox get gapSm => const SizedBox(height: sm);
  static SizedBox get gapMd => const SizedBox(height: md);
  static SizedBox get gapLg => const SizedBox(height: lg);
  static SizedBox get gapXl => const SizedBox(height: xl);
  static SizedBox get gapXxl => const SizedBox(height: xxl);

  static SizedBox get wXs => const SizedBox(width: xs);
  static SizedBox get wSm => const SizedBox(width: sm);
  static SizedBox get wMd => const SizedBox(width: md);
  static SizedBox get wLg => const SizedBox(width: lg);
}

/// Soft panel — light fill, NO border by default (avoids “card stack” look).
class AppSurface extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? color;
  final double radius;
  final bool bordered;
  final VoidCallback? onTap;

  const AppSurface({
    super.key,
    required this.child,
    this.padding,
    this.color,
    this.radius = AppSpace.rMd,
    this.bordered = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final body = Container(
      width: double.infinity,
      padding: padding ?? const EdgeInsets.all(AppSpace.md),
      decoration: BoxDecoration(
        color: color ?? AppColors.softBlue.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(radius),
        border: bordered ? Border.all(color: AppColors.line) : null,
      ),
      child: child,
    );

    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: body,
      ),
    );
  }
}

/// Grouped list block — one container, divider rows (not separate cards).
class AppListGroup extends StatelessWidget {
  final List<Widget> children;
  final EdgeInsetsGeometry? padding;

  const AppListGroup({super.key, required this.children, this.padding});

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      items.add(children[i]);
      if (i < children.length - 1) {
        items.add(const Divider(height: 1, thickness: 1, color: AppColors.line));
      }
    }
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppSpace.rMd),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(children: items),
    );
  }
}

class AppListRow extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback? onTap;
  final Widget? trailing;

  const AppListRow({
    super.key,
    required this.label,
    required this.value,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final row = Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpace.md,
        vertical: AppSpace.md,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.muted,
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.ink,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
          if (trailing != null) ...[AppSpace.wSm, trailing!],
        ],
      ),
    );
    if (onTap == null) return row;
    return InkWell(onTap: onTap, child: row);
  }
}

class AppSectionTitle extends StatelessWidget {
  final String text;
  const AppSectionTitle(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: AppColors.ink,
        letterSpacing: -0.2,
      ),
    );
  }
}

/// Primary / secondary / danger — one blue sequence.
class AppBtn extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppBtnTone tone;
  final bool loading;

  const AppBtn({
    super.key,
    required this.label,
    required this.onPressed,
    this.tone = AppBtnTone.primary,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    final spinnerColor =
        tone == AppBtnTone.primary ? Colors.white : AppColors.blue;
    final child = loading
        ? AppLoader(size: 22, color: spinnerColor)
        : Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
          );

    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppSpace.rPill),
    );

    switch (tone) {
      case AppBtnTone.primary:
        return SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: loading ? null : onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.blue,
              foregroundColor: Colors.white,
              disabledBackgroundColor: AppColors.blue.withValues(alpha: 0.55),
              elevation: 0,
              shadowColor: Colors.transparent,
              shape: shape,
            ),
            child: child,
          ),
        );
      case AppBtnTone.secondary:
        return SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton(
            onPressed: loading ? null : onPressed,
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.ink,
              side: const BorderSide(color: AppColors.line),
              shape: shape,
            ),
            child: child,
          ),
        );
      case AppBtnTone.danger:
        return SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton(
            onPressed: loading ? null : onPressed,
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.danger,
              side: const BorderSide(color: AppColors.danger),
              shape: shape,
            ),
            child: child,
          ),
        );
    }
  }
}

enum AppBtnTone { primary, secondary, danger }
