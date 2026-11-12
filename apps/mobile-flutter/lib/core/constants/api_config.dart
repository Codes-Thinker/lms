class ApiConfig {
  /// Nest LMS API (Render). Local override:
  /// --dart-define=API_BASE=http://192.168.1.24:4000
  static const String baseUrl = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://lms-lkza.onrender.com',
  );
}
