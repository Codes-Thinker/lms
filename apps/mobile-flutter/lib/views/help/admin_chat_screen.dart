import 'dart:async';

import 'package:flutter/material.dart';
import '../../widgets/app_loader.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/support_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/chat_image.dart';

class AdminChatScreen extends StatefulWidget {
  const AdminChatScreen({super.key});

  @override
  State<AdminChatScreen> createState() => _AdminChatScreenState();
}

class _AdminChatScreenState extends State<AdminChatScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final _picker = ImagePicker();
  Timer? _poll;
  bool _showEmoji = false;
  bool _sending = false;

  static const _emojis = [
    '😀', '😁', '😂', '😊', '😍', '🤝', '👍', '👏',
    '🔥', '🎉', '✅', '📌', '📷', '🙏', '💯', '😎',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await context.read<SupportProvider>().loadAdminChat();
      _scrollToEnd();
    });
    _poll = Timer.periodic(const Duration(seconds: 4), (_) async {
      if (!mounted) return;
      final support = context.read<SupportProvider>();
      if (support.sending) return;
      final before = support.chat.length;
      await support.loadAdminChat(silent: true);
      if (!mounted) return;
      if (support.chat.length > before) _scrollToEnd();
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

  Future<void> _pickImage(ImageSource source) async {
    final auth = context.read<AuthProvider>();
    final support = context.read<SupportProvider>();
    final ui = context.read<UiProvider>();
    final file = await _picker.pickImage(
      source: source,
      maxWidth: 1280,
      maxHeight: 1280,
      imageQuality: 72,
    );
    if (file == null || !mounted) return;
    setState(() => _sending = true);
    try {
      final bytes = await file.readAsBytes();
      final ok = await support.sendChatImage(
        senderName: auth.user?.name ?? 'User',
        bytes: bytes,
        fileName: file.name.isEmpty ? 'chat.jpg' : file.name,
        caption: _controller.text,
      );
      if (!mounted) return;
      if (ok) {
        _controller.clear();
        _scrollToEnd();
      } else {
        ui.showSnack('Could not send photo', tone: AppSnackTone.error);
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _chooseSource() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Camera'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    await _pickImage(source);
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
              'Support chat',
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
                ? const Center(child: AppLoader())
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
                        key: ValueKey(msg.id),
                        alignment:
                            mine ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          constraints: const BoxConstraints(maxWidth: 300),
                          decoration: BoxDecoration(
                            color: mine ? AppColors.blue : Colors.white,
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16),
                              topRight: const Radius.circular(16),
                              bottomLeft: Radius.circular(mine ? 16 : 4),
                              bottomRight: Radius.circular(mine ? 4 : 16),
                            ),
                            border:
                                mine ? null : Border.all(color: AppColors.line),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$fromLabel, ${msg.sentAt}',
                                style: TextStyle(
                                  color:
                                      mine ? Colors.white70 : AppColors.muted,
                                  fontSize: 11,
                                ),
                              ),
                              if (msg.imageData != null &&
                                  msg.imageData!.startsWith('data:image')) ...[
                                const SizedBox(height: 6),
                                ChatImageThumb(
                                  key: ValueKey('img-${msg.imageData.hashCode}'),
                                  imageData: msg.imageData!,
                                  label: msg.imageName,
                                  mine: mine,
                                ),
                              ],
                              if (msg.text.isNotEmpty &&
                                  !(msg.imageData != null &&
                                      (msg.text.trim() == '📷 Photo' ||
                                          msg.text.trim() == 'Photo'))) ...[
                                const SizedBox(height: 4),
                                Text(
                                  msg.text,
                                  style: TextStyle(
                                    color: mine ? Colors.white : AppColors.ink,
                                    height: 1.35,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (_showEmoji)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              color: Colors.white,
              child: Wrap(
                spacing: 4,
                runSpacing: 4,
                children: _emojis
                    .map(
                      (e) => InkWell(
                        onTap: () {
                          _controller.text = '${_controller.text}$e';
                          _controller.selection = TextSelection.fromPosition(
                            TextPosition(offset: _controller.text.length),
                          );
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(6),
                          child: Text(e, style: const TextStyle(fontSize: 22)),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
              child: Row(
                children: [
                  IconButton(
                    onPressed: _sending
                        ? null
                        : () => setState(() => _showEmoji = !_showEmoji),
                    icon: const Icon(Icons.emoji_emotions_outlined),
                    color: AppColors.blue,
                  ),
                  IconButton(
                    onPressed: _sending ? null : _chooseSource,
                    icon: const Icon(Icons.photo_camera_outlined),
                    color: AppColors.blue,
                  ),
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
                  const SizedBox(width: 6),
                  IconButton.filled(
                    onPressed: _sending ? null : () => _send(auth, support),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.blue,
                    ),
                    icon: _sending
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

  Future<void> _send(AuthProvider auth, SupportProvider support) async {
    final text = _controller.text;
    if (text.trim().isEmpty) return;
    _controller.clear();
    setState(() {
      _showEmoji = false;
      _sending = true;
    });
    final ok = await support.sendChat(
      senderName: auth.user?.name ?? 'User',
      text: text,
    );
    if (!mounted) return;
    setState(() => _sending = false);
    _scrollToEnd();
    final ui = context.read<UiProvider>();
    if (!ok) {
      ui.showSnack('Could not send message. Try again.',
          tone: AppSnackTone.error);
    }
  }
}
