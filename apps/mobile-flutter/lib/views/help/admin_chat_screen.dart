import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_brand.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/support_provider.dart';
import '../../providers/ui_provider.dart';
import '../../widgets/app_loader.dart';
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
    // Light backup poll — sockets handle most live updates.
    _poll = Timer.periodic(const Duration(seconds: 12), (_) async {
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

    final itemCount =
        support.chat.length + (support.adminTyping ? 1 : 0);

    return Scaffold(
      backgroundColor: const Color(0xFFF3F6FB),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: const Color(0xFFF3F6FB),
        foregroundColor: AppColors.ink,
        titleSpacing: 0,
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.blue.withValues(alpha: 0.14),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(5),
              child: Image.asset(
                AppBrand.markAsset,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.support_agent_rounded,
                  color: AppColors.blueDark,
                  size: 18,
                ),
              ),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Code's Thinker",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                  Text(
                    'Support chat',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: AppColors.muted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: DecoratedBox(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFFF3F6FB), Color(0xFFEEF3FA)],
                ),
              ),
              child: support.loading && support.chat.isEmpty
                  ? const Center(child: AppLoader())
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                      itemCount: itemCount,
                      itemBuilder: (context, index) {
                        if (support.adminTyping &&
                            index == support.chat.length) {
                          return const _TypingBubble();
                        }
                        final msg = support.chat[index];
                        final mine = msg.senderRole == 'USER';
                        final showSeen = mine &&
                            msg.status == 'seen' &&
                            (index == support.chat.length - 1 ||
                                support.chat[index + 1].senderRole != 'USER');
                        return _SupportBubble(
                          key: ValueKey(msg.id),
                          mine: mine,
                          text: msg.text,
                          sentAt: msg.sentAt,
                          status: msg.status,
                          showSeenLabel: showSeen,
                          imageData: msg.imageData,
                          imageName: msg.imageName,
                        );
                      },
                    ),
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
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.96),
              border: const Border(top: BorderSide(color: Color(0xFFE6ECF4))),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 16,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 10, 12, 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    IconButton(
                      onPressed: _sending
                          ? null
                          : () => setState(() => _showEmoji = !_showEmoji),
                      icon: const Icon(Icons.emoji_emotions_outlined),
                      color: AppColors.blueDark,
                    ),
                    IconButton(
                      onPressed: _sending ? null : _chooseSource,
                      icon: const Icon(Icons.photo_camera_outlined),
                      color: AppColors.blueDark,
                    ),
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF7F9FC),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: TextField(
                          controller: _controller,
                          enabled: !_sending,
                          minLines: 1,
                          maxLines: 4,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _send(auth, support),
                          decoration: const InputDecoration(
                            hintText: "Message Code's Thinker…",
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Material(
                      color: AppColors.blueDark,
                      borderRadius: BorderRadius.circular(16),
                      child: InkWell(
                        onTap: _sending ? null : () => _send(auth, support),
                        borderRadius: BorderRadius.circular(16),
                        child: SizedBox(
                          width: 46,
                          height: 46,
                          child: Center(
                            child: _sending
                                ? const AppLoader(size: 18, color: Colors.white)
                                : const Icon(
                                    Icons.arrow_upward_rounded,
                                    color: Colors.white,
                                    size: 22,
                                  ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
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
    if (!ok) {
      context.read<UiProvider>().showSnack(
            'Could not send message. Try again.',
            tone: AppSnackTone.error,
          );
    }
  }
}

class _SupportBubble extends StatelessWidget {
  final bool mine;
  final String text;
  final String sentAt;
  final String status;
  final bool showSeenLabel;
  final String? imageData;
  final String? imageName;

  const _SupportBubble({
    super.key,
    required this.mine,
    required this.text,
    required this.sentAt,
    required this.status,
    required this.showSeenLabel,
    this.imageData,
    this.imageName,
  });

  Future<void> _copy(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!context.mounted) return;
    context.read<UiProvider>().showSnack('Message copied');
    HapticFeedback.selectionClick();
  }

  @override
  Widget build(BuildContext context) {
    if (mine) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 10, left: 48),
          constraints: const BoxConstraints(maxWidth: 300),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
                  ),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(18),
                    topRight: Radius.circular(18),
                    bottomLeft: Radius.circular(18),
                    bottomRight: Radius.circular(6),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.blue.withValues(alpha: 0.25),
                      blurRadius: 12,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (imageData != null &&
                        imageData!.startsWith('data:image')) ...[
                      ChatImageThumb(
                        key: ValueKey('img-${imageData.hashCode}'),
                        imageData: imageData!,
                        label: imageName,
                        mine: true,
                      ),
                      if (text.isNotEmpty &&
                          text.trim() != '📷 Photo' &&
                          text.trim() != 'Photo')
                        const SizedBox(height: 6),
                    ],
                    if (text.isNotEmpty &&
                        !(imageData != null &&
                            (text.trim() == '📷 Photo' ||
                                text.trim() == 'Photo')))
                      Text(
                        text,
                        style: const TextStyle(
                          color: Colors.white,
                          height: 1.35,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          sentAt,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.75),
                            fontSize: 10.5,
                          ),
                        ),
                        const SizedBox(width: 4),
                        _ReceiptTicks(status: status),
                      ],
                    ),
                  ],
                ),
              ),
              if (showSeenLabel)
                const Padding(
                  padding: EdgeInsets.only(top: 3, right: 4),
                  child: Text(
                    'Seen',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.muted,
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
    }

    return Align(
      alignment: Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: text.trim().isEmpty ? null : () => _copy(context),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10, right: 40),
          constraints: const BoxConstraints(maxWidth: 300),
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(6),
              topRight: Radius.circular(18),
              bottomLeft: Radius.circular(18),
              bottomRight: Radius.circular(18),
            ),
            border: Border.all(color: const Color(0xFFE8EEF6)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E293B).withValues(alpha: 0.05),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      "Code's Thinker",
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.muted,
                      ),
                    ),
                  ),
                  if (text.trim().isNotEmpty)
                    InkWell(
                      onTap: () => _copy(context),
                      borderRadius: BorderRadius.circular(8),
                      child: const Padding(
                        padding: EdgeInsets.all(2),
                        child: Icon(
                          Icons.copy_rounded,
                          size: 14,
                          color: AppColors.blueDark,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              if (imageData != null &&
                  imageData!.startsWith('data:image')) ...[
                ChatImageThumb(
                  key: ValueKey('img-${imageData.hashCode}'),
                  imageData: imageData!,
                  label: imageName,
                  mine: false,
                ),
                if (text.isNotEmpty &&
                    text.trim() != '📷 Photo' &&
                    text.trim() != 'Photo')
                  const SizedBox(height: 6),
              ],
              if (text.isNotEmpty &&
                  !(imageData != null &&
                      (text.trim() == '📷 Photo' || text.trim() == 'Photo')))
                Text(
                  text,
                  style: const TextStyle(
                    color: AppColors.ink,
                    height: 1.4,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              const SizedBox(height: 4),
              Text(
                sentAt,
                style: const TextStyle(
                  color: AppColors.muted,
                  fontSize: 10.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReceiptTicks extends StatelessWidget {
  final String status;

  const _ReceiptTicks({required this.status});

  @override
  Widget build(BuildContext context) {
    final seen = status == 'seen';
    final delivered = status == 'delivered' || seen;
    final color = seen
        ? const Color(0xFFBFDBFE)
        : Colors.white.withValues(alpha: 0.85);

    if (!delivered) {
      // Single tick — sent, admin not in chat yet.
      return Icon(Icons.done_rounded, size: 14, color: color);
    }
    // Double tick — delivered / seen (blurred for delivered, clearer for seen).
    return Opacity(
      opacity: seen ? 1 : 0.55,
      child: Icon(Icons.done_all_rounded, size: 15, color: color),
    );
  }
}

class _TypingBubble extends StatefulWidget {
  const _TypingBubble();

  @override
  State<_TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<_TypingBubble> {
  int _step = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 380), (_) {
      if (!mounted) return;
      setState(() => _step = (_step + 1) % 3);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10, right: 40),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(6),
            topRight: Radius.circular(18),
            bottomLeft: Radius.circular(18),
            bottomRight: Radius.circular(18),
          ),
          border: Border.all(color: const Color(0xFFE8EEF6)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final active = i <= _step;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              margin: EdgeInsets.only(right: i == 2 ? 0 : 5),
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: active ? AppColors.blue : const Color(0xFFD8E0EA),
                shape: BoxShape.circle,
              ),
            );
          }),
        ),
      ),
    );
  }
}
