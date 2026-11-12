import 'dart:convert';

import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import 'app_loader.dart';

class CourseCover extends StatelessWidget {
  final String url;
  final double height;
  final double? width;
  final BorderRadius? borderRadius;

  const CourseCover({
    super.key,
    required this.url,
    this.height = 170,
    this.width,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(20);
    Widget image;
    if (url.startsWith('data:image')) {
      try {
        final b64 = url.contains(',') ? url.split(',').last : url;
        image = Image.memory(
          base64Decode(b64),
          height: height,
          width: width ?? double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _fallback(),
        );
      } catch (_) {
        image = _fallback();
      }
    } else if (url.isNotEmpty) {
      image = Image.network(
        url,
        height: height,
        width: width ?? double.infinity,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return _fallback(loading: true);
        },
        errorBuilder: (_, __, ___) => _fallback(),
      );
    } else {
      image = _fallback();
    }

    return ClipRRect(borderRadius: radius, child: image);
  }

  Widget _fallback({bool loading = false}) {
    return Container(
      height: height,
      width: width ?? double.infinity,
      color: AppColors.softBlue,
      child: Center(
        child: loading
            ? const AppLoader(size: 28)
            : const Icon(Icons.image_outlined, color: AppColors.muted),
      ),
    );
  }
}
