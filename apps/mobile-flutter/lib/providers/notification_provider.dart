import 'package:flutter/foundation.dart';
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
}

class NotificationProvider extends ChangeNotifier {
  List<AppNotificationItem> _items = [];
  bool _loading = false;

  List<AppNotificationItem> get items => List.unmodifiable(_items);
  bool get loading => _loading;
  int get unreadCount => _items.where((n) => !n.read).length;

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
      _items = _items
          .map(
            (n) => n.id == id
                ? AppNotificationItem(
                    id: n.id,
                    title: n.title,
                    body: n.body,
                    type: n.type,
                    read: true,
                    createdAt: n.createdAt,
                    targetUserId: n.targetUserId,
                    data: n.data,
                  )
                : n,
          )
          .toList();
      notifyListeners();
      await LocalCache.setJson(
        LocalCache.notifications,
        _items
            .map(
              (n) => {
                'id': n.id,
                'title': n.title,
                'body': n.body,
                'type': n.type,
                'read': n.read,
                'createdAt': n.createdAt.toIso8601String(),
                'userId': n.targetUserId,
                'data': n.data,
              },
            )
            .toList(),
      );
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    try {
      await ApiClient.instance.post('/notifications/read-all');
      _items = _items
          .map(
            (n) => AppNotificationItem(
              id: n.id,
              title: n.title,
              body: n.body,
              type: n.type,
              read: true,
              createdAt: n.createdAt,
              targetUserId: n.targetUserId,
              data: n.data,
            ),
          )
          .toList();
      notifyListeners();
      await LocalCache.setJson(
        LocalCache.notifications,
        _items
            .map(
              (n) => {
                'id': n.id,
                'title': n.title,
                'body': n.body,
                'type': n.type,
                'read': n.read,
                'createdAt': n.createdAt.toIso8601String(),
                'userId': n.targetUserId,
                'data': n.data,
              },
            )
            .toList(),
      );
    } catch (_) {}
  }
}
