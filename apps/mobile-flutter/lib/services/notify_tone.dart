import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Codes Thinker brand notification chime (in-app).
class NotifyTone {
  NotifyTone._();
  static final NotifyTone instance = NotifyTone._();

  final AudioPlayer _player = AudioPlayer();
  bool _primed = false;

  Future<void> play() async {
    try {
      await HapticFeedback.lightImpact();
      if (!_primed) {
        await _player.setReleaseMode(ReleaseMode.stop);
        _primed = true;
      }
      await _player.stop();
      await _player.play(AssetSource('sounds/ct_notify.wav'), volume: 0.85);
    } catch (e) {
      debugPrint('NotifyTone: $e');
      try {
        await SystemSound.play(SystemSoundType.alert);
      } catch (_) {}
    }
  }
}
