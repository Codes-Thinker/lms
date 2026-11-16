import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'local_db.dart';

/// Session-scoped JSON cache.
/// Prefers SQLite ([LocalDb]) for larger payloads; mirrors to SharedPreferences
/// as a fallback. Cleared on logout so the next user never sees stale data.
/// Backend remains the source of truth — cache is for faster UX only.
class LocalCache {
  LocalCache._();

  static const _prefix = 'lms_cache_v1_';

  static const courses = 'courses';
  static const fees = 'fees';
  static const feePaymentInfo = 'fee_payment_info';
  static const tasks = 'tasks';
  static const attendanceMine = 'attendance_mine';
  static const notifications = 'notifications';
  static const reportMe = 'report_me';
  static const chatThread = 'chat_thread';
  static const usersRoster = 'users_roster';

  static Future<SharedPreferences?> _prefs() async {
    try {
      return await SharedPreferences.getInstance();
    } catch (e) {
      debugPrint('LocalCache prefs: $e');
      return null;
    }
  }

  static String _key(String name) => '$_prefix$name';

  static Future<void> setJson(String name, Object? value) async {
    await LocalDb.setJson(_key(name), value);
    final prefs = await _prefs();
    if (prefs == null) return;
    if (value == null) {
      await prefs.remove(_key(name));
      return;
    }
    try {
      await prefs.setString(_key(name), jsonEncode(value));
    } catch (e) {
      debugPrint('LocalCache set $name: $e');
    }
  }

  static Future<dynamic> getJson(String name) async {
    final fromDb = await LocalDb.getJson(_key(name));
    if (fromDb != null) return fromDb;

    final prefs = await _prefs();
    if (prefs == null) return null;
    final raw = prefs.getString(_key(name));
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      // Backfill SQLite from prefs for next read.
      await LocalDb.setJson(_key(name), decoded);
      return decoded;
    } catch (e) {
      debugPrint('LocalCache get $name: $e');
      return null;
    }
  }

  static Future<List<dynamic>> getList(String name) async {
    final data = await getJson(name);
    if (data is List) return data;
    return const [];
  }

  static Future<Map<String, dynamic>?> getMap(String name) async {
    final data = await getJson(name);
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    return null;
  }

  /// Wipe all LMS cache keys (call on logout / session end).
  static Future<void> clearSession() async {
    await LocalDb.clearAll();
    final prefs = await _prefs();
    if (prefs == null) return;
    final keys = prefs.getKeys().where((k) => k.startsWith(_prefix)).toList();
    for (final k in keys) {
      await prefs.remove(k);
    }
    debugPrint('LocalCache cleared (${keys.length} keys)');
  }
}
