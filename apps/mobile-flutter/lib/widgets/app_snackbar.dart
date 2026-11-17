import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import '../core/responsive.dart';
import '../providers/ui_provider.dart';

/// Tips at top · snackbars at bottom — no overflow.
class AppSnackHost extends StatelessWidget {
  final Widget child;

  const AppSnackHost({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final snack = context.watch<UiProvider>().activeSnack;
    final tip =
        snack?.placement == AppSnackPlacement.top ? snack : null;
    final bar =
        snack?.placement == AppSnackPlacement.bottom ? snack : null;
    final pad = AppResponsive.pagePad(context);
    final top = MediaQuery.paddingOf(context).top + 8;
    final bottom = AppResponsive.shellBottom(context) + 8;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        child,
        Positioned(
          left: pad,
          right: pad,
          top: top,
          child: _AnimatedBanner(snack: tip, fromTop: true),
        ),
        Positioned(
          left: pad,
          right: pad,
          bottom: bottom,
          child: _AnimatedBanner(snack: bar, fromTop: false),
        ),
      ],
    );
  }
}

class _AnimatedBanner extends StatelessWidget {
  final AppSnack? snack;
  final bool fromTop;

  const _AnimatedBanner({required this.snack, required this.fromTop});

  @override
  Widget build(BuildContext context) {
    final current = snack;
    return IgnorePointer(
      ignoring: current == null,
      child: AnimatedSlide(
        duration: AppMotion.fast,
        curve: Curves.easeOutCubic,
        offset: current == null
            ? Offset(0, fromTop ? -0.35 : 0.35)
            : Offset.zero,
        child: AnimatedOpacity(
          duration: AppMotion.fast,
          opacity: current == null ? 0 : 1,
          child: current == null
              ? const SizedBox.shrink()
              : Material(
                  type: MaterialType.transparency,
                  child: _SnackBanner(snack: current),
                ),
        ),
      ),
    );
  }
}

class _SnackBanner extends StatelessWidget {
  final AppSnack snack;

  const _SnackBanner({required this.snack});

  Color get _accent {
    switch (snack.tone) {
      case AppSnackTone.success:
        return const Color(0xFF059669);
      case AppSnackTone.error:
        return const Color(0xFFDC2626);
      case AppSnackTone.warning:
        return const Color(0xFFD97706);
      case AppSnackTone.info:
        return AppColors.blueDark;
    }
  }

  IconData get _icon {
    switch (snack.tone) {
      case AppSnackTone.success:
        return Icons.check_circle_outline_rounded;
      case AppSnackTone.error:
        return Icons.error_outline_rounded;
      case AppSnackTone.warning:
        return Icons.info_outline_rounded;
      case AppSnackTone.info:
        return Icons.notifications_active_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = snack.title?.trim();
    final hasTitle = title != null && title.isNotEmpty;
    final canTap = snack.onTap != null;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: canTap
            ? () {
                final tap = snack.onTap!;
                context.read<UiProvider>().takeSnack();
                tap();
              }
            : null,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          constraints: const BoxConstraints(minHeight: 48),
          padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.line),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: _accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(_icon, size: 18, color: _accent),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      hasTitle ? title : "Code's Thinker",
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: AppColors.ink.withValues(alpha: 0.92),
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      snack.message,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontWeight: FontWeight.w500,
                        fontSize: 12.5,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              if (canTap) ...[
                const SizedBox(width: 6),
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: AppColors.muted.withValues(alpha: 0.75),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
