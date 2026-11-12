import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../core/constants/app_colors.dart';

class AppLoader extends StatelessWidget {
  final double size;
  final Color? color;

  const AppLoader({super.key, this.size = 48, this.color});

  @override
  Widget build(BuildContext context) {
    return SpinKitCircle(
      color: color ?? AppColors.blue,
      size: size,
    );
  }
}

/// Dim overlay + blue circle only (no white card / container).
class AppLoadingOverlay extends StatelessWidget {
  final bool loading;
  final Widget child;
  final String? message;

  const AppLoadingOverlay({
    super.key,
    required this.loading,
    required this.child,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (loading)
          Positioned.fill(
            child: ColoredBox(
              color: const Color(0xFF0F172A).withValues(alpha: 0.22),
              child: const Center(
                child: AppLoader(size: 52, color: AppColors.blue),
              ),
            ),
          ),
      ],
    );
  }
}
