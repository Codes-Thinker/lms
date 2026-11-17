import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../providers/quiz_provider.dart';
import 'quiz_take_screen.dart';

class QuizzesScreen extends StatefulWidget {
  const QuizzesScreen({super.key});

  @override
  State<QuizzesScreen> createState() => _QuizzesScreenState();
}

class _QuizzesScreenState extends State<QuizzesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<QuizProvider>().loadQuizzes();
    });
  }

  @override
  Widget build(BuildContext context) {
    final qp = context.watch<QuizProvider>();
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: const Text('Quizzes')),
      body: RefreshIndicator(
        onRefresh: () => qp.loadQuizzes(),
        child: qp.loading && qp.quizzes.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (qp.error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(qp.error!, style: const TextStyle(color: Colors.red)),
                    ),
                  if (qp.quizzes.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 40),
                      child: Text(
                        'No published quizzes for your courses yet.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.muted),
                      ),
                    ),
                  ...qp.quizzes.map((q) {
                    final canTake = q.attemptsUsed < q.maxAttempts;
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
                          Text(q.title,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 16)),
                          const SizedBox(height: 4),
                          Text(
                            '${q.courseTitle}, ${q.questionCount} Qs, pass ${q.passPercent}%',
                            style: const TextStyle(
                                color: AppColors.muted, fontSize: 13),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            q.passed
                                ? 'Passed · best ${q.bestPercent.toStringAsFixed(0)}%'
                                : 'Attempts ${q.attemptsUsed}/${q.maxAttempts}'
                                    '${q.bestPercent > 0 ? ' · best ${q.bestPercent.toStringAsFixed(0)}%' : ''}',
                            style: TextStyle(
                              color: q.passed ? Colors.green.shade700 : AppColors.ink,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: !canTake
                                  ? null
                                  : () {
                                      Navigator.of(context).push(
                                        AppMotion.fadeSlide(
                                          QuizTakeScreen(quizId: q.id, title: q.title),
                                        ),
                                      );
                                    },
                              child: Text(canTake ? 'Take quiz' : 'No attempts left'),
                            ),
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
