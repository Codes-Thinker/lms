import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../providers/attendance_provider.dart';

/// Tracks proximity to the static office pin and fires once-per-day arrival API.
class OfficeLocationService {
  OfficeLocationService._();
  static final OfficeLocationService instance = OfficeLocationService._();

  StreamSubscription<Position>? _sub;
  AttendanceProvider? _attendance;
  Timer? _poll;
  bool _wasInside = false;
  bool _starting = false;

  void bind(AttendanceProvider attendance) {
    _attendance = attendance;
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
    // Background reminder works better with "always" when the OS allows it.
    if (perm == LocationPermission.whileInUse) {
      final always = await Geolocator.requestPermission();
      return always != LocationPermission.denied &&
          always != LocationPermission.deniedForever;
    }
    return true;
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

  Future<void> refreshNow({bool silent = true}) async {
    final att = _attendance;
    if (att == null) return;
    final pos = await currentPosition();
    if (pos == null) return;
    await att.verifyLocation(pos.latitude, pos.longitude, silent: silent);
    if (att.insideGeofence) {
      await att.processArrivalReminder(pos.latitude, pos.longitude);
      _wasInside = true;
    } else {
      _wasInside = false;
    }
  }

  Future<void> start() async {
    if (_starting) return;
    _starting = true;
    try {
      final ok = await ensurePermission();
      if (!ok) return;
      await refreshNow();

      await _sub?.cancel();
      _sub = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 25,
        ),
      ).listen((pos) async {
        final att = _attendance;
        if (att == null) return;
        await att.verifyLocation(
          pos.latitude,
          pos.longitude,
          silent: true,
        );
        final inside = att.insideGeofence;
        // Enter event only (outside → inside). API enforces once/day.
        if (inside && !_wasInside) {
          await att.processArrivalReminder(pos.latitude, pos.longitude);
        }
        _wasInside = inside;
      }, onError: (e) => debugPrint('location stream: $e'));

      _poll?.cancel();
      _poll = Timer.periodic(const Duration(minutes: 2), (_) {
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
