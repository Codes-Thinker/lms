import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// Lightweight SQLite key-value store for offline/fast reads.
/// Backend remains source of truth — this only caches API JSON snapshots.
class LocalDb {
  LocalDb._();

  static Database? _db;
  static const _dbName = 'lms_local_v1.db';
  static const _table = 'cache_entries';

  static Future<Database> _open() async {
    if (_db != null) return _db!;
    final dir = await getDatabasesPath();
    final path = p.join(dir, _dbName);
    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE $_table (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
      },
    );
    return _db!;
  }

  static Future<void> setJson(String key, Object? value) async {
    try {
      final db = await _open();
      if (value == null) {
        await db.delete(_table, where: 'key = ?', whereArgs: [key]);
        return;
      }
      await db.insert(
        _table,
        {
          'key': key,
          'value': jsonEncode(value),
          'updated_at': DateTime.now().millisecondsSinceEpoch,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    } catch (e) {
      debugPrint('LocalDb set $key: $e');
    }
  }

  static Future<dynamic> getJson(String key) async {
    try {
      final db = await _open();
      final rows = await db.query(
        _table,
        where: 'key = ?',
        whereArgs: [key],
        limit: 1,
      );
      if (rows.isEmpty) return null;
      final raw = rows.first['value'] as String?;
      if (raw == null || raw.isEmpty) return null;
      return jsonDecode(raw);
    } catch (e) {
      debugPrint('LocalDb get $key: $e');
      return null;
    }
  }

  static Future<void> clearAll() async {
    try {
      final db = await _open();
      await db.delete(_table);
      debugPrint('LocalDb cleared');
    } catch (e) {
      debugPrint('LocalDb clear: $e');
    }
  }
}
