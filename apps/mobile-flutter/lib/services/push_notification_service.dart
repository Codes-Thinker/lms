import 'dart:convert';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show Color;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../core/constants/app_brand.dart';
import '../core/notification_router.dart';
import '../firebase_options.dart';
import '../providers/ui_provider.dart';
import 'api_client.dart';
import 'notify_tone.dart';

typedef CurrentUserIdGetter = String? Function();

/// Background isolate handler — must be top-level.
/// OS already shows FCM `notification` payloads; this covers data-only pushes.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  }
  debugPrint(
    'BG FCM type=${message.data['type']} id=${message.data['notificationId']} '
    'toUser=${message.data['userId']}',
  );

  // Data-only message: surface a tray notification so background still alerts.
  if (message.notification != null) return;

  final title = (message.data['title'] ?? "Code's Thinker").toString();
  final body = (message.data['body'] ?? 'New update').toString();
  final type = (message.data['type'] ?? 'GENERAL').toString();
  final plugin = FlutterLocalNotificationsPlugin();
  const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
  await plugin.initialize(
    settings: const InitializationSettings(android: androidInit),
  );
  const channel = AndroidNotificationChannel(
    'lms_ct_notify',
    "Code's Thinker Alerts",
    description: 'Chat, fees, attendance and system messages',
    importance: Importance.high,
  );
  await plugin
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  final payload = jsonEncode({
    'type': type,
    'notificationId': message.data['notificationId']?.toString(),
    'taskId': message.data['taskId']?.toString(),
    'feeCaseId': message.data['feeCaseId']?.toString() ??
        message.data['caseId']?.toString(),
    'userId': message.data['userId']?.toString(),
  });

  await plugin.show(
    id: message.hashCode,
    title: title,
    body: body,
    notificationDetails: NotificationDetails(
      android: AndroidNotificationDetails(
        channel.id,
        channel.name,
        channelDescription: channel.description,
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
        color: const Color(0xFF2563EB),
      ),
    ),
    payload: payload,
  );
}

class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  FirebaseMessaging? _messaging;
  final _local = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  UiProvider? _ui;
  CurrentUserIdGetter? _currentUserId;
  void Function(String type)? _onOpenInApp;
  void Function()? _onForegroundRefresh;

  /// New channel id so Android picks up the Codes Thinker custom sound.
  static const _androidChannel = AndroidNotificationChannel(
    'lms_ct_notify',
    "Code's Thinker Alerts",
    description: 'Chat, fees, attendance and system messages',
    importance: Importance.high,
    playSound: true,
    sound: RawResourceAndroidNotificationSound('ct_notify'),
  );

  bool get isReady => _ready;

  /// Wire UI snack + role filter + in-app navigation.
  void bind({
    required UiProvider ui,
    required CurrentUserIdGetter currentUserId,
    required void Function(String type) onOpenInApp,
    void Function()? onForegroundRefresh,
  }) {
    _ui = ui;
    _currentUserId = currentUserId;
    _onOpenInApp = onOpenInApp;
    _onForegroundRefresh = onForegroundRefresh;
  }

  void setOnForegroundRefresh(void Function()? cb) {
    _onForegroundRefresh = cb;
  }

  Future<void> init() async {
    if (_ready) return;

    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) {
      debugPrint('Push skipped: unsupported platform');
      return;
    }

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      }
    } on UnsupportedError catch (e) {
      debugPrint('Push skipped (Firebase options): $e');
      return;
    } catch (e) {
      debugPrint('Firebase.initializeApp failed: $e');
      return;
    }

    _messaging = FirebaseMessaging.instance;

    try {
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    } catch (e) {
      debugPrint('BG handler register: $e');
    }

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _local.initialize(
      settings: const InitializationSettings(
        android: androidInit,
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (resp) {
        _handlePayload(resp.payload, fromTap: true);
      },
    );

    final androidPlugin = _local.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(_androidChannel);
    await androidPlugin?.requestNotificationsPermission();

    final settings = await _messaging!.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    debugPrint('FCM permission: ${settings.authorizationStatus}');

    // Never show OS banner while app is open — we use in-app message only.
    await _messaging!.setForegroundNotificationPresentationOptions(
      alert: false,
      badge: true,
      sound: false,
    );

    FirebaseMessaging.onMessage.listen(_onForeground);
    FirebaseMessaging.onMessageOpenedApp.listen((m) {
      _openFromMessage(m, fromLaunch: false);
    });

    final initial = await _messaging!.getInitialMessage();
    if (initial != null) {
      _openFromMessage(initial, fromLaunch: true);
    }

    _ready = true;
  }

  bool _isForMe(Map<String, dynamic> data) {
    final target = data['userId']?.toString();
    if (target == null || target.isEmpty) return true;
    final me = _currentUserId?.call();
    if (me == null || me.isEmpty) return true;
    return me == target;
  }

  String _displayTitle(String rawTitle, String type) {
    final t = type.toUpperCase();
    if (t == 'CHAT') return AppBrand.shortName;
    final lower = rawTitle.toLowerCase();
    if (lower.contains('admin')) return AppBrand.shortName;
    if (rawTitle.trim().isEmpty) return AppBrand.shortName;
    return rawTitle;
  }

  Map<String, String?> _extractMeta(Map<String, dynamic> data) {
    final nested = data['data'];
    final nestedMap = nested is Map
        ? Map<String, dynamic>.from(nested)
        : const <String, dynamic>{};
    String? pick(String key) =>
        data[key]?.toString() ?? nestedMap[key]?.toString();
    return {
      'type': (data['type'] ?? nestedMap['type'] ?? 'GENERAL').toString(),
      'taskId': pick('taskId'),
      'feeCaseId': pick('feeCaseId') ?? pick('caseId') ?? pick('feeId'),
      'courseId': pick('courseId'),
      'event': pick('event'),
      'notificationId': pick('notificationId'),
    };
  }

  /// Foreground: in-app tip strip ONLY — no system tray duplicate.
  Future<void> _onForeground(RemoteMessage message) async {
    if (!_isForMe(message.data)) return;

    final meta = _extractMeta(message.data);
    final type = meta['type']!;
    final rawTitle = message.notification?.title ??
        message.data['title']?.toString() ??
        '';
    final body = message.notification?.body ??
        message.data['body']?.toString() ??
        '';
    final title = _displayTitle(rawTitle, type);
    final text = body.trim().isNotEmpty
        ? body.trim()
        : (rawTitle.trim().isNotEmpty ? rawTitle.trim() : 'New update');

    _onForegroundRefresh?.call();
    await NotifyTone.instance.play();

    final ui = _ui;
    if (ui == null) {
      debugPrint('FCM foreground: UI not bound yet');
      return;
    }

    ui.showTip(
      text,
      title: title.isNotEmpty ? title : NotificationRouter.labelForType(type),
      duration: const Duration(seconds: 5),
      onTap: () {
        NotificationRouter.setPending(
          type: type,
          taskId: meta['taskId'],
          feeCaseId: meta['feeCaseId'],
          courseId: meta['courseId'],
          event: meta['event'],
          notificationId: meta['notificationId'],
        );
        _onOpenInApp?.call(type);
      },
    );
  }

  void _openFromMessage(RemoteMessage message, {required bool fromLaunch}) {
    if (!_isForMe(message.data)) return;
    final meta = _extractMeta(message.data);
    NotificationRouter.setPending(
      type: meta['type'],
      notificationId: meta['notificationId'],
      taskId: meta['taskId'],
      feeCaseId: meta['feeCaseId'],
      courseId: meta['courseId'],
      event: meta['event'],
      fromLaunch: fromLaunch,
    );
    // Cold start: Splash/AppShell consumes pending — don't navigate yet.
    if (fromLaunch) return;
    _onOpenInApp?.call(meta['type']!);
  }

  void _handlePayload(String? payload, {required bool fromTap}) {
    if (payload == null || payload.isEmpty) return;
    try {
      final map = jsonDecode(payload) as Map<String, dynamic>;
      if (!_isForMe(map)) return;
      final meta = _extractMeta(map);
      NotificationRouter.setPending(
        type: meta['type'],
        notificationId: meta['notificationId'],
        taskId: meta['taskId'],
        feeCaseId: meta['feeCaseId'],
        courseId: meta['courseId'],
        event: meta['event'],
        fromLaunch: false,
      );
      if (fromTap) _onOpenInApp?.call(meta['type']!);
    } catch (e) {
      debugPrint('Payload parse: $e');
    }
  }

  Future<String?> getToken() async {
    if (!_ready || _messaging == null) return null;
    try {
      // ignore: deprecated_member_use
      return await _messaging!.getToken();
    } catch (e) {
      debugPrint('FCM token error: $e');
      return null;
    }
  }

  Future<void> registerWithBackend() async {
    final token = await getToken();
    if (token == null || token.isEmpty) return;
    try {
      await ApiClient.instance.post('/notifications/device', body: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });
    } catch (e) {
      debugPrint('FCM register failed: $e');
    }
  }

  Future<void> unregisterFromBackend() async {
    final token = await getToken();
    if (token == null) return;
    try {
      await ApiClient.instance.post('/notifications/device/remove', body: {
        'token': token,
      });
    } catch (_) {}
  }

  /// Local tray alert (arrival / leave office) — works even when FCM is delayed.
  Future<void> showLocalAlert({
    required String title,
    required String body,
    String type = 'ATTENDANCE',
    int id = 91001,
  }) async {
    if (!_ready) {
      try {
        await init();
      } catch (_) {}
    }
    try {
      await _local.show(
        id: id,
        title: title,
        body: body,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            _androidChannel.id,
            _androidChannel.name,
            channelDescription: _androidChannel.description,
            importance: Importance.high,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
            color: const Color(0xFF2563EB),
            playSound: true,
            sound: const RawResourceAndroidNotificationSound('ct_notify'),
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        payload: jsonEncode({'type': type}),
      );
    } catch (e) {
      debugPrint('Local alert failed: $e');
    }
  }
}
