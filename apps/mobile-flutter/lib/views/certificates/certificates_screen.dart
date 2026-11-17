import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/api_config.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/quiz_provider.dart';
import '../../providers/ui_provider.dart';

class CertificatesScreen extends StatefulWidget {
  const CertificatesScreen({super.key});

  @override
  State<CertificatesScreen> createState() => _CertificatesScreenState();
}

class _CertificatesScreenState extends State<CertificatesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<QuizProvider>().loadCertificates();
    });
  }

  @override
  Widget build(BuildContext context) {
    final qp = context.watch<QuizProvider>();
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: const Text('Certificates')),
      body: RefreshIndicator(
        onRefresh: () => qp.loadCertificates(),
        child: qp.loading && qp.certificates.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (qp.error != null)
                    Text(qp.error!, style: const TextStyle(color: Colors.red)),
                  if (qp.certificates.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 40),
                      child: Text(
                        'No certificates yet. Pass a course quiz to earn one.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.muted),
                      ),
                    ),
                  ...qp.certificates.map((c) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.workspace_premium_rounded,
                              color: AppColors.blue),
                          const SizedBox(height: 8),
                          Text(c.title,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 16)),
                          if (c.courseTitle != null) ...[
                            const SizedBox(height: 4),
                            Text(c.courseTitle!,
                                style: const TextStyle(color: AppColors.muted)),
                          ],
                          const SizedBox(height: 8),
                          SelectableText(
                            c.verificationCode,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            c.issuedAt.isEmpty
                                ? ''
                                : 'Issued ${DateTime.tryParse(c.issuedAt)?.toLocal().toString().split('.').first ?? c.issuedAt}',
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.muted),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              TextButton(
                                onPressed: () async {
                                  await Clipboard.setData(
                                    ClipboardData(text: c.verificationCode),
                                  );
                                  if (!context.mounted) return;
                                  context.read<UiProvider>().showSnack(
                                        'Verification code copied',
                                      );
                                },
                                child: const Text('Copy code'),
                              ),
                              TextButton(
                                onPressed: () async {
                                  // Public verify is on admin web host; show API verify hint.
                                  final api = ApiConfig.baseUrl;
                                  final url =
                                      '$api/certificates/verify/${c.verificationCode}';
                                  await Clipboard.setData(ClipboardData(text: url));
                                  if (!context.mounted) return;
                                  context.read<UiProvider>().showSnack(
                                        'Verify link copied',
                                      );
                                },
                                child: const Text('Copy verify link'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
      ),
    );
  }
}
