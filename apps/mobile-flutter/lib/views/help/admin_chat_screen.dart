import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/support_provider.dart';
import '../../providers/ui_provider.dart';

class AdminChatScreen extends StatefulWidget {
  const AdminChatScreen({super.key});

  @override
  State<AdminChatScreen> createState() => _AdminChatScreenState();
}

class _AdminChatScreenState extends State<AdminChatScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await context.read<SupportProvider>().loadAdminChat();
      _scrollToEnd();
    });
    _poll = Timer.periodic(const Duration(seconds: 8), (_) async {
      if (!mounted) return;
      await context.read<SupportProvider>().loadAdminChat();
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 80,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final support = context.watch<SupportProvider>();
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Code's Thinker",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            Text(
              'Support chat · replies in real time',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.muted,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.bg,
      ),
      body: Column(
        children: [
          Expanded(
            child: support.loading && support.chat.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: support.chat.length,
                    itemBuilder: (context, index) {
                      final msg = support.chat[index];
                      final mine = msg.senderRole == 'USER';
                      final fromLabel = mine
                          ? (auth.user?.name ?? 'You')
                          : "Code's Thinker";
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
                            border:
                                mine ? null : Border.all(color: AppColors.line),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$fromLabel · ${msg.sentAt}',
                                style: TextStyle(
                                  color:
                                      mine ? Colors.white70 : AppColors.muted,
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
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(auth, support),
                      decoration: InputDecoration(
                        hintText: "Message Code's Thinker…",
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: () => _send(auth, support),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.blue,
                    ),
                    icon: const Icon(Icons.send_rounded, color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _send(AuthProvider auth, SupportProvider support) async {
    final text = _controller.text;
    if (text.trim().isEmpty) return;
    _controller.clear();
    final ok = await support.sendChat(
      senderName: auth.user?.name ?? 'User',
      text: text,
    );
    if (!mounted) return;
    _scrollToEnd();
    final ui = context.read<UiProvider>();
    if (ok) {
      ui.showSnack('Message sent', tone: AppSnackTone.success);
    } else {
      ui.showSnack('Could not send message. Try again.', tone: AppSnackTone.error);
    }
  }
}
