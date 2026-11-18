import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_space.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/time_utils.dart';
import '../../core/responsive.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/ui_provider.dart';
import '../../services/office_location_service.dart';
import '../../widgets/live_clock.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen>
    with WidgetsBindingObserver {
  bool _locBusy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootLocation());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      OfficeLocationService.instance.refreshNow();
    }
  }

  Future<void> _bootLocation() async {
    final att = context.read<AttendanceProvider>();
    final userId = context.read<AuthProvider>().user?.id;
    OfficeLocationService.instance.bind(att, userId: userId);
    setState(() => _locBusy = true);
    await OfficeLocationService.instance.start(userId: userId);
    if (mounted) setState(() => _locBusy = false);
  }

  String _fmt(DateTime dt) => TimeUtils.formatTimePrecise(dt.toLocal());

  Future<void> _checkIn() async {
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    if (user == null) return;
    final ui = context.read<UiProvider>();
    final att = context.read<AttendanceProvider>();

    setState(() => _locBusy = true);
    final pos = await OfficeLocationService.instance.currentPosition();
    if (!mounted) return;
    if (pos == null) {
      setState(() => _locBusy = false);
      ui.showSnack(
        'Location permission / GPS required for check-in',
        tone: AppSnackTone.error,
      );
      return;
    }
    await att.verifyLocation(pos.latitude, pos.longitude);
    if (!mounted) return;
    if (!att.insideGeofence) {
      setState(() => _locBusy = false);
      ui.showSnack(
        'Office ke ${att.geofenceRadius}m ke andar aao (ab ${att.distanceFromOffice}m door)',
        tone: AppSnackTone.warning,
      );
      return;
    }

    try {
      final mark = await att.checkIn(
        personId: user.id,
        personName: user.name,
        role: user.role,
        lat: pos.latitude,
        lng: pos.longitude,
      );
      if (!mounted) return;
      ui.showSnack('Checked in ${mark.status} at ${_fmt(mark.checkInAt)}');
    } catch (e) {
      if (!mounted) return;
      ui.showSnack(
        e.toString().replaceFirst('Exception: ', ''),
        tone: AppSnackTone.error,
      );
    } finally {
      if (mounted) setState(() => _locBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final user = auth.user;
    final mine = user == null ? null : attendance.todayFor(user.id);
    final pad = AppResponsive.pagePad(context);

    final pushed = ModalRoute.of(context)?.canPop ?? false;
    final bottom = pushed
        ? AppResponsive.pageBottom(context)
        : AppResponsive.shellBottom(context);

    final canCheckIn = attendance.insideGeofence && !_locBusy && !attendance.loading;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Office Attendance'),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: 'Refresh location',
            onPressed: _locBusy
                ? null
                : () async {
                    setState(() => _locBusy = true);
                    await OfficeLocationService.instance
                        .refreshNow(silent: false);
                    if (mounted) setState(() => _locBusy = false);
                  },
            icon: const Icon(Icons.my_location_rounded, size: 20),
          ),
        ],
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(pad, 8, pad, bottom),
        children: [
          Text(
            '${user?.roleLabel ?? 'User'}, Port Singer geofence',
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            user?.name ?? '',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.line),
            ),
            child: Row(
              children: [
                Icon(
                  attendance.insideGeofence
                      ? Icons.location_on_rounded
                      : Icons.location_off_rounded,
                  color: attendance.insideGeofence
                      ? const Color(0xFF059669)
                      : AppColors.muted,
                  size: 22,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _locBusy || attendance.checkingLocation
                            ? 'Checking location…'
                            : !attendance.hasGpsFix
                                ? 'Waiting for GPS…'
                                : attendance.insideGeofence
                                    ? 'Inside office zone'
                                    : 'Outside office zone',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        attendance.distanceFromOffice >= 0
                            ? '${attendance.distanceFromOffice}m away, ${attendance.geofenceRadius}m radius'
                            : attendance.hasGpsFix
                                ? 'Location updating…'
                                : 'Enable GPS + Allow all the time for background alerts',
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Row(
            children: [
              Text(
                'Device time',
                style: TextStyle(color: AppColors.muted, fontSize: 14),
              ),
              Spacer(),
              LiveClock(
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 22,
                  color: AppColors.ink,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Check-in only inside 50m. Arrival / leave alerts need Location = Allow all the time. Check-out anytime. Shift end pe auto checkout (Asia/Karachi).',
            style: TextStyle(color: AppColors.muted, fontSize: 13, height: 1.35),
          ),
          const SizedBox(height: 20),
          if (mine == null)
            AppBtn(
              loading: attendance.loading || _locBusy || user == null,
              label: canCheckIn
                  ? 'Check in, mark attendance'
                  : 'Go inside office zone to check in',
              onPressed: canCheckIn ? _checkIn : null,
            )
          else if (mine.isCheckedIn) ...[
            Text(
              'In office, ${mine.status}',
              style: const TextStyle(
                color: AppColors.blue,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'In ${_fmt(mine.checkInAt)}, duration ${mine.durationLabel}',
              style: const TextStyle(color: AppColors.muted, fontSize: 13),
            ),
            const SizedBox(height: 14),
            AppBtn(
              loading: attendance.loading,
              label: 'Check out, leave office',
              tone: AppBtnTone.secondary,
              onPressed: () async {
                final mark =
                    await context.read<AttendanceProvider>().checkOut(user!.id);
                if (!context.mounted || mark?.checkOutAt == null) return;
                context.read<UiProvider>().showSnack(
                      'Checked out at ${_fmt(mark!.checkOutAt!)}',
                    );
              },
            ),
          ] else ...[
            const Text(
              'Day complete, checked out',
              style: TextStyle(
                color: AppColors.blue,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'In ${_fmt(mine.checkInAt)} → Out ${_fmt(mine.checkOutAt!)}, ${mine.durationLabel}',
              style: const TextStyle(color: AppColors.muted, fontSize: 13),
            ),
          ],
          const SizedBox(height: 28),
          const Text(
            'TODAY',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 4),
          if (attendance.today.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'Office zone mein aao. Check-in enable hoga. Pehli entry pe din mein ek reminder milega.',
                style: TextStyle(color: AppColors.muted, height: 1.4),
              ),
            )
          else
            ...List.generate(attendance.today.length, (i) {
              final row = attendance.today[i];
              final out = row.checkOutAt;
              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      children: [
                        const Icon(
                          CupertinoIcons.person,
                          color: AppColors.blue,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                row.personName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${row.role}, In ${_fmt(row.checkInAt)}'
                                '${out != null ? ', Out ${_fmt(out)}' : ', still in'}',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: AppColors.muted,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          out == null ? row.status : 'OUT',
                          style: const TextStyle(
                            color: AppColors.blue,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (i < attendance.today.length - 1)
                    const Divider(
                        height: 1, thickness: 0.5, color: AppColors.line),
                ],
              );
            }),
        ],
      ),
    );
  }
}
