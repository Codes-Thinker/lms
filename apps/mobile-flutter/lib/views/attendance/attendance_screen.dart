import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_space.dart';
import '../../core/constants/app_colors.dart';
import '../../core/responsive.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/ui_provider.dart';

class AttendanceScreen extends StatelessWidget {
  const AttendanceScreen({super.key});

  String _fmt(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    final s = dt.second.toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final now = context.watch<UiProvider>().now;
    final user = auth.user;
    final mine = user == null ? null : attendance.todayFor(user.id);
    final predicted = attendance.autoStatus(now);
    final pad = AppResponsive.pagePad(context);

    final pushed = ModalRoute.of(context)?.canPop ?? false;
    final bottom = pushed
        ? AppResponsive.pageBottom(context)
        : AppResponsive.shellBottom(context);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Office Attendance'),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        centerTitle: true,
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(pad, 8, pad, bottom),
        children: [
          Text(
            '${user?.roleLabel ?? 'User'} · office check-in',
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
          Row(
            children: [
              const Text(
                'Device time',
                style: TextStyle(color: AppColors.muted, fontSize: 14),
              ),
              const Spacer(),
              Text(
                _fmt(now),
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 22,
                  color: AppColors.ink,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Check-in now → $predicted (late after 10:05 AM). Check-out jab office chhoren.',
            style: const TextStyle(color: AppColors.muted, fontSize: 13, height: 1.35),
          ),
          const SizedBox(height: 20),
          if (mine == null)
            AppBtn(
              loading: attendance.loading || user == null,
              label: 'Check in · mark attendance',
              onPressed: user == null
                  ? null
                  : () async {
                      final mark = await context.read<AttendanceProvider>().checkIn(
                            personId: user.id,
                            personName: user.name,
                            role: user.role,
                          );
                      if (!context.mounted) return;
                      context.read<UiProvider>().showSnack(
                            'Checked in ${mark.status} at ${_fmt(mark.checkInAt)}',
                          );
                    },
            )
          else if (mine.isCheckedIn) ...[
            Text(
              'In office · ${mine.status}',
              style: const TextStyle(
                color: AppColors.blue,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'In ${_fmt(mine.checkInAt)} · duration ${mine.durationLabel}',
              style: const TextStyle(color: AppColors.muted, fontSize: 13),
            ),
            const SizedBox(height: 14),
            AppBtn(
              loading: attendance.loading,
              label: 'Check out · leave office',
              tone: AppBtnTone.secondary,
              onPressed: () async {
                final mark = await context.read<AttendanceProvider>().checkOut(user!.id);
                if (!context.mounted || mark?.checkOutAt == null) return;
                context.read<UiProvider>().showSnack(
                      'Checked out at ${_fmt(mark!.checkOutAt!)}',
                    );
              },
            ),
          ] else ...[
            const Text(
              'Day complete · checked out',
              style: TextStyle(
                color: AppColors.blue,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'In ${_fmt(mine.checkInAt)} → Out ${_fmt(mine.checkOutAt!)} · ${mine.durationLabel}',
              style: const TextStyle(color: AppColors.muted, fontSize: 13),
            ),
          ],
          const SizedBox(height: 28),
          const Text(
            'TODAY · WHO CAME / LEFT',
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
                'No check-ins yet. Jab office aao, Check in dabao — dashboard pe time sync hoga.',
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
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${row.role} · In ${_fmt(row.checkInAt)}'
                                '${out != null ? ' · Out ${_fmt(out)}' : ' · still in'}',
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
                    const Divider(height: 1, thickness: 0.5, color: AppColors.line),
                ],
              );
            }),
        ],
      ),
    );
  }
}
