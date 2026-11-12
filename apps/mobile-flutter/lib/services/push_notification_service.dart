import 'dart:convert';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../core/constants/app_brand.dart';
import '../core/notification_router.dart';
import '../firebase_options.dart';
import '../providers/ui_provider.dart';
import 'api_client.dart';

typedef CurrentUserIdGetter = String? Function();

/// Background isolate handler — must be top-level.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  }
  debugPrint(
    'BG FCM type=${message.data['type']} id=${message.data['notificationId']} '
    'toUser=${message.data['userId']}',
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

  static const _androidChannel = AndroidNotificationChannel(
    'lms_default',
    'LMS Notifications',
    description: 'Chat, fees, attendance and system messages',
    importance: Importance.high,
  );

  bool get isReady => _ready;

  /// Wire UI snack + role filter + in-app navigation.
  void bind({
    required UiProvider ui,
    required CurrentUserIdGetter currentUserId,
    required void Function(String type) onOpenInApp,
  }) {
    _ui = ui;
    _currentUserId = currentUserId;
    _onOpenInApp = onOpenInApp;
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

  /// Foreground: in-app message strip ONLY — no system tray / alert duplicate.
  Future<void> _onForeground(RemoteMessage message) async {
    if (!_isForMe(message.data)) return;

    final type = (message.data['type'] ?? 'GENERAL').toString();
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
    final isChat = type.toUpperCase() == 'CHAT';

    _ui?.showSnack(
      text,
      title: title,
      tone: AppSnackTone.info,
      duration: const Duration(seconds: 5),
      onTap: isChat
          ? () {
              NotificationRouter.setPending(type: 'CHAT');
              _onOpenInApp?.call('CHAT');
            }
          : () {
              NotificationRouter.setPending(type: type);
              _onOpenInApp?.call(type);
            },
    );
  }

  void _openFromMessage(RemoteMessage message, {required bool fromLaunch}) {
    if (!_isForMe(message.data)) return;
    final type = message.data['type']?.toString() ?? 'GENERAL';
    NotificationRouter.setPending(
      type: type,
      notificationId: message.data['notificationId']?.toString(),
      fromLaunch: fromLaunch,
    );
    _onOpenInApp?.call(type);
  }

  void _handlePayload(String? payload, {required bool fromTap}) {
    if (payload == null || payload.isEmpty) return;
    try {
      final map = jsonDecode(payload) as Map<String, dynamic>;
      if (!_isForMe(map)) return;
      final type = map['type']?.toString() ?? 'GENERAL';
      NotificationRouter.setPending(
        type: type,
        notificationId: map['notificationId']?.toString(),
        fromLaunch: false,
      );
      if (fromTap) _onOpenInApp?.call(type);
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
}
