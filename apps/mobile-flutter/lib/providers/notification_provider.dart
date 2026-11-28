import 'dart:async';

import 'package:flutter/foundation.dart';
import '../core/notification_router.dart';
import '../services/api_client.dart';
import '../services/local_cache.dart';

class AppNotificationItem {
  final String id;
  final String title;
  final String body;
  final String type;
  final bool read;
  final DateTime createdAt;
  final String? targetUserId;
  final Map<String, dynamic>? data;

  AppNotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.read,
    required this.createdAt,
    this.targetUserId,
    this.data,
  });

  String? get event => data?['event']?.toString();

  factory AppNotificationItem.fromJson(Map<String, dynamic> json) {
    return AppNotificationItem(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      type: json['type'] as String? ?? 'GENERAL',
      read: json['read'] as bool? ?? false,
      createdAt: () {
        final parsed =
            DateTime.tryParse(json['createdAt'] as String? ?? '');
        return parsed?.toLocal() ?? DateTime.now().toLocal();
      }(),
      targetUserId: json['userId'] as String?,
      data: json['data'] is Map
          ? Map<String, dynamic>.from(json['data'] as Map)
          : null,
    );
  }

  Map<String, dynamic> toCacheJson() => {
        'id': id,
        'title': title,
        'body': body,
        'type': type,
        'read': read,
        'createdAt': createdAt.toIso8601String(),
        'userId': targetUserId,
        'data': data,
      };

  AppNotificationItem copyWith({bool? read}) => AppNotificationItem(
        id: id,
        title: title,
        body: body,
        type: type,
        read: read ?? this.read,
        createdAt: createdAt,
        targetUserId: targetUserId,
        data: data,
      );
}

class NotificationProvider extends ChangeNotifier {
  List<AppNotificationItem> _items = [];
  bool _loading = false;

  List<AppNotificationItem> get items => List.unmodifiable(_items);
  bool get loading => _loading;
  int get unreadCount => _items.where((n) => !n.read).length;

  List<AppNotificationItem> get recent =>
      List<AppNotificationItem>.unmodifiable(_items.take(8));

  /// Unread count for a bottom-nav tab (student vs staff layouts).
  int unreadForTab(int tab, {required bool isStudent}) {
    return _items.where((n) {
      if (n.read) return false;
      final mapped = NotificationRouter.tabForType(
        n.type,
        event: n.event,
        isStudent: isStudent,
      );
      return mapped == tab;
    }).length;
  }

  /// Unread count for one or more notification types (tiles / icons).
  int unreadForTypes(Iterable<String> types) {
    final set = types.map((t) => t.toUpperCase()).toSet();
    if (set.isEmpty) return 0;
    return _items
        .where((n) => !n.read && set.contains(n.type.toUpperCase()))
        .length;
  }

  /// Instant inbox update from Socket.IO (before full reload).
  void upsertLive(Map<String, dynamic> raw) {
    final id = raw['id']?.toString();
    if (id == null || id.isEmpty) return;
    final existing = _items.where((n) => n.id == id).firstOrNull;
    final item = AppNotificationItem.fromJson({
      ...raw,
      // Keep optimistic local read so badges don't jump back up.
      'read': existing?.read == true ? true : (raw['read'] ?? false),
      'createdAt':
          raw['createdAt'] ?? DateTime.now().toUtc().toIso8601String(),
    });
    _items = [item, ..._items.where((n) => n.id != id)];
    notifyListeners();
    unawaited(_persist());
  }

  Future<void> _persist() async {
    await LocalCache.setJson(
      LocalCache.notifications,
      _items.map((n) => n.toCacheJson()).toList(),
    );
  }

  Future<void> load() async {
    final locallyRead = _items.where((n) => n.read).map((n) => n.id).toSet();
    _loading = true;
    notifyListeners();

    final cached = await LocalCache.getList(LocalCache.notifications);
    if (cached.isNotEmpty && _items.isEmpty) {
      _items = cached
          .whereType<Map>()
          .map((e) => AppNotificationItem.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      _loading = false;
      notifyListeners();
    }

    try {
      final data = await ApiClient.instance.get('/notifications/me');
      if (data is List) {
        _items = data.map((e) {
          final item =
              AppNotificationItem.fromJson(e as Map<String, dynamic>);
          // Preserve optimistic mark-as-read until server catches up.
          if (locallyRead.contains(item.id)) {
            return item.copyWith(read: true);
          }
          return item;
        }).toList();
        await _persist();
      }
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  void clearMemory() {
    _items = [];
    notifyListeners();
  }

  /// Optimistic — badges / blue dots drop immediately.
  Future<void> markRead(String id) async {
    final had = _items.any((n) => n.id == id && !n.read);
    if (!had) return;
    _items = _items.map((n) => n.id == id ? n.copyWith(read: true) : n).toList();
    notifyListeners();
    unawaited(_persist());
    try {
      await ApiClient.instance.post('/notifications/$id/read');
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    if (unreadCount == 0) return;
    _items = _items.map((n) => n.copyWith(read: true)).toList();
    notifyListeners();
    unawaited(_persist());
    try {
      await ApiClient.instance.post('/notifications/read-all');
    } catch (_) {}
  }

  Future<void> markTypesRead(Iterable<String> types) async {
    final set = types.map((t) => t.toUpperCase()).toSet();
    final ids = _items
        .where((n) => !n.read && set.contains(n.type.toUpperCase()))
        .map((n) => n.id)
        .toList();
    if (ids.isEmpty) return;
    _items = _items
        .map((n) => ids.contains(n.id) ? n.copyWith(read: true) : n)
        .toList();
    notifyListeners();
    unawaited(_persist());
    for (final id in ids) {
      unawaited(() async {
        try {
          await ApiClient.instance.post('/notifications/$id/read');
        } catch (_) {}
      }());
    }
  }
}
