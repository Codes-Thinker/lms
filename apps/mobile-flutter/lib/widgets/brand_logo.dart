import 'package:flutter/material.dart';
import '../core/constants/app_brand.dart';
import '../core/constants/app_colors.dart';
import 'ct_mark.dart';

/// Full logo image only — no plate, no shadow, no blur.
class BrandLogoBanner extends StatelessWidget {
  final double height;

  const BrandLogoBanner({
    super.key,
    this.height = 72,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: Image.asset(
        AppBrand.logoAsset,
        fit: BoxFit.contain,
        alignment: Alignment.center,
        filterQuality: FilterQuality.high,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => Image.asset(
          AppBrand.appIconAsset,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => const CtMark(size: 56),
        ),
      ),
    );
  }
}

/// Light-surface brand header (login / home) — CT + name, no dark box.
class BrandHeader extends StatelessWidget {
  final double markSize;

  const BrandHeader({super.key, this.markSize = 48});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CtMark(size: markSize),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                AppBrand.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.ink,
                ),
              ),
              SizedBox(height: 2),
              Text(
                AppBrand.tagline,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: AppColors.muted,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Home / nav CT — crisp vector mark.
class BrandMark extends StatelessWidget {
  final double size;
  final bool elevated;

  const BrandMark({
    super.key,
    this.size = 28,
    this.elevated = false,
  });

  @override
  Widget build(BuildContext context) {
    return CtMark(size: size);
  }
}
