import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../core/constants/api_config.dart';
import '../core/mock_data.dart';
import '../models/user.dart';
import '../services/avatar_service.dart';

enum LoginRole { student, intern, staff }

class AuthProvider extends ChangeNotifier {
  AppUser? _user;
  bool _loading = false;
  LoginRole _loginRole = LoginRole.student;
  String? _error;
  String? _avatarPath;

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

  /// Local fallback when API is offline (password must include codesthinker).
  static const demoAccounts = <LoginRole, ({String email, String password})>{
    LoginRole.student: (email: 'ali@codesthinker.com', password: 'codesthinker'),
    LoginRole.intern: (email: 'usman@codesthinker.com', password: 'codesthinker'),
    LoginRole.staff: (email: 'hassan@codesthinker.com', password: 'codesthinker'),
  };

  static String? validatePassword(String password) {
    final p = password.trim();
    if (p.length < 8) return 'Password must be at least 8 characters';
    if (!p.toLowerCase().contains('codesthinker')) {
      return 'Password must include "codesthinker"';
    }
    return null;
  }

  void selectLoginRole(LoginRole role) {
    _loginRole = role;
    _error = null;
    notifyListeners();
  }

  void selectRole({required bool teacher}) {
    selectLoginRole(teacher ? LoginRole.staff : LoginRole.student);
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

  Future<bool> login({required String email, required String password}) async {
    _loading = true;
    _error = null;
    notifyListeners();

    final normalized = email.trim().toLowerCase();
    final pass = password.trim();

    if (normalized.isEmpty || pass.isEmpty) {
      _error = 'Email and password required';
      _loading = false;
      notifyListeners();
      return false;
    }

    final passErr = validatePassword(pass);
    if (passErr != null) {
      // Still allow login if password was set by admin with rule —
      // only validate format on create; for login just check credentials.
    }

    // 1) Try admin dashboard API (users added from Users section)
    try {
      final res = await http
          .post(
            Uri.parse('${ApiConfig.baseUrl}/api/auth/login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': normalized,
              'password': pass,
              'role': _roleApi,
            }),
          )
          .timeout(const Duration(seconds: 3));

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>;
        _user = AppUser.fromApi(data);
        _loginRole = _mapRole(_user!.role);
        await _loadAvatar();
        _loading = false;
        notifyListeners();
        return true;
      }

      if (res.statusCode == 401 || res.statusCode == 403) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        _error = (body['error'] as String?) ?? 'Login failed';
        _loading = false;
        notifyListeners();
        return false;
      }
    } catch (_) {
      // Fall through to local demo accounts
    }

    // 2) Local demo fallback
    for (final entry in demoAccounts.entries) {
      if (entry.value.email == normalized && entry.value.password == pass) {
        if (entry.key != _loginRole) {
          _error = 'Select correct role for this account';
          _loading = false;
          notifyListeners();
          return false;
        }
        _loginRole = entry.key;
        switch (entry.key) {
          case LoginRole.staff:
            _user = MockData.staff;
            break;
          case LoginRole.intern:
            _user = MockData.intern;
            break;
          case LoginRole.student:
            _user = MockData.student;
            break;
        }
        await _loadAvatar();
        _loading = false;
        notifyListeners();
        return true;
      }
    }

    _error = 'Invalid email or password';
    _loading = false;
    notifyListeners();
    return false;
  }

  LoginRole _mapRole(String role) {
    switch (role) {
      case 'STAFF':
        return LoginRole.staff;
      case 'INTERN':
        return LoginRole.intern;
      default:
        return LoginRole.student;
    }
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
      final res = await http
          .delete(Uri.parse('${ApiConfig.baseUrl}/api/users/$id'))
          .timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        await AvatarService.clear(id);
        logout();
        return true;
      }
    } catch (_) {}
    await AvatarService.clear(id);
    logout();
    return true;
  }

  void setLoginFailed([String? message]) {
    _error = message ?? 'Login failed';
    _loading = false;
    notifyListeners();
  }

  void logout() {
    _user = null;
    _avatarPath = null;
    _error = null;
    _loginRole = LoginRole.student;
    _loading = false;
    notifyListeners();
  }

  /// Instant local session (tests / offline demo) — no network.
  void useDemoSession([LoginRole? role]) {
    _loginRole = role ?? _loginRole;
    switch (_loginRole) {
      case LoginRole.staff:
        _user = MockData.staff;
        break;
      case LoginRole.intern:
        _user = MockData.intern;
        break;
      case LoginRole.student:
        _user = MockData.student;
        break;
    }
    _error = null;
    _loading = false;
    _avatarPath = null;
    notifyListeners();
  }
}
