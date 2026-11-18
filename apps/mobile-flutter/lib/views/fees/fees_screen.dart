import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
import '../../providers/course_provider.dart';
import '../../providers/fee_provider.dart';
import '../../providers/ui_provider.dart';
import 'fee_chat_screen.dart';

class FeesScreen extends StatelessWidget {
  const FeesScreen({super.key});

  static const _paidGreen = Color(0xFF059669);

  @override
  Widget build(BuildContext context) {
    final fees = context.watch<FeeProvider>();
    final courses = context.watch<CourseProvider>();
    final pad = AppResponsive.pagePad(context);
    final bottom = AppResponsive.shellBottom(context);
    final pending = fees.pendingAmount;
    final enrolled = courses.enrolledCourses;
    final paidCases =
        fees.cases.where((c) => c.status == 'APPROVED' || c.status == 'PAID');
    final pendingCases = fees.cases
        .where((c) => c.status != 'APPROVED' && c.status != 'PAID');

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Fees & Payments'),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        centerTitle: true,
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(pad, 8, pad, bottom),
        children: [
          const Text(
            'PENDING AMOUNT',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.7,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Rs $pending',
            style: TextStyle(
              color: pending > 0 ? AppColors.ink : _paidGreen,
              fontSize: 36,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.8,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Online transfer → screenshot in chat → admin approves.',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 13,
              height: 1.4,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (enrolled.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text(
              'COURSE FEE SUMMARY',
              style: TextStyle(
                color: AppColors.muted,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.7,
              ),
            ),
            const SizedBox(height: 10),
            ...enrolled.map((c) {
              final remaining = (c.totalFee - c.paidAmount).clamp(0, c.totalFee);
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        c.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Total Rs ${c.totalFee} · '
                        '${c.installmentCount}× Rs ${c.installmentFee} · '
                        'Paid Rs ${c.paidAmount} · Remaining Rs $remaining',
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
            Text(
              'Installments: ${paidCases.length} paid · ${pendingCases.length} pending',
              style: const TextStyle(
                color: AppColors.muted,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],

          const SizedBox(height: 26),
          const Text(
            'ADMIN PAYMENT DETAILS',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.7,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            fees.adminName.trim().isEmpty
                ? 'Payment details will appear once the admin publishes them.'
                : 'Pay to ${fees.adminName}, then open fee chat and attach a screenshot',
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 13,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 12),
          if (fees.jazzCash.isEmpty &&
              fees.easyPaisa.isEmpty &&
              fees.adminPhone.isEmpty &&
              fees.bankAccount.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.line),
              ),
              child: const Text(
                'No payment accounts configured yet.',
                style: TextStyle(color: AppColors.muted),
              ),
            )
          else
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.line),
              ),
              child: Column(
                children: [
                  if (fees.jazzCash.isNotEmpty) ...[
                    _payRow(
                      context,
                      label: 'JazzCash',
                      value: fees.jazzCash,
                      color: const Color(0xFFCC0000),
                      icon: Icons.account_balance_wallet_rounded,
                    ),
                    const Divider(height: 1, color: AppColors.line),
                  ],
                  if (fees.easyPaisa.isNotEmpty) ...[
                    _payRow(
                      context,
                      label: 'EasyPaisa',
                      value: fees.easyPaisa,
                      color: const Color(0xFF00A651),
                      icon: Icons.payments_rounded,
                    ),
                    const Divider(height: 1, color: AppColors.line),
                  ],
                  if (fees.adminPhone.isNotEmpty) ...[
                    _payRow(
                      context,
                      label: 'Phone',
                      value: fees.adminPhone,
                      color: AppColors.blueDark,
                      icon: Icons.phone_rounded,
                    ),
                    const Divider(height: 1, color: AppColors.line),
                  ],
                  if (fees.bankAccount.isNotEmpty ||
                      fees.bankTitle.isNotEmpty)
                    _payRow(
                      context,
                      label: 'Bank',
                      value: [
                        if (fees.bankTitle.isNotEmpty) fees.bankTitle,
                        if (fees.bankAccount.isNotEmpty) fees.bankAccount,
                      ].join(', '),
                      color: const Color(0xFF1A1C2E),
                      icon: Icons.account_balance_rounded,
                    ),
                ],
              ),
            ),

          const SizedBox(height: 26),
          const Text(
            'YOUR FEE CASES',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.7,
            ),
          ),
          const SizedBox(height: 12),
          if (fees.cases.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 24),
              child: Text(
                'No fee cases yet',
                style: TextStyle(color: AppColors.muted),
              ),
            )
          else
            ...fees.cases.map((c) {
              final paid = c.status == 'APPROVED';
              final sent = c.status == 'SENT';
              final label = paid
                  ? 'Paid, Done'
                  : sent
                      ? 'Screenshot sent'
                      : 'Due, pay now';
              final chipBg = paid
                  ? const Color(0xFFECFDF5)
                  : sent
                      ? AppColors.softBlue
                      : const Color(0xFFFFF4EC);
              final chipFg = paid
                  ? _paidGreen
                  : sent
                      ? AppColors.blueDark
                      : const Color(0xFFEA580C);

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Material(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () {
                      Navigator.of(context).push(
                        AppMotion.fadeSlide(FeeChatScreen(caseId: c.id)),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: AppColors.softBlue,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.receipt_long_rounded,
                              color: AppColors.blue,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  c.courseTitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                    color: AppColors.ink,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  '${c.month}, Rs ${c.amount}',
                                  style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 5,
                                  ),
                                  decoration: BoxDecoration(
                                    color: chipBg,
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        paid
                                            ? Icons.check_circle_rounded
                                            : sent
                                                ? Icons.schedule_rounded
                                                : Icons.warning_amber_rounded,
                                        size: 14,
                                        color: chipFg,
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        label,
                                        style: TextStyle(
                                          color: chipFg,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(
                            CupertinoIcons.chat_bubble,
                            color: AppColors.muted,
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _payRow(
    BuildContext context, {
    required String label,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Copy',
            onPressed: () {
              Clipboard.setData(ClipboardData(text: value));
              context.read<UiProvider>().showSnack('$label copied');
            },
            icon: const Icon(
              Icons.copy_rounded,
              size: 18,
              color: AppColors.blue,
            ),
          ),
        ],
      ),
    );
  }
}
