class TimeUtils {
  /// Always device-local clock (phone timezone).
  static DateTime get nowLocal => DateTime.now().toLocal();

  static DateTime parseLocal(String? raw) {
    final parsed = DateTime.tryParse(raw ?? '');
    if (parsed == null) return nowLocal;
    return parsed.toLocal();
  }

  static String formatTime([DateTime? at]) {
    final local = (at ?? DateTime.now()).toLocal();
    final h = local.hour.toString().padLeft(2, '0');
    final m = local.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  static String formatDateTime([DateTime? at]) {
    final local = (at ?? DateTime.now()).toLocal();
    final d = local.day.toString().padLeft(2, '0');
    final mo = local.month.toString().padLeft(2, '0');
    return '$d/$mo/${local.year}, ${formatTime(local)}';
  }

  static String greeting([DateTime? now]) {
    final hour = (now ?? DateTime.now()).toLocal().hour;
    if (hour < 12) return 'Good Morning!';
    if (hour < 17) return 'Good Afternoon!';
    return 'Good Evening!';
  }

  static String countdown(DateTime target, [DateTime? now]) {
    final current = now ?? DateTime.now();
    var diff = target.difference(current);
    if (diff.isNegative) return 'Started';
    final hours = diff.inHours;
    final minutes = diff.inMinutes.remainder(60);
    final seconds = diff.inSeconds.remainder(60);
    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    }
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  static String dueLabel(DateTime target, [DateTime? now]) {
    final current = now ?? DateTime.now();
    final diff = target.difference(current);
    if (diff.isNegative) return 'Overdue';
    if (diff.inDays >= 1) return '${diff.inDays}d left';
    if (diff.inHours >= 1) return '${diff.inHours}h left';
    return '${diff.inMinutes}m left';
  }
}
