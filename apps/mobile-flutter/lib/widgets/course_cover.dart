import 'dart:convert';

import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import 'app_loader.dart';

class CourseCover extends StatelessWidget {
  final String url;
  final double height;
  final double? width;
  final BorderRadius? borderRadius;
  final String? title;

  const CourseCover({
    super.key,
    required this.url,
    this.height = 170,
    this.width,
    this.borderRadius,
    this.title,
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
          errorBuilder: (_, __, ___) => _docFallback(),
        );
      } catch (_) {
        image = _docFallback();
      }
    } else if (url.isNotEmpty) {
      image = Image.network(
        url,
        height: height,
        width: width ?? double.infinity,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return _docFallback(loading: true);
        },
        errorBuilder: (_, __, ___) => _docFallback(),
      );
    } else {
      image = _docFallback();
    }

    return ClipRRect(borderRadius: radius, child: image);
  }

  /// PDF / document style cover when no course image is set.
  Widget _docFallback({bool loading = false}) {
    final w = width ?? double.infinity;
    if (loading) {
      return Container(
        height: height,
        width: w,
        color: const Color(0xFFEEF2FF),
        child: const Center(child: AppLoader(size: 28)),
      );
    }

    return Container(
      height: height,
      width: w,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF1F5F9), Color(0xFFE2E8F0), Color(0xFFDBEAFE)],
        ),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            left: 18,
            right: 18,
            top: height > 80 ? 14 : 8,
            child: Container(
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE11D48).withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            padding: EdgeInsets.symmetric(
              horizontal: height > 80 ? 16 : 10,
              vertical: height > 80 ? 12 : 8,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x14000000),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.picture_as_pdf_rounded,
                  color: const Color(0xFFE11D48),
                  size: height > 80 ? 32 : 22,
                ),
                SizedBox(height: height > 80 ? 6 : 2),
                Text(
                  'PDF DOCUMENT',
                  style: TextStyle(
                    fontSize: height > 80 ? 10 : 8,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                    color: AppColors.muted,
                  ),
                ),
                if (title != null && title!.trim().isNotEmpty && height > 70) ...[
                  const SizedBox(height: 4),
                  Text(
                    title!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: height > 80 ? 11 : 9,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
