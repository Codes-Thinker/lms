import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/support_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_loader.dart';

class ReportIssueScreen extends StatefulWidget {
  const ReportIssueScreen({super.key});

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SupportProvider>().loadMyTickets();
    });
  }

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final support = context.watch<SupportProvider>();
    final reports =
        support.tickets.where((t) => t.kind == 'REPORT').toList();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Report'),
        backgroundColor: AppColors.bg,
        centerTitle: true,
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(
            20, 12, 20, 20 + MediaQuery.paddingOf(context).bottom),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.softBlue,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Text(
              'Send a class or course report to admin. It appears under Feedback → Reports.',
              style: TextStyle(color: AppColors.ink, height: 1.4, fontSize: 13),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _title,
            textInputAction: TextInputAction.next,
            decoration: _dec('Title'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _body,
            maxLines: 6,
            decoration: _dec('Details'),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 52,
            width: double.infinity,
            child: ElevatedButton(
              onPressed: support.loading
                  ? null
                  : () async {
                      if (_title.text.trim().isEmpty ||
                          _body.text.trim().isEmpty) {
                        context.read<UiProvider>().showSnack(
                              'Please enter title and details',
                              tone: AppSnackTone.warning,
                            );
                        return;
                      }
                      await context.read<SupportProvider>().submitTicket(
                            kind: 'REPORT',
                            title: _title.text,
                            body: _body.text,
                          );
                      if (!context.mounted) return;
                      _title.clear();
                      _body.clear();
                      context.read<UiProvider>().showSnack(
                            'Report submitted to admin',
                            tone: AppSnackTone.success,
                          );
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.blue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: support.loading
                  ? const AppLoader(size: 24, color: Colors.white)
                  : const Text('Submit report',
                      style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 28),
          const Text('My reports',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 10),
          if (reports.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'No reports yet',
                style: TextStyle(color: AppColors.muted),
              ),
            ),
          ...reports.map(_ticketCard),
        ],
      ),
    );
  }

  InputDecoration _dec(String hint) => InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
      );

  Widget _ticketCard(SupportTicket t) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(t.title,
                    style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
              Text(
                t.status,
                style: const TextStyle(
                    color: AppColors.blue,
                    fontWeight: FontWeight.w700,
                    fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(t.body,
              style: const TextStyle(color: AppColors.muted, fontSize: 13)),
        ],
      ),
    );
  }
}
