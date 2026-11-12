import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/time_utils.dart';

/// Local 1s ticker — only this widget rebuilds (stops whole-app blink).
class LiveCountdown extends StatefulWidget {
  final DateTime target;
  final TextStyle? style;

  const LiveCountdown({
    super.key,
    required this.target,
    this.style,
  });

  @override
  State<LiveCountdown> createState() => _LiveCountdownState();
}

class _LiveCountdownState extends State<LiveCountdown> {
  Timer? _timer;
  late String _label;

  @override
  void initState() {
    super.initState();
    _label = TimeUtils.countdown(widget.target, DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _label = TimeUtils.countdown(widget.target, DateTime.now());
      });
    });
  }

  @override
  void didUpdateWidget(covariant LiveCountdown oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.target != widget.target) {
      _label = TimeUtils.countdown(widget.target, DateTime.now());
    }
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
            color: AppColors.blue,
            fontWeight: FontWeight.w700,
            fontFeatures: [FontFeature.tabularFigures()],
          ),
    );
  }
}
