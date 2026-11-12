import 'package:flutter/foundation.dart';
import '../services/api_client.dart';

class RemoteVersionInfo {
  final String latestVersion;
  final String minimumVersion;
  final bool forceUpdate;
  final String title;
  final String message;
  final String androidUrl;
  final String iosUrl;

  const RemoteVersionInfo({
    required this.latestVersion,
    required this.minimumVersion,
    required this.forceUpdate,
    required this.title,
    required this.message,
    required this.androidUrl,
    required this.iosUrl,
  });

  factory RemoteVersionInfo.fromJson(Map<String, dynamic> json) {
    return RemoteVersionInfo(
      latestVersion: json['latestVersion'] as String? ?? '1.0.0',
      minimumVersion:
          (json['minimumVersion'] ?? json['minVersion']) as String? ?? '1.0.0',
      forceUpdate: json['forceUpdate'] as bool? ?? false,
      title: json['title'] as String? ?? 'Update required',
      message: json['message'] as String? ?? 'Please update the app.',
      androidUrl:
          (json['androidUrl'] ?? json['storeUrlAndroid']) as String? ?? '',
      iosUrl: json['iosUrl'] as String? ?? '',
    );
  }
}

class VersionProvider extends ChangeNotifier {
  static const String appVersion = '1.2.0';

  RemoteVersionInfo? _remote;
  bool _checked = false;
  bool _loading = false;

  RemoteVersionInfo? get remote => _remote;
  bool get checked => _checked;
  bool get loading => _loading;

  bool get needsUpdate {
    if (_remote == null) return false;
    return _compare(appVersion, _remote!.minimumVersion) < 0;
  }

  bool get isLatest {
    if (_remote == null) return true;
    return _compare(appVersion, _remote!.latestVersion) >= 0;
  }

  static int _compare(String a, String b) {
    final pa = a.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    final pb = b.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    while (pa.length < 3) {
      pa.add(0);
    }
    while (pb.length < 3) {
      pb.add(0);
    }
    for (var i = 0; i < 3; i++) {
      if (pa[i] != pb[i]) return pa[i].compareTo(pb[i]);
    }
    return 0;
  }

  Future<void> check() async {
    _loading = true;
    notifyListeners();
    try {
      final body = await ApiClient.instance.get('/system/app-version');
      if (body is Map<String, dynamic>) {
        _remote = RemoteVersionInfo.fromJson(body);
      }
    } catch (_) {
      _remote = null;
    }
    _checked = true;
    _loading = false;
    notifyListeners();
  }
}
