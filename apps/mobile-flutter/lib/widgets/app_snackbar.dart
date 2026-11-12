import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/app_space.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import '../core/responsive.dart';
import '../providers/ui_provider.dart';

/// Single custom animated snack for the whole app (bottom). No shadow.
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

  IconData get _icon {
    switch (snack.tone) {
      case AppSnackTone.success:
        return Icons.check_circle_rounded;
      case AppSnackTone.error:
        return Icons.error_rounded;
      case AppSnackTone.warning:
        return Icons.warning_amber_rounded;
      case AppSnackTone.info:
        return Icons.info_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
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
          children: [
            Icon(_icon, color: Colors.white, size: 20),
            AppSpace.wMd,
            Expanded(
              child: Text(
                snack.message,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 13.5,
                  height: 1.3,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
