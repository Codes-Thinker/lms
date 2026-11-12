class ApiConfig {
  /// Next.js web-admin (run `npm run dev` in apps/web-admin).
  /// iOS Simulator / desktop: 127.0.0.1
  /// Android emulator: use 10.0.2.2 instead if needed.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'http://127.0.0.1:3000',
  );
}
