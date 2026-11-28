import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/attendance_provider.dart';
import '../providers/ui_provider.dart';
import 'push_notification_service.dart';

/// Tracks proximity to the admin-configured office pin.
/// - Local haversine for stable UI (works offline once config cached)
/// - Arrival local tray + API once/day
/// - Exit while checked-in: local tray + API
/// - Android foreground service so tracking can continue in background
class OfficeLocationService {
  OfficeLocationService._();
  static final OfficeLocationService instance = OfficeLocationService._();

  StreamSubscription<Position>? _sub;
  AttendanceProvider? _attendance;
  UiProvider? _ui;
  Timer? _poll;
  bool _wasInside = false;
  bool _starting = false;
  bool _started = false;
  String? _boundUserId;
  DateTime? _lastApiSyncAt;

  void bind(AttendanceProvider attendance, {String? userId, UiProvider? ui}) {
    _attendance = attendance;
    if (userId != null) _boundUserId = userId;
    if (ui != null) _ui = ui;
  }

  void bindUi(UiProvider ui) => _ui = ui;

  bool get _isAppForeground {
    final state = WidgetsBinding.instance.lifecycleState;
    return state == null ||
        state == AppLifecycleState.resumed ||
        state == AppLifecycleState.inactive;
  }

  Future<bool> ensurePermission({bool requestAlways = true}) async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return false;

    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied ||
        perm == LocationPermission.deniedForever) {
      return false;
    }
    // Background reminders need "Always" when the OS allows it.
    if (requestAlways && perm == LocationPermission.whileInUse) {
      final always = await Geolocator.requestPermission();
      return always != LocationPermission.denied &&
          always != LocationPermission.deniedForever;
    }
    return true;
  }

  Future<void> openLocationSettings() => Geolocator.openLocationSettings();

  Future<void> openAppSettings() => Geolocator.openAppSettings();

  LocationSettings _streamSettings() {
    if (!kIsWeb && Platform.isAndroid) {
      return AndroidSettings(
        accuracy: LocationAccuracy.high,
        // Higher filter = less GPS jitter / UI blink at the fence edge.
        distanceFilter: 15,
        intervalDuration: const Duration(seconds: 20),
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: "Code's Thinker · Office tracking",
          notificationText:
              'Tracking office geofence for attendance reminders',
          notificationChannelName: 'Office location',
          enableWakeLock: true,
        ),
      );
    }
    if (!kIsWeb && Platform.isIOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 15,
        activityType: ActivityType.other,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
      );
    }
    return const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 15,
    );
  }

  Future<Position?> currentPosition() async {
    final ok = await ensurePermission();
    if (!ok) return null;
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
    } catch (e) {
      debugPrint('getCurrentPosition failed: $e');
      return null;
    }
  }

  String _dayKey() {
    final n = DateTime.now();
    final y = n.year.toString().padLeft(4, '0');
    final m = n.month.toString().padLeft(2, '0');
    final d = n.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  Future<bool> _claimLocalArrivalAlert() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key =
          'lms_office_arrival_local_${_boundUserId ?? 'anon'}_${_dayKey()}';
      if (prefs.getBool(key) == true) return false;
      await prefs.setBool(key, true);
      return true;
    } catch (_) {
      return true;
    }
  }

  /// In-app → top tip. Background / killed session → system tray.
  Future<void> _notifyUser({
    required String title,
    required String body,
    required int id,
    String type = 'ATTENDANCE',
  }) async {
    if (_isAppForeground && _ui != null) {
      _ui!.showTip(
        body,
        title: title,
        duration: const Duration(seconds: 6),
      );
      return;
    }
    await PushNotificationService.instance.showLocalAlert(
      title: title,
      body: body,
      type: type,
      id: id,
    );
  }

  Future<void> _handlePosition(
    Position pos, {
    bool silent = true,
    bool forceApiSync = false,
  }) async {
    final att = _attendance;
    if (att == null) return;

    final wasInside = _wasInside;

    // Stream samples stay local — API sync only on edges / manual / rare poll.
    final now = DateTime.now();
    final dueApi = forceApiSync ||
        _lastApiSyncAt == null ||
        now.difference(_lastApiSyncAt!) > const Duration(minutes: 3);
    await att.applyGpsSample(
      pos.latitude,
      pos.longitude,
      accuracyMeters: pos.accuracy,
      silent: silent,
      syncApi: dueApi,
    );
    if (dueApi) _lastApiSyncAt = now;

    final inside = att.insideGeofence;

    // Enter: outside → inside (once per day local + API)
    if (inside && !wasInside) {
      final showLocal = await _claimLocalArrivalAlert();
      final sent =
          await att.processArrivalReminder(pos.latitude, pos.longitude);
      if (showLocal) {
        await _notifyUser(
          title: 'Office Attendance Reminder',
          body: sent
              ? 'You are at the office. Please mark your attendance.'
              : 'You are at the office. Open Attend to check in.',
          id: 91011,
        );
      }
    }

    // Leave: inside → outside while still checked in
    if (!inside && wasInside) {
      final mine = _boundUserId == null ? null : att.todayFor(_boundUserId!);
      final stillIn = mine != null && mine.isCheckedIn;
      if (stillIn) {
        final sent =
            await att.processExitReminder(pos.latitude, pos.longitude);
        await _notifyUser(
          title: 'Outside office zone',
          body: sent
              ? 'You left the office while still checked in. Open Attend and check out.'
              : 'You left the office zone. Check out if you are done for the day.',
          id: 91012,
        );
      }
    }

    _wasInside = inside;
  }

  Future<void> refreshNow({bool silent = true}) async {
    final pos = await currentPosition();
    if (pos == null) return;
    await _handlePosition(pos, silent: silent, forceApiSync: true);
  }

  Future<void> start({String? userId}) async {
    if (_starting) return;
    if (_started &&
        _sub != null &&
        (userId == null || userId == _boundUserId)) {
      // Already running — soft refresh without restarting the stream (no blink).
      unawaited(refreshNow(silent: true));
      return;
    }
    _starting = true;
    if (userId != null) _boundUserId = userId;
    try {
      final att = _attendance;
      if (att != null) {
        await att.loadOfficeConfig();
      }
      final ok = await ensurePermission();
      if (!ok) return;

      // First fix without blocking UI as "busy checking".
      await refreshNow(silent: true);

      await _sub?.cancel();
      _sub = Geolocator.getPositionStream(
        locationSettings: _streamSettings(),
      ).listen(
        (pos) => unawaited(_handlePosition(pos)),
        onError: (e) => debugPrint('location stream: $e'),
      );

      _poll?.cancel();
      // Rare poll only — stream already drives geofence; avoids flicker.
      _poll = Timer.periodic(const Duration(seconds: 90), (_) {
        unawaited(refreshNow(silent: true));
      });
      _started = true;
    } finally {
      _starting = false;
    }
  }

  Future<void> stop() async {
    await _sub?.cancel();
    _sub = null;
    _poll?.cancel();
    _poll = null;
    _wasInside = false;
    _started = false;
  }
}
