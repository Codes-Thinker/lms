import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/api_errors.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/fee_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_loader.dart';

class FeeChatScreen extends StatefulWidget {
  final String caseId;

  const FeeChatScreen({super.key, required this.caseId});

  @override
  State<FeeChatScreen> createState() => _FeeChatScreenState();
}

class _FeeChatScreenState extends State<FeeChatScreen> {
  final _controller = TextEditingController();
  final _picker = ImagePicker();
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FeeProvider>().load();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _pickAndUpload() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;

    final file = await _picker.pickImage(
      source: source,
      maxWidth: 1280,
      maxHeight: 1280,
      imageQuality: 72,
    );
    if (file == null || !mounted) return;

    setState(() => _uploading = true);
    final fees = context.read<FeeProvider>();
    final ui = context.read<UiProvider>();
    try {
      final bytes = await file.readAsBytes();
      await fees.submitPaymentScreenshot(
        caseId: widget.caseId,
        imageBytes: Uint8List.fromList(bytes),
        fileName: file.name.isEmpty ? 'payment_screenshot.jpg' : file.name,
      );
      if (!mounted) return;
      ui.showSnack(
        'Screenshot sent, waiting for admin approval',
        tone: AppSnackTone.success,
      );
    } catch (e) {
      if (!mounted) return;
      ui.showSnack(
        ApiErrors.friendly(e, fallback: 'Upload failed. Try again.'),
        tone: AppSnackTone.error,
      );
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fees = context.watch<FeeProvider>();
    final auth = context.watch<AuthProvider>();
    final feeCase = fees.byId(widget.caseId);
    final busy = fees.loading || _uploading;

    if (feeCase == null) {
      return const Scaffold(body: Center(child: AppLoader()));
    }

    final statusColor = feeCase.status == 'APPROVED'
        ? AppColors.green
        : feeCase.status == 'SENT'
            ? AppColors.orange
            : feeCase.status == 'REJECTED'
                ? AppColors.pink
                : AppColors.blue;

    final statusLabel = feeCase.status == 'APPROVED'
        ? 'Paid'
        : feeCase.status == 'SENT'
            ? 'Pending review'
            : feeCase.status == 'REJECTED'
                ? 'Rejected'
                : 'Due';

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
              '${feeCase.month}, Rs ${feeCase.amount}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.muted,
                  fontWeight: FontWeight.w500),
            ),
          ],
        ),
        backgroundColor: AppColors.bg,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.w800,
                      fontSize: 11),
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
                    '1) Transfer to JazzCash / EasyPaisa ${fees.jazzCash}\n'
                    '2) Tap the photo button and upload payment screenshot\n'
                    '3) Admin reviews on dashboard and marks Paid',
                    style: const TextStyle(
                        height: 1.45, fontSize: 13, color: AppColors.ink),
                  ),
                ),
                if (feeCase.paymentScreenshotData != null &&
                    feeCase.paymentScreenshotData!.startsWith('data:image')) ...[
                  const SizedBox(height: 14),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Image.memory(
                      _decodeDataUrl(feeCase.paymentScreenshotData!),
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        height: 80,
                        color: AppColors.softBlue,
                        alignment: Alignment.center,
                        child: const Text('Screenshot attached'),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                ...feeCase.chat.map((msg) {
                  final mine = msg.senderRole == 'STUDENT' ||
                      msg.senderRole == 'INTERN';
                  return Align(
                    alignment:
                        mine ? Alignment.centerRight : Alignment.centerLeft,
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
                            '${msg.senderName}, ${msg.sentAt}',
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
                                    color:
                                        mine ? Colors.white : AppColors.blue,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      msg.screenshotLabel ??
                                          'Payment screenshot',
                                      style: TextStyle(
                                        color: mine
                                            ? Colors.white
                                            : AppColors.blue,
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
              ],
            ),
          ),
          if (feeCase.status != 'APPROVED')
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: busy ? null : _pickAndUpload,
                        icon: _uploading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.add_photo_alternate_outlined),
                        label: Text(
                          feeCase.status == 'SENT'
                              ? 'Re-upload screenshot'
                              : 'Upload payment screenshot',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.blue,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
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
                          onPressed: busy
                              ? null
                              : () async {
                                  final text = _controller.text;
                                  if (text.trim().isEmpty) return;
                                  _controller.clear();
                                  try {
                                    await context
                                        .read<FeeProvider>()
                                        .sendMessage(
                                          caseId: feeCase.id,
                                          senderName:
                                              auth.user?.name ?? 'Student',
                                          text: text,
                                        );
                                  } catch (e) {
                                    if (!context.mounted) return;
                                    context.read<UiProvider>().showSnack(
                                          ApiErrors.friendly(e),
                                          tone: AppSnackTone.error,
                                        );
                                  }
                                },
                          style: IconButton.styleFrom(
                              backgroundColor: AppColors.blue),
                          icon: busy
                              ? const AppLoader(size: 18, color: Colors.white)
                              : const Icon(Icons.send_rounded,
                                  color: Colors.white),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Uint8List _decodeDataUrl(String dataUrl) {
    final comma = dataUrl.indexOf(',');
    final b64 = comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
    return base64Decode(b64);
  }
}
