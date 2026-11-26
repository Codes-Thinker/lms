import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/responsive.dart';
import '../../models/leave_request.dart';
import '../../providers/leave_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_loader.dart';

class LeaveScreen extends StatefulWidget {
  const LeaveScreen({super.key});

  @override
  State<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends State<LeaveScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LeaveProvider>().load();
    });
  }

  Future<void> _openRequestSheet() async {
    final leave = context.read<LeaveProvider>();
    final remaining = leave.balance?.remainingLeaves ?? 0;
    if (remaining <= 0) {
      context.read<UiProvider>().showSnack(
            'No leave days remaining this month',
            tone: AppSnackTone.warning,
          );
      return;
    }

    DateTime selected = DateTime.now().add(const Duration(days: 1));
    double duration = remaining >= 1 ? 1 : 0.5;
    final reasonCtrl = TextEditingController();
    final allowed = <double>[0.5, 1, 1.5, 2]
        .where((d) => d <= remaining + 1e-9)
        .toList();
    if (allowed.isEmpty) return;
    if (!allowed.contains(duration)) duration = allowed.first;

    String draftedReason = '';
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModal) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                12,
                20,
                20 + MediaQuery.of(ctx).viewInsets.bottom,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.line,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Request leave',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Remaining this month: ${remaining.toStringAsFixed(remaining == remaining.roundToDouble() ? 0 : 1)} day(s)',
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Leave date',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      '${selected.year}-${selected.month.toString().padLeft(2, '0')}-${selected.day.toString().padLeft(2, '0')}',
                    ),
                    trailing: const Icon(CupertinoIcons.calendar),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: ctx,
                        initialDate: selected,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setModal(() => selected = picked);
                      }
                    },
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Duration (days)',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: allowed.map((d) {
                      final selectedDur = (duration - d).abs() < 1e-9;
                      return ChoiceChip(
                        label: Text(
                          d == d.roundToDouble() ? '${d.toInt()}' : '$d',
                        ),
                        selected: selectedDur,
                        onSelected: (_) => setModal(() => duration = d),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: reasonCtrl,
                    maxLines: 3,
                    textInputAction: TextInputAction.done,
                    decoration: const InputDecoration(
                      labelText: 'Reason',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        // Capture text before pop — sheet may still rebuild
                        // during close animation after dispose.
                        draftedReason = reasonCtrl.text.trim();
                        Navigator.pop(ctx, true);
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.blue,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('Submit request'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    ).whenComplete(() {
      // Dispose only after the route is fully gone.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        reasonCtrl.dispose();
      });
    });

    if (ok != true || !mounted) return;
    final reason = draftedReason;
    if (reason.length < 3) {
      context.read<UiProvider>().showSnack(
            'Please enter a longer reason (min 3 characters)',
            tone: AppSnackTone.error,
          );
      return;
    }

    final dateStr =
        '${selected.year}-${selected.month.toString().padLeft(2, '0')}-${selected.day.toString().padLeft(2, '0')}';
    final ui = context.read<UiProvider>();
    ui.showLoading();
    try {
      await leave.submit(
        leaveDate: dateStr,
        durationDays: duration,
        reason: reason,
      );
      if (!mounted) return;
      ui.showSnack('Leave request submitted', tone: AppSnackTone.success);
    } catch (e) {
      if (!mounted) return;
      ui.showSnack(
        e.toString().replaceFirst('Exception: ', ''),
        tone: AppSnackTone.error,
      );
    } finally {
      ui.hideLoading();
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return const Color(0xFF059669);
      case 'REJECTED':
        return const Color(0xFFDC2626);
      default:
        return const Color(0xFFD97706);
    }
  }

  @override
  Widget build(BuildContext context) {
    final leave = context.watch<LeaveProvider>();
    final pad = AppResponsive.pagePad(context);
    final bal = leave.balance;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Leave management'),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: 'Request leave',
            onPressed: _openRequestSheet,
            icon: const Icon(CupertinoIcons.add_circled),
          ),
        ],
      ),
      body: leave.loading && bal == null
          ? const Center(child: AppLoader())
          : RefreshIndicator(
              color: AppColors.blue,
              onRefresh: () => leave.load(),
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                  pad,
                  8,
                  pad,
                  AppResponsive.pageBottom(context),
                ),
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'MONTHLY ALLOWANCE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                            color: AppColors.muted,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            _balTile(
                              'Allowed',
                              (bal?.totalAllowance ?? 2).toStringAsFixed(0),
                            ),
                            _balTile(
                              'Used',
                              _fmtDays(bal?.usedLeaves ?? 0),
                            ),
                            _balTile(
                              'Pending',
                              _fmtDays(bal?.pendingLeaves ?? 0),
                            ),
                            _balTile(
                              'Left',
                              _fmtDays(bal?.remainingLeaves ?? 0),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _openRequestSheet,
                            icon: const Icon(CupertinoIcons.calendar_badge_plus),
                            label: const Text('New leave request'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'REQUEST HISTORY',
                    style: TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (leave.requests.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Text(
                        'No leave requests yet.',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    )
                  else
                    ...leave.requests.map((r) => _historyCard(r)),
                ],
              ),
            ),
    );
  }

  String _fmtDays(double n) =>
      n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(1);

  Widget _balTile(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 18,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.muted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _historyCard(LeaveRequest r) {
    final color = _statusColor(r.status);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    r.leaveDate,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    r.status,
                    style: TextStyle(
                      color: color,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${r.durationDays} day(s) · ${r.reason}',
              style: const TextStyle(
                color: AppColors.muted,
                fontSize: 13,
                height: 1.35,
              ),
            ),
            if (r.status == 'REJECTED' &&
                (r.rejectionReason?.isNotEmpty ?? false)) ...[
              const SizedBox(height: 6),
              Text(
                'Reason: ${r.rejectionReason}',
                style: const TextStyle(
                  color: Color(0xFFDC2626),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
