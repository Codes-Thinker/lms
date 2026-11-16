import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/app_colors.dart';

class AvatarService {
  static final _picker = ImagePicker();
  static SharedPreferences? _prefs;

  static String _key(String userId) => 'avatar_path_$userId';

  static Future<SharedPreferences?> _safePrefs() async {
    if (_prefs != null) return _prefs;
    try {
      _prefs = await SharedPreferences.getInstance();
      return _prefs;
    } on MissingPluginException catch (e) {
      debugPrint('SharedPreferences unavailable (restart app): $e');
      return null;
    } catch (e) {
      debugPrint('SharedPreferences error: $e');
      return null;
    }
  }

  static Future<String?> loadPath(String userId) async {
    final prefs = await _safePrefs();
    if (prefs == null) return null;
    final path = prefs.getString(_key(userId));
    if (path == null) return null;
    if (!File(path).existsSync()) return null;
    return path;
  }

  static Future<void> savePath(String userId, String path) async {
    final prefs = await _safePrefs();
    if (prefs == null) return;
    await prefs.setString(_key(userId), path);
  }

  static Future<void> clear(String userId) async {
    final prefs = await _safePrefs();
    if (prefs == null) return;
    await prefs.remove(_key(userId));
  }

  static Future<String?> pickAndCrop({
    required ImageSource source,
    required BuildContext context,
  }) async {
    final picked = await _picker.pickImage(
      source: source,
      maxWidth: 800,
      maxHeight: 800,
      imageQuality: 72,
    );
    if (picked == null) return null;

    final cropped = await ImageCropper().cropImage(
      sourcePath: picked.path,
      aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
      uiSettings: [
        AndroidUiSettings(
          toolbarTitle: 'Crop photo',
          toolbarColor: AppColors.blue,
          toolbarWidgetColor: Colors.white,
          activeControlsWidgetColor: AppColors.blue,
          initAspectRatio: CropAspectRatioPreset.square,
          lockAspectRatio: true,
          hideBottomControls: false,
        ),
        IOSUiSettings(
          title: 'Crop photo',
          aspectRatioLockEnabled: true,
          resetAspectRatioEnabled: false,
          aspectRatioPickerButtonHidden: true,
        ),
      ],
      compressFormat: ImageCompressFormat.jpg,
      compressQuality: 72,
    );
    if (cropped == null) return null;

    final dir = await getApplicationDocumentsDirectory();
    final dest = File(p.join(dir.path, 'avatar_${DateTime.now().millisecondsSinceEpoch}.jpg'));
    await File(cropped.path).copy(dest.path);
    return dest.path;
  }
}
