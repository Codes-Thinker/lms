import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../providers/attendance_provider.dart';
import 'push_notification_service.dart';

/// Tracks proximity to the static office pin.
/// - Arrival: local tray + API (once/day)
/// - Exit while checked-in: local tray + API (once/day)
/// - Android: foreground location notification so tracking continues in background
class OfficeLocationService {
  OfficeLocationService._();
  static final OfficeLocationService instance = OfficeLocationService._();

  StreamSubscription<Position>? _sub;
  AttendanceProvider? _attendance;
  Timer? _poll;
  bool _wasInside = false;
  bool _starting = false;
  String? _boundUserId;

  void bind(AttendanceProvider attendance, {String? userId}) {
    _attendance = attendance;
    if (userId != null) _boundUserId = userId;
  }

  Future<bool> ensurePermission() async {
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
    if (perm == LocationPermission.whileInUse) {
      final always = await Geolocator.requestPermission();
      return always != LocationPermission.denied &&
          always != LocationPermission.deniedForever;
    }
    return true;
  }

  LocationSettings _streamSettings() {
    if (!kIsWeb && Platform.isAndroid) {
      return AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 20,
        intervalDuration: const Duration(seconds: 25),
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
        distanceFilter: 20,
        activityType: ActivityType.other,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
      );
    }
    return const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 20,
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

  Future<void> _handlePosition(Position pos, {bool silent = true}) async {
    final att = _attendance;
    if (att == null) return;

    final wasInside = _wasInside;
    await att.verifyLocation(
      pos.latitude,
      pos.longitude,
      silent: silent,
    );
    final inside = att.insideGeofence;

    // Enter: outside → inside
    if (inside && !wasInside) {
      final sent =
          await att.processArrivalReminder(pos.latitude, pos.longitude);
      // Always show a tray alert on enter so background users see it
      // (FCM alone often only surfaces as in-app tip when opening the app).
      await PushNotificationService.instance.showLocalAlert(
        title: 'At the office',
        body: sent
            ? 'You reached the office. Open Attend to check in.'
            : 'You are inside the office zone. Open Attend if you need to check in.',
        id: 91011,
      );
    }

    // Leave: inside → outside while still checked in
    if (!inside && wasInside) {
      final mine = _boundUserId == null ? null : att.todayFor(_boundUserId!);
      final stillIn = mine != null && mine.isCheckedIn;
      if (stillIn) {
        final sent =
            await att.processExitReminder(pos.latitude, pos.longitude);
        await PushNotificationService.instance.showLocalAlert(
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
    await _handlePosition(pos, silent: silent);
  }

  Future<void> start({String? userId}) async {
    if (_starting) return;
    _starting = true;
    if (userId != null) _boundUserId = userId;
    try {
      final ok = await ensurePermission();
      if (!ok) return;
      await refreshNow();

      await _sub?.cancel();
      _sub = Geolocator.getPositionStream(
        locationSettings: _streamSettings(),
      ).listen(
        (pos) => unawaited(_handlePosition(pos)),
        onError: (e) => debugPrint('location stream: $e'),
      );

      _poll?.cancel();
      // Backup poll — covers gaps when stream is throttled in background.
      _poll = Timer.periodic(const Duration(minutes: 1), (_) {
        unawaited(refreshNow());
      });
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
  }
}
