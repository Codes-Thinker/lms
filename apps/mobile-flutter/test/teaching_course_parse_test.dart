import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/providers/teaching_provider.dart';

void main() {
  test('TeachingCourse.fromJson ignores malformed students (no crash)', () {
    final course = TeachingCourse.fromJson({
      'id': 'c1',
      'title': 'Flutter',
      'category': 'Mobile',
      'batch': 'CT-FLUTTER-NOV-26',
      'enrolledCount': 2,
      'students': [
        {
          'id': 's1',
          'name': 'Bilal',
          'email': 'b@x.com',
          'accountType': 'STUDENT',
          'status': 'ACTIVE',
        },
        'broken-row',
        null,
        42,
        {
          'id': 's2',
          'name': 'Ali',
          'email': 'a@x.com',
          'accountType': 'STUDENT',
          'status': 'ACTIVE',
        },
      ],
    });

    expect(course.students.length, 2);
    expect(course.students.first.name, 'Bilal');
    expect(course.title, 'Flutter');
  });

  test('TeachingCourse.fromJson handles missing students list', () {
    final course = TeachingCourse.fromJson({
      'id': 'c1',
      'title': 'MERN',
      'category': 'Web',
    });
    expect(course.students, isEmpty);
    expect(course.enrolledCount, 0);
  });
}
