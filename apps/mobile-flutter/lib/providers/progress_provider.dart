import 'package:flutter/foundation.dart';

class ProgressProvider extends ChangeNotifier {
  final Set<String> _completedTopics = {};

  bool isCompleted(String topicId) => _completedTopics.contains(topicId);

  void markComplete(String topicId) {
    _completedTopics.add(topicId);
    notifyListeners();
  }
}
