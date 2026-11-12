import 'dart:async';

import 'package:flutter/foundation.dart';

enum AppSnackTone { success, error, warning, info }

class AppSnack {
  final String message;
  final String? title;
  final AppSnackTone tone;
  final VoidCallback? onTap;

  const AppSnack(
    this.message, {
    this.title,
    this.tone = AppSnackTone.success,
    this.onTap,
  });
}

class UiProvider extends ChangeNotifier {
  int _navIndex = 0;
  bool _globalLoading = false;
  String? _loadingMessage;
  AppSnack? _activeSnack;
  Timer? _snackTimer;

  int get navIndex => _navIndex;
  bool get globalLoading => _globalLoading;
  String? get loadingMessage => _loadingMessage;
  AppSnack? get activeSnack => _activeSnack;
  String? get pendingSnack => _activeSnack?.message;

  /// Prefer [LiveCountdown] for ticking UI — do not notify every second.
  DateTime get now => DateTime.now();

  void setNavIndex(int index) {
    if (_navIndex == index) return;
    _navIndex = index;
    notifyListeners();
  }

  void showLoading([String? message]) {
    _globalLoading = true;
    _loadingMessage = message;
    notifyListeners();
  }

  void hideLoading() {
    _globalLoading = false;
    _loadingMessage = null;
    notifyListeners();
  }

  void showSnack(
    String message, {
    String? title,
    AppSnackTone tone = AppSnackTone.success,
    Duration duration = const Duration(seconds: 3),
    VoidCallback? onTap,
  }) {
    _snackTimer?.cancel();
    _activeSnack = AppSnack(
      message,
      title: title,
      tone: tone,
      onTap: onTap,
    );
    notifyListeners();
    _snackTimer = Timer(duration, () {
      _activeSnack = null;
      notifyListeners();
    });
  }

  void queueSnack(String message) => showSnack(message);

  String? takeSnack() {
    final msg = _activeSnack?.message;
    _activeSnack = null;
    _snackTimer?.cancel();
    notifyListeners();
    return msg;
  }

  @override
  void dispose() {
    _snackTimer?.cancel();
    super.dispose();
  }
}
