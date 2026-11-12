import '../models/course.dart';
import '../models/task.dart';
import '../models/user.dart';

class AttendanceDay {
  final String date;
  final String status;
  final String courseTitle;
  final String time;

  const AttendanceDay({
    required this.date,
    required this.status,
    required this.courseTitle,
    required this.time,
  });
}

class ClassSession {
  final String id;
  final String courseTitle;
  final String batch;
  final DateTime startsAt;
  final int present;
  final int total;

  const ClassSession({
    required this.id,
    required this.courseTitle,
    required this.batch,
    required this.startsAt,
    required this.present,
    required this.total,
  });
}

class MockData {
  static DateTime get now => DateTime.now();

  static const AppUser student = AppUser(
    id: 'u-student-1',
    name: 'Ali Khan',
    email: 'ali@codesthinker.com',
    role: 'STUDENT',
    track: 'Flutter Development',
    enrolledCourses: 2,
    department: 'Paid Training',
  );

  static const AppUser intern = AppUser(
    id: 'u-intern-1',
    name: 'Usman Tariq',
    email: 'usman@codesthinker.com',
    role: 'INTERN',
    track: 'Flutter Internship',
    enrolledCourses: 1,
    department: 'Mobile Interns',
  );

  static const AppUser staff = AppUser(
    id: 'u-staff-1',
    name: 'Hassan Raza',
    email: 'hassan@codesthinker.com',
    role: 'STAFF',
    track: 'Training Faculty',
    department: 'Training Faculty',
  );

  /// Back-compat alias
  static const AppUser teacher = staff;

  static List<Course> courses() {
    return [
      Course(
        id: 'c-flutter-1',
        title: 'Flutter Development Internship',
        category: 'Coding',
        track: 'Flutter Development Internship',
        batch: 'CT-FLUTTER-NOV-26',
        thumbnailUrl: 'https://picsum.photos/seed/flutter-ui/800/500',
        durationMonths: 4,
        monthlyFee: 12000,
        totalFee: 48000,
        installmentFee: 6000,
        description: 'Full Flutter track · synced from admin dashboard',
        published: true,
        paidAmount: 24000,
        feeStatus: 'PARTIAL',
        attendancePercent: 88,
        progressPercent: 46,
        rating: 4.8,
        enrolled: true,
        nextClassAt: now.add(const Duration(hours: 2, minutes: 15)),
        feeDueAt: DateTime(2026, 11, 15, 17),
        outline: [
          OutlineSection(
            id: 's1',
            title: 'Month 1 — Foundations',
            topics: [
              Topic(id: 't1', title: 'Dart & project setup', completed: true),
              Topic(id: 't2', title: 'Widgets & layout', completed: true),
              Topic(id: 't3', title: 'Clean Architecture intro', completed: true),
              Topic(id: 't4', title: 'API integration basics', completed: true),
            ],
          ),
          OutlineSection(
            id: 's2',
            title: 'Month 2 — State Management',
            topics: [
              Topic(id: 't5', title: 'Provider ChangeNotifier', completed: true),
              Topic(id: 't6', title: 'MultiProvider', completed: true),
              Topic(id: 't7', title: 'Consumer vs Selector', completed: false),
              Topic(id: 't8', title: 'Auth & progress state', completed: false),
            ],
          ),
          OutlineSection(
            id: 's3',
            title: 'Month 3 — Features',
            topics: [
              Topic(id: 't9', title: 'Navigation & deep links', completed: false),
              Topic(id: 't10', title: 'Forms & validation', completed: false),
            ],
          ),
        ],
      ),
      Course(
        id: 'c-mern-1',
        title: 'MERN Stack Development',
        category: 'Coding',
        track: 'MERN Stack Development',
        batch: 'CT-MERN-OCT-26',
        thumbnailUrl: 'https://picsum.photos/seed/mern-ui/800/500',
        durationMonths: 3,
        monthlyFee: 15000,
        totalFee: 45000,
        installmentFee: 7500,
        description: 'MERN professional track · from admin courses',
        published: true,
        paidAmount: 15000,
        feeStatus: 'DUE',
        attendancePercent: 72,
        progressPercent: 14,
        rating: 4.6,
        enrolled: true,
        nextClassAt: now.add(const Duration(hours: 5, minutes: 40)),
        feeDueAt: DateTime(2026, 11, 12, 17),
        outline: [
          OutlineSection(
            id: 'ns1',
            title: 'Month 1 — Node & Express',
            topics: [
              Topic(id: 'nt1', title: 'Express REST APIs', completed: true),
              Topic(id: 'nt2', title: 'MongoDB models', completed: false),
              Topic(id: 'nt3', title: 'Auth JWT', completed: false),
            ],
          ),
        ],
      ),
      Course(
        id: 'c-web-1',
        title: 'Frontend Engineering with Next.js',
        category: 'Design',
        track: 'Frontend Engineering',
        batch: 'CT-NEXT-NOV-26',
        thumbnailUrl: 'https://picsum.photos/seed/next-ui/800/500',
        durationMonths: 3,
        monthlyFee: 10000,
        totalFee: 30000,
        installmentFee: 5000,
        description: 'Next.js frontend engineering',
        published: true,
        paidAmount: 0,
        feeStatus: 'DUE',
        attendancePercent: 0,
        progressPercent: 0,
        rating: 4.5,
        enrolled: false,
        outline: [
          OutlineSection(
            id: 'ws1',
            title: 'Month 1 — App Router',
            topics: [
              Topic(id: 'wt1', title: 'Routing & layouts'),
              Topic(id: 'wt2', title: 'Server vs client components'),
            ],
          ),
        ],
      ),
    ];
  }

  static List<AttendanceDay> studentAttendance() => const [
        AttendanceDay(date: '12 Nov', status: 'PRESENT', courseTitle: 'Flutter Internship', time: '10:00 AM'),
        AttendanceDay(date: '11 Nov', status: 'PRESENT', courseTitle: 'Flutter Internship', time: '10:00 AM'),
        AttendanceDay(date: '10 Nov', status: 'LATE', courseTitle: 'MERN Stack', time: '02:00 PM'),
        AttendanceDay(date: '09 Nov', status: 'ABSENT', courseTitle: 'MERN Stack', time: '02:00 PM'),
        AttendanceDay(date: '08 Nov', status: 'PRESENT', courseTitle: 'Flutter Internship', time: '10:00 AM'),
      ];

  static List<AssignedTask> assignedTasks() => [
        AssignedTask(
          id: 'task-1',
          title: 'Provider Selector practice',
          description: 'Read notes, practice Selector rebuilds, mark complete.',
          studyNotes:
              '1) Selector se sirf required field listen karo.\n2) Full tree rebuild avoid karo.\n3) Consumer vs Selector short note likho.',
          courseTitle: 'Flutter Development Internship',
          assignedToId: staff.id,
          assignedToName: staff.name,
          assignedBy: 'Ayaz Aslam',
          status: 'IN_PROGRESS',
          dueAt: now.add(const Duration(hours: 4)),
          timerMinutes: 45,
          spentSeconds: 18 * 60,
          updatedAt: '10 min ago',
          chat: [
            TaskChatMessage(
              id: 'c1',
              senderName: 'Ayaz Aslam',
              senderRole: 'ADMIN',
              text: 'Verify today late attendance from app sync.',
              sentAt: '08:10',
            ),
            TaskChatMessage(
              id: 'c2',
              senderName: staff.name,
              senderRole: 'USER',
              text: 'Checking Fatima Noor late mark.',
              sentAt: '08:25',
            ),
          ],
        ),
        AssignedTask(
          id: 'task-intern-1',
          title: 'LMS student app polish (project)',
          description: 'Attendance realtime + role screens polish.',
          studyNotes: 'Push progress updates in chat.',
          courseTitle: 'Intern Project',
          assignedToId: intern.id,
          assignedToName: intern.name,
          assignedBy: 'Ayaz Aslam',
          status: 'IN_PROGRESS',
          dueAt: now.add(const Duration(days: 5)),
          timerMinutes: 90,
          spentSeconds: 20 * 60,
          updatedAt: '20 min ago',
          chat: [
            TaskChatMessage(
              id: 'c4',
              senderName: 'Ayaz Aslam',
              senderRole: 'ADMIN',
              text: 'Deadline 20 Nov. Daily update bhejte rehna.',
              sentAt: '09:00',
            ),
          ],
        ),
        AssignedTask(
          id: 'task-student-note',
          title: 'Fee reminder acknowledgement',
          description: 'Confirm Nov fee status.',
          studyNotes: 'Fees tab check karo.',
          courseTitle: 'Fees Desk',
          assignedToId: student.id,
          assignedToName: student.name,
          assignedBy: 'Ayaz Aslam',
          status: 'PENDING',
          dueAt: now.add(const Duration(hours: 6)),
          timerMinutes: 15,
          spentSeconds: 0,
          updatedAt: '25 min ago',
          chat: [],
        ),
      ];

  static List<ClassSession> teacherSessions() => [
        ClassSession(
          id: 'cs1',
          courseTitle: 'Flutter Development Internship',
          batch: 'CT-FLUTTER-NOV-26',
          startsAt: now.add(const Duration(hours: 1, minutes: 10)),
          present: 24,
          total: 28,
        ),
        ClassSession(
          id: 'cs2',
          courseTitle: 'MERN Stack Development',
          batch: 'CT-MERN-OCT-26',
          startsAt: now.add(const Duration(hours: 4, minutes: 30)),
          present: 0,
          total: 18,
        ),
      ];
}
