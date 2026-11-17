import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import '../core/responsive.dart';
import '../providers/ui_provider.dart';

/// Compact bottom toast — soft surface, light type, short height.
class AppSnackHost extends StatelessWidget {
  final Widget child;

  const AppSnackHost({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final snack = context.watch<UiProvider>().activeSnack;
    final pad = AppResponsive.pagePad(context);

    return Stack(
      clipBehavior: Clip.none,
      children: [
        child,
        Positioned(
          left: pad,
          right: pad,
          bottom: AppResponsive.shellBottom(context) + 8,
          child: IgnorePointer(
            ignoring: snack == null,
            child: AnimatedSlide(
              duration: AppMotion.fast,
              curve: Curves.easeOutCubic,
              offset: snack == null ? const Offset(0, 0.35) : Offset.zero,
              child: AnimatedOpacity(
                duration: AppMotion.fast,
                opacity: snack == null ? 0 : 1,
                child: snack == null
                    ? const SizedBox.shrink()
                    : Material(
                        type: MaterialType.transparency,
                        elevation: 12,
                        child: _SnackBanner(snack: snack),
                      ),
              ),
            ),
          ),
        ),
      ],
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
        return Icons.notifications_none_rounded;
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
        borderRadius: BorderRadius.circular(12),
        child: Container(
          constraints: const BoxConstraints(minHeight: 44, maxHeight: 64),
          padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.line),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 28,
                height: 28,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: _accent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(_icon, size: 16, color: _accent),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (hasTitle)
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: AppColors.ink.withValues(alpha: 0.9),
                          fontWeight: FontWeight.w600,
                          fontSize: 12.5,
                          height: 1.2,
                        ),
                      ),
                    Text(
                      snack.message,
                      maxLines: hasTitle ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: hasTitle
                            ? AppColors.muted
                            : AppColors.ink.withValues(alpha: 0.88),
                        fontWeight: FontWeight.w500,
                        fontSize: hasTitle ? 12 : 13,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
              if (canTap) ...[
                const SizedBox(width: 6),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 18,
                  color: AppColors.muted.withValues(alpha: 0.7),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
