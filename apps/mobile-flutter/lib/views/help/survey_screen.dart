import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/support_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_loader.dart';

class SurveyScreen extends StatefulWidget {
  const SurveyScreen({super.key});

  @override
  State<SurveyScreen> createState() => _SurveyScreenState();
}

class _SurveyScreenState extends State<SurveyScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SupportProvider>().loadSurveyQuestions();
    });
  }

  @override
  Widget build(BuildContext context) {
    final support = context.watch<SupportProvider>();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: const Text('Survey'), backgroundColor: AppColors.bg),
      body: ListView(
        padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.paddingOf(context).bottom),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.softGreen,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              support.surveyDone
                  ? 'Survey complete. Your name will appear in Admin Feedback.'
                  : 'Training feedback — takes about 2 minutes. Admins can view all responses.',
              style: const TextStyle(fontWeight: FontWeight.w600, height: 1.4),
            ),
          ),
          const SizedBox(height: 16),
          if (support.surveyDone)
            const Icon(Icons.check_circle_rounded, color: AppColors.green, size: 64)
          else ...[
            for (var i = 0; i < support.surveyQuestions.length; i++) ...[
              Text(
                support.surveyQuestions[i],
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              TextField(
                onChanged: (v) => context.read<SupportProvider>().setSurveyAnswer(i, v),
                decoration: InputDecoration(
                  hintText: 'Your answer',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(100),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: support.loading
                    ? null
                    : () async {
                        await context.read<SupportProvider>().submitSurvey();
                        if (!context.mounted) return;
                        context.read<UiProvider>().showSnack('Survey submitted, admin can view', tone: AppSnackTone.success);
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.green,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                ),
                child: support.loading
                    ? const AppLoader(size: 24, color: Colors.white)
                    : const Text('Submit survey', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
