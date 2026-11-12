import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/ui_provider.dart';
import '../../providers/fee_provider.dart';
import '../../widgets/app_loader.dart';

class FeeChatScreen extends StatefulWidget {
  final String caseId;

  const FeeChatScreen({super.key, required this.caseId});

  @override
  State<FeeChatScreen> createState() => _FeeChatScreenState();
}

class _FeeChatScreenState extends State<FeeChatScreen> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fees = context.watch<FeeProvider>();
    final auth = context.watch<AuthProvider>();
    final feeCase = fees.byId(widget.caseId);

    if (feeCase == null) {
      return const Scaffold(body: Center(child: AppLoader()));
    }

    final statusColor = feeCase.status == 'APPROVED'
        ? AppColors.green
        : feeCase.status == 'SENT'
            ? AppColors.orange
            : AppColors.pink;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              feeCase.courseTitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
            ),
            Text(
              '${feeCase.month} · Rs ${feeCase.amount}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: AppColors.muted, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        backgroundColor: AppColors.bg,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  feeCase.status,
                  style: TextStyle(color: statusColor, fontWeight: FontWeight.w800, fontSize: 11),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.softBlue,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    '1) Transfer to JazzCash/EasyPaisa ${fees.jazzCash}\n'
                    '2) Attach payment screenshot here\n'
                    '3) Admin verifies → Done / Paid',
                    style: const TextStyle(height: 1.45, fontSize: 13, color: AppColors.ink),
                  ),
                ),
                const SizedBox(height: 14),
                ...feeCase.chat.map((msg) {
                  final mine = msg.senderRole == 'STUDENT';
                  return Align(
                    alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      constraints: const BoxConstraints(maxWidth: 300),
                      decoration: BoxDecoration(
                        color: mine ? AppColors.blue : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: mine ? null : Border.all(color: AppColors.line),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${msg.senderName} · ${msg.sentAt}',
                            style: TextStyle(
                              color: mine ? Colors.white70 : AppColors.muted,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            msg.text,
                            style: TextStyle(
                              color: mine ? Colors.white : AppColors.ink,
                              height: 1.35,
                            ),
                          ),
                          if (msg.hasScreenshot) ...[
                            const SizedBox(height: 8),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: mine
                                    ? Colors.white.withValues(alpha: 0.18)
                                    : AppColors.softBlue,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.image_rounded,
                                    color: mine ? Colors.white : AppColors.blue,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      msg.screenshotLabel ?? 'screenshot.jpg',
                                      style: TextStyle(
                                        color: mine ? Colors.white : AppColors.blue,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
                if (feeCase.status == 'SENT') ...[
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: fees.loading
                        ? null
                        : () async {
                            await context.read<FeeProvider>().approve(feeCase.id);
                            if (!context.mounted) return;
                            context.read<UiProvider>().showSnack('Admin approved · fee Done', tone: AppSnackTone.success);
                          },
                    icon: const Icon(Icons.verified_rounded),
                    label: const Text('Demo: Admin approve payment'),
                  ),
                ],
              ],
            ),
          ),
          if (feeCase.status != 'APPROVED')
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: Row(
                  children: [
                    IconButton.filledTonal(
                      onPressed: fees.loading
                          ? null
                          : () async {
                              await context.read<FeeProvider>().sendMessage(
                                    caseId: feeCase.id,
                                    senderName: auth.user?.name ?? 'Student',
                                    text: 'Payment screenshot attached. Please approve.',
                                    withScreenshot: true,
                                  );
                              if (!context.mounted) return;
                              context.read<UiProvider>().showSnack('Screenshot sent to admin', tone: AppSnackTone.info);
                            },
                      icon: const Icon(Icons.add_photo_alternate_outlined),
                      tooltip: 'Attach screenshot',
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: InputDecoration(
                          hintText: 'Message admin…',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    IconButton.filled(
                      onPressed: fees.loading
                          ? null
                          : () async {
                              final text = _controller.text;
                              _controller.clear();
                              await context.read<FeeProvider>().sendMessage(
                                    caseId: feeCase.id,
                                    senderName: auth.user?.name ?? 'Student',
                                    text: text,
                                  );
                            },
                      style: IconButton.styleFrom(backgroundColor: AppColors.blue),
                      icon: fees.loading
                          ? const AppLoader(size: 18, color: Colors.white)
                          : const Icon(Icons.send_rounded, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
