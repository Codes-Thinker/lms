import '../services/api_client.dart';

/// User-facing, professional copy for API / login failures.
class ApiErrors {
  ApiErrors._();

  static String friendly(Object error, {String fallback = 'Something went wrong. Please try again.'}) {
    if (error is ApiException) {
      return fromApi(error);
    }
    final raw = error.toString().toLowerCase();
    if (raw.contains('timeout') || raw.contains('waking')) {
      return 'The server is starting up. Please wait a moment and try again.';
    }
    if (raw.contains('socket') ||
        raw.contains('network') ||
        raw.contains('failed host') ||
        raw.contains('connection')) {
      return 'No internet connection. Check your network and try again.';
    }
    return fallback;
  }

  static String fromApi(ApiException e) {
    final msg = e.message.trim();
    final lower = msg.toLowerCase();

    // Validation (400)
    if (e.statusCode == 400) {
      if (lower.contains('email')) {
        return 'Please enter a valid email address.';
      }
      if (lower.contains('password') &&
          (lower.contains('longer') ||
              lower.contains('min') ||
              lower.contains('8'))) {
        return 'Password must be at least 8 characters.';
      }
      if (msg.isNotEmpty && !_looksTechnical(msg)) return msg;
      return 'Please check your details and try again.';
    }

    // Auth (401)
    if (e.statusCode == 401) {
      if (lower.contains('no account') || lower.contains('not found')) {
        return 'No account found with this email.';
      }
      if (lower.contains('incorrect password') ||
          lower.contains('wrong password') ||
          (lower.contains('password') && !lower.contains('email'))) {
        return 'Incorrect password. Please try again.';
      }
      if (lower.contains('not active')) {
        return 'This account is not active. Please contact your admin.';
      }
      if (lower.contains('session expired')) {
        return 'Your session has expired. Please sign in again.';
      }
      if (lower.contains('invalid email or password')) {
        return 'Email or password is incorrect.';
      }
      if (msg.isNotEmpty && !_looksTechnical(msg)) return msg;
      return 'Email or password is incorrect.';
    }

    if (e.statusCode == 403) {
      return 'You do not have permission to do that.';
    }
    if (e.statusCode == 404) {
      return 'The requested item was not found.';
    }
    if (e.statusCode == 408 || e.statusCode == 504) {
      return 'The server is starting up. Please wait a moment and try again.';
    }
    if (e.statusCode == 429) {
      return 'Too many attempts. Please wait a minute and try again.';
    }
    if (e.statusCode >= 500) {
      return 'Server is temporarily unavailable. Please try again shortly.';
    }

    if (msg.isNotEmpty && !_looksTechnical(msg)) return msg;
    return 'Something went wrong. Please try again.';
  }

  static bool _looksTechnical(String msg) {
    final l = msg.toLowerCase();
    return l.contains('exception') ||
        l.contains('stack') ||
        l.contains('errno') ||
        l.contains('socket') ||
        l.contains('http') ||
        l.contains('statuscode') ||
        RegExp(r'^\d{3}$').hasMatch(msg.trim());
  }
}
