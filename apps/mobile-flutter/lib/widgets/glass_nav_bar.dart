import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import 'brand_logo.dart';

class GlassNavItem {
  final IconData? icon;
  final IconData? activeIcon;
  final String label;
  final bool useBrandMark;

  const GlassNavItem({
    this.icon,
    this.activeIcon,
    required this.label,
    this.useBrandMark = false,
  });
}

/// Clean floating nav — no blur / no shadow.
class GlassNavBar extends StatelessWidget {
  final int index;
  final double page;
  final List<GlassNavItem> items;
  final ValueChanged<int> onTap;

  const GlassNavBar({
    super.key,
    required this.index,
    required this.page,
    required this.items,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    final clampedPage = page.clamp(0.0, (items.length - 1).toDouble());

    // Fully transparent wrapper — only the pill is opaque so page content
    // shows left / right / under the floating bar.
    return Material(
      type: MaterialType.transparency,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, bottom > 0 ? bottom : 12),
        child: Container(
          height: 68,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(36),
            color: Colors.white,
            border: Border.all(color: AppColors.line.withValues(alpha: 0.9)),
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final slot = constraints.maxWidth / items.length;
              const circle = 44.0;
              final left = clampedPage * slot + (slot - circle) / 2;

              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    left: left,
                    top: 5,
                    child: IgnorePointer(
                      child: Container(
                        width: circle,
                        height: circle,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFFF3F4F6),
                        ),
                      ),
                    ),
                  ),
                  Row(
                    children: List.generate(items.length, (i) {
                      final item = items[i];
                      final dist = (clampedPage - i).abs().clamp(0.0, 1.0);
                      final selectedAmount = 1.0 - dist;
                      final selected = i == index;

                      return Expanded(
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => onTap(i),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const SizedBox(height: 2),
                              item.useBrandMark
                                  ? const BrandMark(size: 24)
                                  : Icon(
                                      selectedAmount > 0.55
                                          ? (item.activeIcon ?? item.icon)
                                          : item.icon,
                                      size: 22,
                                      color: Color.lerp(
                                        AppColors.muted,
                                        AppColors.ink,
                                        selectedAmount,
                                      ),
                                    ),
                              const SizedBox(height: 2),
                              AnimatedDefaultTextStyle(
                                duration: AppMotion.fast,
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight:
                                      selected ? FontWeight.w600 : FontWeight.w500,
                                  color: Color.lerp(
                                    AppColors.muted,
                                    AppColors.ink,
                                    selectedAmount,
                                  ),
                                ),
                                child: Text(
                                  item.label,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
