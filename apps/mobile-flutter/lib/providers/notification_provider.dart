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

  /// Instant inbox update from Socket.IO (before full reload).
  void upsertLive(Map<String, dynamic> raw) {
    final id = raw['id']?.toString();
    if (id == null || id.isEmpty) return;
    final item = AppNotificationItem.fromJson({
      ...raw,
      'read': raw['read'] ?? false,
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
    _loading = true;
    notifyListeners();

    final cached = await LocalCache.getList(LocalCache.notifications);
    if (cached.isNotEmpty) {
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
        _items = data
            .map((e) => AppNotificationItem.fromJson(e as Map<String, dynamic>))
            .toList();
        await LocalCache.setJson(LocalCache.notifications, data);
      }
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  void clearMemory() {
    _items = [];
    notifyListeners();
  }

  Future<void> markRead(String id) async {
    try {
      await ApiClient.instance.post('/notifications/$id/read');
      _items = _items.map((n) => n.id == id ? n.copyWith(read: true) : n).toList();
      notifyListeners();
      await _persist();
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    try {
      await ApiClient.instance.post('/notifications/read-all');
      _items = _items.map((n) => n.copyWith(read: true)).toList();
      notifyListeners();
      await _persist();
    } catch (_) {}
  }
}
