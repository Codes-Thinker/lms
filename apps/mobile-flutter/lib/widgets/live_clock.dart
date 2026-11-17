import 'dart:async';

import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/time_utils.dart';

/// Device local time — updates every second without rebuilding the whole page.
class LiveClock extends StatefulWidget {
  final TextStyle? style;
  final bool showDate;

  const LiveClock({super.key, this.style, this.showDate = false});

  @override
  State<LiveClock> createState() => _LiveClockState();
}

class _LiveClockState extends State<LiveClock> {
  Timer? _timer;
  late String _label;

  @override
  void initState() {
    super.initState();
    _label = _format(DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _label = _format(DateTime.now()));
    });
  }

  String _format(DateTime now) {
    final local = now.toLocal();
    if (widget.showDate) return TimeUtils.formatDateTime(local);
    return TimeUtils.formatTime(local);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      _label,
      style: widget.style ??
          const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.muted,
            fontFeatures: [FontFeature.tabularFigures()],
          ),
    );
  }
}
