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
  DateTime _now = DateTime.now();
  Timer? _clock;
  Timer? _snackTimer;

  int get navIndex => _navIndex;
  bool get globalLoading => _globalLoading;
  String? get loadingMessage => _loadingMessage;
  AppSnack? get activeSnack => _activeSnack;
  /// Back-compat for older call sites
  String? get pendingSnack => _activeSnack?.message;
  DateTime get now => _now;

  UiProvider() {
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      _now = DateTime.now();
      notifyListeners();
    });
  }

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

  /// One custom animated snack for the whole app (message only — not a system alert).
  void showSnack(
    String message, {
    String? title,
    AppSnackTone tone = AppSnackTone.success,
    Duration duration = const Duration(seconds: 2, milliseconds: 600),
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

  /// Alias used by older shell code
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
    _clock?.cancel();
    _snackTimer?.cancel();
    super.dispose();
  }
}
