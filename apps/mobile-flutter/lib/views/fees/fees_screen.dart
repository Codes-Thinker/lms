import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
import '../../providers/fee_provider.dart';
import '../../providers/ui_provider.dart';
import 'fee_chat_screen.dart';

class FeesScreen extends StatelessWidget {
  const FeesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final fees = context.watch<FeeProvider>();
    final pad = AppResponsive.pagePad(context);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Fees & Payments'),
        backgroundColor: AppColors.bg,
        centerTitle: true,
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(pad, 8, pad, AppResponsive.shellBottom(context)),
        children: [
          // Pending — flat, no big blue card
          const Text(
            'PENDING AMOUNT',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Rs ${fees.pendingAmount}',
            style: const TextStyle(
              color: AppColors.ink,
              fontSize: 32,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Online transfer → screenshot in chat → admin approves',
            style: TextStyle(color: AppColors.muted, fontSize: 13, height: 1.35),
          ),

          const SizedBox(height: 28),
          const Text(
            'ADMIN PAYMENT DETAILS',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Pay to ${fees.adminName} then open fee chat & attach screenshot',
            style: const TextStyle(color: AppColors.muted, fontSize: 13, height: 1.35),
          ),
          const SizedBox(height: 8),
          _copyRow(context, 'JazzCash', fees.jazzCash),
          _copyRow(context, 'EasyPaisa', fees.easyPaisa),
          _copyRow(context, 'Phone', fees.adminPhone),
          _copyRow(context, 'Bank', '${fees.bankTitle} · ${fees.bankAccount}'),

          const SizedBox(height: 28),
          const Text(
            'YOUR FEE CASES',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 4),
          ...List.generate(fees.cases.length, (i) {
            final c = fees.cases[i];
            final label = c.status == 'APPROVED'
                ? 'Paid · Done'
                : c.status == 'SENT'
                    ? 'Screenshot sent · waiting approve'
                    : 'Due · pay now';
            return Column(
              children: [
                InkWell(
                  onTap: () {
                    Navigator.of(context).push(
                      AppMotion.fadeSlide(FeeChatScreen(caseId: c.id)),
                    );
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(top: 2),
                          child: Icon(
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
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                  color: AppColors.ink,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${c.month} · Rs ${c.amount}',
                                style: const TextStyle(
                                  color: AppColors.muted,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                label,
                                style: const TextStyle(
                                  color: AppColors.blue,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.chat_bubble_outline_rounded,
                          color: AppColors.muted,
                          size: 20,
                        ),
                      ],
                    ),
                  ),
                ),
                if (i < fees.cases.length - 1)
                  const Divider(height: 1, thickness: 0.5, color: AppColors.line),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _copyRow(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: const TextStyle(color: AppColors.muted, fontSize: 14),
            ),
          ),
          Expanded(
            child: Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.ink,
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: value));
              context.read<UiProvider>().showSnack('$label copied');
            },
            icon: const Icon(Icons.copy_rounded, size: 18, color: AppColors.blue),
          ),
        ],
      ),
    );
  }
}
