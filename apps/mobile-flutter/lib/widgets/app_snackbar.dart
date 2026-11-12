import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/app_space.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import '../core/responsive.dart';
import '../providers/ui_provider.dart';

/// Single custom animated message strip (bottom). Not a system alert dialog.
class AppSnackHost extends StatelessWidget {
  final Widget child;

  const AppSnackHost({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final snack = context.watch<UiProvider>().activeSnack;
    final pad = AppResponsive.pagePad(context);

    return Stack(
      children: [
        child,
        Positioned(
          left: pad,
          right: pad,
          bottom: AppResponsive.shellBottom(context) - 8,
          child: IgnorePointer(
            ignoring: snack == null,
            child: AnimatedSlide(
              duration: AppMotion.normal,
              curve: Curves.easeOutCubic,
              offset: snack == null ? const Offset(0, 1.2) : Offset.zero,
              child: AnimatedOpacity(
                duration: AppMotion.fast,
                opacity: snack == null ? 0 : 1,
                child: snack == null
                    ? const SizedBox.shrink()
                    : _SnackBanner(snack: snack),
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

  Color get _bg {
    switch (snack.tone) {
      case AppSnackTone.success:
        return AppColors.green;
      case AppSnackTone.error:
        return AppColors.danger;
      case AppSnackTone.warning:
        return AppColors.orange;
      case AppSnackTone.info:
        return AppColors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = snack.title?.trim();
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: snack.onTap == null
            ? null
            : () {
                final tap = snack.onTap!;
                context.read<UiProvider>().takeSnack();
                tap();
              },
        borderRadius: BorderRadius.circular(AppSpace.rMd),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpace.lg,
            vertical: AppSpace.md,
          ),
          decoration: BoxDecoration(
            color: _bg,
            borderRadius: BorderRadius.circular(AppSpace.rMd),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.chat_bubble_rounded, color: Colors.white, size: 20),
              AppSpace.wMd,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (title != null && title.isNotEmpty) ...[
                      Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 2),
                    ],
                    Text(
                      snack.message,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.95),
                        fontWeight: FontWeight.w600,
                        fontSize: 13.5,
                        height: 1.3,
                      ),
                    ),
                    if (snack.onTap != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Tap to open',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.8),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
