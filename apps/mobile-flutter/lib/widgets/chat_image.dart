import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

/// Decoded once and reused so chat polls do not re-decode / blink photos.
final Map<String, Uint8List> _chatImageBytesCache = {};

Uint8List? chatImageBytes(String? dataUrl) {
  if (dataUrl == null || dataUrl.isEmpty) return null;
  final cached = _chatImageBytesCache[dataUrl];
  if (cached != null) return cached;
  try {
    final raw = dataUrl.contains(',') ? dataUrl.split(',').last : dataUrl;
    final bytes = base64Decode(raw);
    // Cap cache size roughly.
    if (_chatImageBytesCache.length > 40) {
      _chatImageBytesCache.remove(_chatImageBytesCache.keys.first);
    }
    _chatImageBytesCache[dataUrl] = bytes;
    return bytes;
  } catch (_) {
    return null;
  }
}

class ChatImageThumb extends StatelessWidget {
  final String imageData;
  final String? label;
  final bool mine;
  final double height;

  const ChatImageThumb({
    super.key,
    required this.imageData,
    this.label,
    this.mine = false,
    this.height = 160,
  });

  void _open(BuildContext context) {
    final bytes = chatImageBytes(imageData);
    if (bytes == null) return;
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black87,
        pageBuilder: (_, __, ___) => _ChatImageViewer(bytes: bytes),
        transitionsBuilder: (_, anim, __, child) =>
            FadeTransition(opacity: anim, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bytes = chatImageBytes(imageData);
    if (bytes == null) {
      return Text(
        label ?? 'Photo',
        style: TextStyle(color: mine ? Colors.white : AppColors.ink),
      );
    }
    return GestureDetector(
      onTap: () => _open(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.memory(
              bytes,
              height: height,
              width: double.infinity,
              fit: BoxFit.cover,
              gaplessPlayback: true,
              filterQuality: FilterQuality.medium,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Tap to view',
            style: TextStyle(
              color: mine ? Colors.white70 : AppColors.muted,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatImageViewer extends StatelessWidget {
  final Uint8List bytes;

  const _ChatImageViewer({required this.bytes});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Photo'),
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.8,
          maxScale: 4,
          child: Image.memory(
            bytes,
            fit: BoxFit.contain,
            gaplessPlayback: true,
          ),
        ),
      ),
    );
  }
}
