import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

/// Small red count pill for tiles / icons (hidden when [count] is 0).
class UnreadCountBadge extends StatelessWidget {
  final int count;
  final bool compact;

  const UnreadCountBadge({
    super.key,
    required this.count,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const SizedBox.shrink();
    return Container(
      constraints: BoxConstraints(
        minWidth: compact ? 16 : 18,
        minHeight: compact ? 16 : 18,
      ),
      padding: EdgeInsets.symmetric(horizontal: compact ? 4 : 5),
      decoration: BoxDecoration(
        color: AppColors.danger,
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: Colors.white, width: 1.5),
      ),
      alignment: Alignment.center,
      child: Text(
        count > 9 ? '9+' : '$count',
        style: TextStyle(
          color: Colors.white,
          fontSize: compact ? 9 : 10,
          fontWeight: FontWeight.w800,
          height: 1.1,
        ),
      ),
    );
  }
}
