import 'dart:convert';

import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

/// Circle avatar from server `profileImage` (data URL or http) with initials fallback.
class ProfileAvatar extends StatelessWidget {
  final String name;
  final String? profileImage;
  final double radius;
  final Color? backgroundColor;
  final Color? foregroundColor;

  const ProfileAvatar({
    super.key,
    required this.name,
    this.profileImage,
    this.radius = 20,
    this.backgroundColor,
    this.foregroundColor,
  });

  static ImageProvider? imageProvider(String? src) {
    if (src == null || src.isEmpty) return null;
    if (src.startsWith('data:image')) {
      final comma = src.indexOf(',');
      final b64 = comma >= 0 ? src.substring(comma + 1) : src;
      try {
        return MemoryImage(base64Decode(b64));
      } catch (_) {
        return null;
      }
    }
    if (src.startsWith('http')) return NetworkImage(src);
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final image = imageProvider(profileImage);
    final letter = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : '?';
    return CircleAvatar(
      radius: radius,
      backgroundColor: backgroundColor ?? AppColors.softBlue,
      backgroundImage: image,
      child: image == null
          ? Text(
              letter,
              style: TextStyle(
                color: foregroundColor ?? AppColors.blue,
                fontWeight: FontWeight.w700,
                fontSize: radius * 0.85,
              ),
            )
          : null,
    );
  }
}
