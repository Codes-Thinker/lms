import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';

/// Downscale uploads so chat / fees / avatar stay light on API + devices.
class ImageCompressService {
  ImageCompressService._();

  static Future<Uint8List> compressBytes(
    Uint8List input, {
    int maxSide = 1280,
  }) async {
    try {
      if (input.lengthInBytes < 80 * 1024) return input;

      final codec = await ui.instantiateImageCodec(
        input,
        targetWidth: maxSide,
      );
      final frame = await codec.getNextFrame();
      final image = frame.image;
      final byteData =
          await image.toByteData(format: ui.ImageByteFormat.png);
      image.dispose();
      if (byteData == null) return input;
      var out = byteData.buffer.asUint8List();

      if (out.lengthInBytes > 450 * 1024 && maxSide > 720) {
        return compressBytes(input, maxSide: 720);
      }
      debugPrint(
        'ImageCompress: ${input.lengthInBytes} → ${out.lengthInBytes} bytes',
      );
      return out;
    } catch (e) {
      debugPrint('ImageCompress failed: $e');
      return input;
    }
  }

  static Future<String> toDataUrl(
    Uint8List input, {
    int maxSide = 1280,
  }) async {
    final compressed = await compressBytes(input, maxSide: maxSide);
    return 'data:image/png;base64,${base64Encode(compressed)}';
  }
}
