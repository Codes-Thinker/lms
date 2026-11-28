import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/app_space.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_motion.dart';
import 'brand_logo.dart';

class AppLiquidNavItem {
  final IconData? icon;
  final String label;
  final bool useBrandMark;
  final int badgeCount;

  const AppLiquidNavItem({
    this.icon,
    required this.label,
    this.useBrandMark = false,
    this.badgeCount = 0,
  });
}

/// Floating nav with iOS / WhatsApp-style liquid drag select.
/// Long-press + drag moves a stretchy blue pill under icons.
class AppLiquidNavBar extends StatefulWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<AppLiquidNavItem> items;

  const AppLiquidNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
  });

  @override
  State<AppLiquidNavBar> createState() => _AppLiquidNavBarState();
}

class _AppLiquidNavBarState extends State<AppLiquidNavBar> {
  final _dragX = ValueNotifier<double>(0);
  final _dragging = ValueNotifier<bool>(false);
  double _itemWidth = 1;
  int _hoverIndex = 0;

  @override
  void initState() {
    super.initState();
    _hoverIndex = widget.currentIndex;
    _dragX.value = widget.currentIndex.toDouble();
  }

  @override
  void didUpdateWidget(covariant AppLiquidNavBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_dragging.value && oldWidget.currentIndex != widget.currentIndex) {
      _hoverIndex = widget.currentIndex;
      _dragX.value = widget.currentIndex * _itemWidth;
    }
  }

  @override
  void dispose() {
    _dragX.dispose();
    _dragging.dispose();
    super.dispose();
  }

  void _go(int index) {
    final i = index.clamp(0, widget.items.length - 1);
    _hoverIndex = i;
    widget.onTap(i);
    _dragX.value = i * _itemWidth;
  }

  void _setDragX(double x) {
    final max = (widget.items.length - 1) * _itemWidth;
    _dragX.value = x.clamp(0.0, max);
    final next = (_dragX.value / _itemWidth).round().clamp(0, widget.items.length - 1);
    if (next != _hoverIndex) {
      _hoverIndex = next;
      HapticFeedback.selectionClick();
    }
  }

  void _startDrag(Offset local, double barWidth) {
    _dragging.value = true;
    HapticFeedback.mediumImpact();
    final idx = (local.dx / _itemWidth).floor().clamp(0, widget.items.length - 1);
    _setDragX(idx * _itemWidth + (_itemWidth / 2) - (_itemWidth / 2));
    // Place under finger’s column center, then follow finger.
    _setDragX((local.dx - _itemWidth / 2).clamp(0.0, (widget.items.length - 1) * _itemWidth));
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    final pad = MediaQuery.sizeOf(context).width < 360 ? 10.0 : 12.0;

    return Padding(
      padding: EdgeInsets.fromLTRB(pad, 0, pad, bottom > 0 ? bottom : 10),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          _itemWidth = width / widget.items.length;
          if (!_dragging.value) {
            _dragX.value = widget.currentIndex * _itemWidth;
          }

          const height = 64.0;
          const baseBubbleW = 58.0;
          const bubbleH = 46.0;

          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onLongPressStart: (d) => _startDrag(d.localPosition, width),
            onLongPressMoveUpdate: (d) {
              if (!_dragging.value) return;
              _setDragX(d.localPosition.dx - _itemWidth / 2);
            },
            onLongPressEnd: (_) {
              final next = (_dragX.value / _itemWidth).round();
              _dragging.value = false;
              HapticFeedback.lightImpact();
              _go(next);
            },
            onHorizontalDragStart: (d) {
              _dragging.value = true;
              HapticFeedback.selectionClick();
            },
            onHorizontalDragUpdate: (d) {
              _setDragX(_dragX.value + d.delta.dx);
            },
            onHorizontalDragEnd: (_) {
              final next = (_dragX.value / _itemWidth).round();
              _dragging.value = false;
              HapticFeedback.lightImpact();
              _go(next);
            },
            child: Container(
              height: height,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppSpace.rPill),
                border: Border.all(color: const Color(0xFFE8ECF1)),
              ),
              child: AnimatedBuilder(
                animation: Listenable.merge([_dragX, _dragging]),
                builder: (_, __) {
                  final x = _dragX.value;
                  final frac = _itemWidth <= 0 ? 0.0 : x / _itemWidth;
                  final between = (frac - frac.round()).abs();
                  // Stretch pill when mid-way between tabs (liquid feel).
                  final stretch = _dragging.value ? between * 28.0 : 0.0;
                  final bubbleW = baseBubbleW + stretch;
                  final left = (x + (_itemWidth / 2) - (bubbleW / 2))
                      .clamp(0.0, width - bubbleW);
                  final active = _dragging.value ? _hoverIndex : widget.currentIndex;

                  return Stack(
                    children: [
                      AnimatedPositioned(
                        duration: Duration(milliseconds: _dragging.value ? 0 : 280),
                        curve: Curves.easeOutCubic,
                        left: left,
                        top: (height - bubbleH) / 2,
                        child: AnimatedContainer(
                          duration: Duration(milliseconds: _dragging.value ? 40 : 220),
                          curve: Curves.easeOutCubic,
                          width: bubbleW,
                          height: bubbleH,
                          decoration: BoxDecoration(
                            color: AppColors.softBlue,
                            borderRadius: BorderRadius.circular(AppSpace.rPill),
                            border: Border.all(
                              color: AppColors.blue.withValues(
                                alpha: _dragging.value ? 0.28 : 0.12,
                              ),
                            ),
                          ),
                          transform: _dragging.value
                              ? (Matrix4.identity()..scaleByDouble(1.04, 1.04, 1, 1))
                              : Matrix4.identity(),
                          transformAlignment: Alignment.center,
                        ),
                      ),
                      Row(
                        children: List.generate(widget.items.length, (i) {
                          final item = widget.items[i];
                          final selected = i == active;
                          final near = _dragging.value &&
                              (i - frac).abs() < 0.55;
                          return Expanded(
                            child: GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTap: () {
                                HapticFeedback.selectionClick();
                                _go(i);
                              },
                              child: AnimatedScale(
                                scale: near || selected ? 1.08 : 1.0,
                                duration: AppMotion.fast,
                                curve: Curves.easeOutCubic,
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Stack(
                                      clipBehavior: Clip.none,
                                      children: [
                                        item.useBrandMark
                                            ? BrandMark(
                                                size: selected ? 24 : 22,
                                              )
                                            : Icon(
                                                item.icon,
                                                size: 21,
                                                color: selected || near
                                                    ? AppColors.blue
                                                    : AppColors.muted,
                                              ),
                                        if (item.badgeCount > 0)
                                          Positioned(
                                            right: -10,
                                            top: -6,
                                            child: Container(
                                              constraints: const BoxConstraints(
                                                minWidth: 16,
                                                minHeight: 16,
                                              ),
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                horizontal: 4,
                                              ),
                                              decoration: BoxDecoration(
                                                color: AppColors.danger,
                                                borderRadius:
                                                    BorderRadius.circular(100),
                                                border: Border.all(
                                                  color: Colors.white,
                                                  width: 1.5,
                                                ),
                                              ),
                                              alignment: Alignment.center,
                                              child: Text(
                                                item.badgeCount > 9
                                                    ? '9+'
                                                    : '${item.badgeCount}',
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w800,
                                                  height: 1.1,
                                                ),
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    AnimatedDefaultTextStyle(
                                      duration: AppMotion.fast,
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: selected
                                            ? FontWeight.w700
                                            : FontWeight.w500,
                                        color: selected || near
                                            ? AppColors.blue
                                            : AppColors.muted,
                                      ),
                                      child: Text(
                                        item.label,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
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
          );
        },
      ),
    );
  }
}
