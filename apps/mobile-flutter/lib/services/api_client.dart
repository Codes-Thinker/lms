import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import '../core/constants/api_config.dart';

typedef UnauthorizedHandler = void Function();

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  /// Render free cold-start can take 30–60s.
  static const Duration requestTimeout = Duration(seconds: 60);

  String? _token;
  UnauthorizedHandler? onUnauthorized;

  String? get token => _token;

  void setToken(String? token) {
    _token = token;
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = ApiConfig.baseUrl.replaceAll(RegExp(r'/$'), '');
    final p = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$base$p').replace(queryParameters: query);
  }

  Map<String, String> _headers({bool json = true}) {
    final h = <String, String>{
      'Accept': 'application/json',
    };
    if (json) h['Content-Type'] = 'application/json';
    if (_token != null && _token!.isNotEmpty) {
      h['Authorization'] = 'Bearer $_token';
    }
    return h;
  }

  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    try {
      final res = await http
          .get(_uri(path, query), headers: _headers())
          .timeout(requestTimeout);
      return _decode(res, path: path);
    } on TimeoutException {
      throw ApiException(
        408,
        'Server waking up / slow network. Wait and try again.',
      );
    }
  }

  Future<dynamic> post(String path, {Object? body}) async {
    try {
      final res = await http
          .post(
            _uri(path),
            headers: _headers(),
            body: body == null ? null : jsonEncode(body),
          )
          .timeout(requestTimeout);
      return _decode(res, path: path);
    } on TimeoutException {
      throw ApiException(
        408,
        'Server waking up / slow network. Wait and try again.',
      );
    }
  }

  Future<dynamic> patch(String path, {Object? body}) async {
    try {
      final res = await http
          .patch(
            _uri(path),
            headers: _headers(),
            body: body == null ? null : jsonEncode(body),
          )
          .timeout(requestTimeout);
      return _decode(res, path: path);
    } on TimeoutException {
      throw ApiException(
        408,
        'Server waking up / slow network. Wait and try again.',
      );
    }
  }

  Future<dynamic> put(String path, {Object? body}) async {
    try {
      final res = await http
          .put(
            _uri(path),
            headers: _headers(),
            body: body == null ? null : jsonEncode(body),
          )
          .timeout(requestTimeout);
      return _decode(res, path: path);
    } on TimeoutException {
      throw ApiException(
        408,
        'Server waking up / slow network. Wait and try again.',
      );
    }
  }

  Future<dynamic> delete(String path) async {
    try {
      final res = await http
          .delete(_uri(path), headers: _headers())
          .timeout(requestTimeout);
      return _decode(res, path: path);
    } on TimeoutException {
      throw ApiException(
        408,
        'Server waking up / slow network. Wait and try again.',
      );
    }
  }

  dynamic _decode(http.Response res, {required String path}) {
    dynamic data;
    if (res.body.isNotEmpty) {
      try {
        data = jsonDecode(res.body);
      } catch (_) {
        data = res.body;
      }
    }

    String messageFromBody() {
      if (data is Map) {
        final m = data['message'];
        if (m is String && m.isNotEmpty) return m;
        if (m is List && m.isNotEmpty) return m.first.toString();
        if (data['error'] is String) return data['error'] as String;
      }
      return 'Request failed (${res.statusCode})';
    }

    if (res.statusCode == 401) {
      final isAuthRoute =
          path.contains('/auth/login') || path.contains('/auth/accept');
      final hadToken = _token != null && _token!.isNotEmpty;
      // Only clear saved session when an authenticated API call fails.
      if (hadToken && !isAuthRoute) {
        onUnauthorized?.call();
        throw ApiException(401, 'Session expired. Please sign in again');
      }
      throw ApiException(401, messageFromBody());
    }

    if (res.statusCode >= 200 && res.statusCode < 300) return data;
    throw ApiException(res.statusCode, messageFromBody());
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}
