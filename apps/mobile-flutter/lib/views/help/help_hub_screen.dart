import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/notification_router.dart';
import '../../core/responsive.dart';
import '../../providers/auth_provider.dart';
import '../fees/fees_screen.dart';
import '../report/report_screen.dart';
import 'admin_chat_screen.dart';
import 'complain_screen.dart';
import 'report_issue_screen.dart';
import 'survey_screen.dart';

class HelpHubScreen extends StatefulWidget {
  const HelpHubScreen({super.key});

  @override
  State<HelpHubScreen> createState() => _HelpHubScreenState();
}

class _HelpHubScreenState extends State<HelpHubScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (NotificationRouter.takeOpenAdminChat()) {
        Navigator.of(context).push(
          AppMotion.fadeSlide(const AdminChatScreen()),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final pad = AppResponsive.pagePad(context);

    final tiles = <_HelpTile>[
      if (auth.isStudent)
        _HelpTile(
          title: 'Fees & payments',
          subtitle: 'Pay online, screenshot, admin approve',
          icon: CupertinoIcons.creditcard,
          onTap: () => Navigator.of(context).push(
            AppMotion.fadeSlide(const FeesScreen()),
          ),
        ),
      _HelpTile(
        title: 'Report',
        subtitle: 'Batch / class issue report to admin',
        icon: CupertinoIcons.flag,
        onTap: () => Navigator.of(context).push(
          AppMotion.fadeSlide(const ReportIssueScreen()),
        ),
      ),
      _HelpTile(
        title: 'Complain',
        subtitle: 'Office / facility complain',
        icon: CupertinoIcons.exclamationmark_circle,
        onTap: () => Navigator.of(context).push(
          AppMotion.fadeSlide(const ComplainScreen()),
        ),
      ),
      _HelpTile(
        title: 'Survey',
        subtitle: 'Complete admin survey, quick fill',
        icon: CupertinoIcons.doc_checkmark,
        onTap: () => Navigator.of(context).push(
          AppMotion.fadeSlide(const SurveyScreen()),
        ),
      ),
      _HelpTile(
        title: "Chat with Code's Thinker",
        subtitle: 'Direct support, real-time replies',
        icon: CupertinoIcons.chat_bubble_2,
        onTap: () => Navigator.of(context).push(
          AppMotion.fadeSlide(const AdminChatScreen()),
        ),
      ),
      _HelpTile(
        title: 'My progress report',
        subtitle: 'Attendance, fees, course stats',
        icon: CupertinoIcons.chart_bar,
        onTap: () => Navigator.of(context).push(
          AppMotion.fadeSlide(const ReportScreen()),
        ),
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Help & support'),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        centerTitle: true,
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(
          pad,
          8,
          pad,
          AppResponsive.pageBottom(context),
        ),
        children: [
          const Text(
            'Report, complain, survey aur admin chat sab yahan.',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 13,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          ...List.generate(tiles.length, (i) {
            final t = tiles[i];
            return Column(
              children: [
                InkWell(
                  onTap: t.onTap,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      children: [
                        Icon(t.icon, color: AppColors.blue, size: 22),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                  color: AppColors.ink,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                t.subtitle,
                                style: const TextStyle(
                                  color: AppColors.muted,
                                  fontSize: 12,
                                  height: 1.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          CupertinoIcons.chevron_forward,
                          color: AppColors.muted,
                          size: 18,
                        ),
                      ],
                    ),
                  ),
                ),
                if (i < tiles.length - 1)
                  const Divider(height: 1, thickness: 0.5, color: AppColors.line),
              ],
            );
          }),
        ],
      ),
    );
  }
}

class _HelpTile {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  _HelpTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });
}
