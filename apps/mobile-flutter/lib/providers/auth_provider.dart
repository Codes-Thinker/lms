import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_errors.dart';
import '../models/user.dart';
import '../services/api_client.dart';
import '../services/avatar_service.dart';
import '../services/local_cache.dart';

enum LoginRole { student, intern, staff }

class AuthProvider extends ChangeNotifier {
  AppUser? _user;
  bool _loading = false;
  LoginRole _loginRole = LoginRole.student;
  String? _error;
  String? _avatarPath;
  bool _hydrated = false;

  AppUser? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get loading => _loading;
  LoginRole get loginRole => _loginRole;
  String? get error => _error;
  String? get avatarPath => _avatarPath;
  bool get isStaff => _user?.isStaff ?? false;
  bool get isIntern => _user?.isIntern ?? false;
  bool get isStudent => _user?.isStudent ?? false;
  bool get isTeacher => isStaff;
  bool get asTeacher => _loginRole == LoginRole.staff;
  String get trackLabel => _user?.track ?? 'Unassigned track';
  bool get hydrated => _hydrated;

  static const _kToken = 'lms_access_token';
  static const _kUser = 'lms_user_json';

  AuthProvider() {
    ApiClient.instance.onUnauthorized = () {
      logout();
    };
    restoreSession();
  }

  Future<void> restoreSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString(_kToken);
      final raw = prefs.getString(_kUser);
      if (token != null && raw != null) {
        ApiClient.instance.setToken(token);
        _user = AppUser.fromApi(jsonDecode(raw) as Map<String, dynamic>);
        _loginRole = _mapRole(_user!.role);
        await _loadAvatar();
      }
    } catch (_) {
      await _clearPersisted();
    }
    _hydrated = true;
    notifyListeners();
  }

  void selectLoginRole(LoginRole role) {
    _loginRole = role;
    _error = null;
    notifyListeners();
  }

  void selectRole({required bool teacher}) {
    selectLoginRole(teacher ? LoginRole.staff : LoginRole.student);
  }

  Future<bool> login({required String email, required String password}) async {
    _loading = true;
    _error = null;
    notifyListeners();

    final normalized = email.trim().toLowerCase();
    final pass = password.trim();

    if (normalized.isEmpty) {
      _error = 'Please enter your email address.';
      _loading = false;
      notifyListeners();
      return false;
    }
    if (!_looksLikeEmail(normalized)) {
      _error = 'Please enter a valid email address.';
      _loading = false;
      notifyListeners();
      return false;
    }
    if (pass.isEmpty) {
      _error = 'Please enter your password.';
      _loading = false;
      notifyListeners();
      return false;
    }
    if (pass.length < 8) {
      _error = 'Password must be at least 8 characters.';
      _loading = false;
      notifyListeners();
      return false;
    }

    try {
      // Don't send a stale Bearer token on login.
      ApiClient.instance.setToken(null);
      final data = await ApiClient.instance.post('/auth/login', body: {
        'email': normalized,
        'password': pass,
      }) as Map<String, dynamic>;

      final token = data['accessToken'] as String?;
      final userJson = data['user'] as Map<String, dynamic>?;
      if (token == null || userJson == null) {
        _error = 'Sign-in failed. Please try again.';
        _loading = false;
        notifyListeners();
        return false;
      }

      final logged = AppUser.fromApi(userJson);
      final expected = _roleApi;
      if (logged.role != expected && logged.role != 'SUPER_ADMIN') {
        _error =
            'This account is ${logged.roleLabel}. Please select the matching role above.';
        _loading = false;
        notifyListeners();
        return false;
      }

      ApiClient.instance.setToken(token);
      _user = logged;
      _loginRole = _mapRole(logged.role);
      await _persist(token, userJson);
      await _loadAvatar();
      _loading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = ApiErrors.fromApi(e);
      _loading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = ApiErrors.friendly(e);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  bool _looksLikeEmail(String value) {
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value);
  }

  String get _roleApi {
    switch (_loginRole) {
      case LoginRole.staff:
        return 'STAFF';
      case LoginRole.intern:
        return 'INTERN';
      case LoginRole.student:
        return 'STUDENT';
    }
  }

  LoginRole _mapRole(String role) {
    switch (role) {
      case 'STAFF':
      case 'SUPER_ADMIN':
        return LoginRole.staff;
      case 'INTERN':
        return LoginRole.intern;
      default:
        return LoginRole.student;
    }
  }

  Future<void> _persist(String token, Map<String, dynamic> userJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kToken, token);
    await prefs.setString(_kUser, jsonEncode(userJson));
  }

  Future<void> _clearPersisted() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kToken);
    await prefs.remove(_kUser);
    ApiClient.instance.setToken(null);
    await LocalCache.clearSession();
  }

  Future<void> _loadAvatar() async {
    if (_user == null) {
      _avatarPath = null;
      return;
    }
    _avatarPath = await AvatarService.loadPath(_user!.id);
  }

  Future<void> setAvatarPath(String path) async {
    if (_user == null) return;
    await AvatarService.savePath(_user!.id, path);
    _avatarPath = path;
    notifyListeners();
  }

  Future<bool> deleteAccount() async {
    if (_user == null) return false;
    _loading = true;
    notifyListeners();
    final id = _user!.id;
    try {
      await ApiClient.instance.patch('/users/$id', body: {'status': 'INACTIVE'});
    } catch (_) {}
    await AvatarService.clear(id);
    await logout();
    return true;
  }

  void setLoginFailed([String? message]) {
    _error = message ?? 'Login failed';
    _loading = false;
    notifyListeners();
  }

  Future<void> logout() async {
    final uid = _user?.id;
    _user = null;
    _avatarPath = null;
    _error = null;
    _loginRole = LoginRole.student;
    _loading = false;
    await _clearPersisted();
    if (uid != null) {
      await AvatarService.clear(uid);
    }
    notifyListeners();
  }

  /// Test-only helper — never used by production login.
  void useDemoSession([LoginRole? role]) {
    _loginRole = role ?? _loginRole;
    _user = AppUser(
      id: 'test-${_loginRole.name}',
      name: 'Test ${_loginRole.name}',
      email: 'test-${_loginRole.name}@codesthinker.com',
      role: _roleApi,
      track: 'Test',
      enrolledCourses: 0,
      department: 'QA',
    );
    _error = null;
    _loading = false;
    _avatarPath = null;
    notifyListeners();
  }
}
