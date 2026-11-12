import 'package:flutter/material.dart';
import '../core/constants/app_brand.dart';

/// App mark from IconKitchen / Play Store asset.
class CtMark extends StatelessWidget {
  final double size;

  const CtMark({
    super.key,
    this.size = 42,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.22),
        child: Image.asset(
          size >= 64 ? AppBrand.markHdAsset : AppBrand.markAsset,
          width: size,
          height: size,
          fit: BoxFit.cover,
          filterQuality: FilterQuality.high,
          errorBuilder: (_, __, ___) => Image.asset(
            AppBrand.appIconAsset,
            width: size,
            height: size,
            fit: BoxFit.cover,
          ),
        ),
      ),
    );
  }
}
