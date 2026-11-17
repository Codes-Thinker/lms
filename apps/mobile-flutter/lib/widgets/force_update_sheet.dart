import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/constants/app_colors.dart';
import '../providers/version_provider.dart';

/// Blocking bottom sheet when app version < admin minimumVersion.
class ForceUpdateGate extends StatefulWidget {
  final Widget child;

  const ForceUpdateGate({super.key, required this.child});

  @override
  State<ForceUpdateGate> createState() => _ForceUpdateGateState();
}

class _ForceUpdateGateState extends State<ForceUpdateGate> {
  bool _sheetOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VersionProvider>().check();
    });
  }

  Future<void> _openSheet(VersionProvider version) async {
    if (_sheetOpen || !mounted) return;
    final info = version.remote;
    if (info == null || !version.needsUpdate) return;

    _sheetOpen = true;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      isDismissible: !info.forceUpdate,
      enableDrag: !info.forceUpdate,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return PopScope(
          canPop: !info.forceUpdate,
          child: Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(
              22,
              14,
              22,
              22 + MediaQuery.paddingOf(ctx).bottom,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.line,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                const SizedBox(height: 18),
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: AppColors.softBlue,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(Icons.system_update_rounded, color: AppColors.blue, size: 28),
                ),
                const SizedBox(height: 14),
                Text(
                  info.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                Text(
                  info.message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.muted, height: 1.4),
                ),
                const SizedBox(height: 14),
                Text(
                  'Your version ${VersionProvider.appVersion} ,  Required ${info.minimumVersion}+',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.blue,
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => _openStore(info),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.blue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                      elevation: 0,
                    ),
                    child: const Text('Update now', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ),
                if (!info.forceUpdate) ...[
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Later'),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
    _sheetOpen = false;
  }

  Future<void> _openStore(RemoteVersionInfo info) async {
    final raw = Platform.isIOS ? info.iosUrl : info.androidUrl;
    final uri = Uri.tryParse(raw);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final version = context.watch<VersionProvider>();
    if (version.checked && version.needsUpdate && !_sheetOpen) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _openSheet(version));
    }
    return widget.child;
  }
}
