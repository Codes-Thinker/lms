import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_errors.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/quiz_provider.dart';
import '../../providers/ui_provider.dart';
import '../../services/api_client.dart';

class QuizTakeScreen extends StatefulWidget {
  final String quizId;
  final String title;

  const QuizTakeScreen({super.key, required this.quizId, required this.title});

  @override
  State<QuizTakeScreen> createState() => _QuizTakeScreenState();
}

class _QuizTakeScreenState extends State<QuizTakeScreen> {
  bool _loading = true;
  String? _error;
  String? _attemptId;
  List<QuizQuestionView> _questions = [];
  final Map<String, int> _answers = {};
  Map<String, dynamic>? _result;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final qp = context.read<QuizProvider>();
      final take = await qp.loadTake(widget.quizId);
      final attempt = await qp.startAttempt(widget.quizId);
      final qs = (take['questions'] as List? ?? [])
          .whereType<Map>()
          .map((e) => QuizQuestionView.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      if (!mounted) return;
      setState(() {
        _questions = qs;
        _attemptId = attempt['id'] as String?;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = ApiErrors.fromApi(e);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = ApiErrors.friendly(e);
        _loading = false;
      });
    }
  }

  Future<void> _submit() async {
    if (_attemptId == null) return;
    if (_answers.length < _questions.length) {
      context.read<UiProvider>().showSnack(
            'Answer all questions before submit',
            tone: AppSnackTone.warning,
          );
      return;
    }
    final ui = context.read<UiProvider>();
    final qp = context.read<QuizProvider>();
    ui.showLoading('Submitting…');
    try {
      final result = await qp.submitAttempt(_attemptId!, _answers);
      await qp.loadQuizzes();
      await qp.loadCertificates();
      if (!mounted) return;
      setState(() => _result = result);
    } on ApiException catch (e) {
      if (!mounted) return;
      ui.showSnack(ApiErrors.fromApi(e), tone: AppSnackTone.error);
    } catch (e) {
      if (!mounted) return;
      ui.showSnack(ApiErrors.friendly(e), tone: AppSnackTone.error);
    } finally {
      ui.hideLoading();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.title)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.title)),
        body: Center(child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(_error!, textAlign: TextAlign.center),
        )),
      );
    }
    if (_result != null) {
      final passed = _result!['passed'] == true;
      final percent = (_result!['percent'] as num?)?.toDouble() ?? 0;
      final cert = _result!['certificate'];
      return Scaffold(
        appBar: AppBar(title: const Text('Result')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Icon(
              passed ? Icons.verified_rounded : Icons.info_outline_rounded,
              size: 56,
              color: passed ? Colors.green : AppColors.blue,
            ),
            const SizedBox(height: 12),
            Text(
              passed ? 'Passed' : 'Not passed',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              '${percent.toStringAsFixed(1)}% · score ${_result!['score']}/${_result!['maxScore']}',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.muted),
            ),
            if (cert is Map && cert['verificationCode'] != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.green.shade100),
                ),
                child: Text(
                  'Certificate issued\nCode: ${cert['verificationCode']}',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.green.shade800,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: Text(widget.title)),
      body: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        itemCount: _questions.length,
        itemBuilder: (_, i) {
          final q = _questions[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
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
                  'Q${i + 1}. ${q.prompt}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                ...List.generate(q.options.length, (oi) {
                  final selected = _answers[q.id] == oi;
                  return InkWell(
                    onTap: () => setState(() => _answers[q.id] = oi),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Icon(
                            selected
                                ? Icons.radio_button_checked_rounded
                                : Icons.radio_button_off_rounded,
                            size: 20,
                            color: selected ? AppColors.blue : AppColors.muted,
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Text(q.options[oi])),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: ElevatedButton(
            onPressed: _submit,
            child: const Text('Submit quiz'),
          ),
        ),
      ),
    );
  }
}
