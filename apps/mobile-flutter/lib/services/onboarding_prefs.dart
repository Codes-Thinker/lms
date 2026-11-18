import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// First-install onboarding gate.
///
/// Survives logout (not cleared with [LocalCache]) so returning users
/// never see slides again after login. Cleared only on app uninstall /
/// clear app data — then onboarding shows once more.
class OnboardingPrefs {
  OnboardingPrefs._();

  static const _key = 'lms_onboarding_v1_completed';

  static Future<bool> isCompleted() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_key) ?? false;
    } catch (e) {
      debugPrint('OnboardingPrefs read: $e');
      return false;
    }
  }

  static Future<void> markCompleted() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_key, true);
    } catch (e) {
      debugPrint('OnboardingPrefs write: $e');
    }
  }
}
