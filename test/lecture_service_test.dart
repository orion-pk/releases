import 'package:test/test.dart';
import 'package:sqlite3/sqlite3.dart';
import 'package:academia/database.dart';
import 'package:academia/lecture_service.dart';

void main() {
  late Database db;

  setUp(() {
    db = sqlite3.openInMemory();
    initializeSchema(db);

    // Seed a teacher and 2 students
    db.execute(
      "INSERT INTO users (id, username, password_hash, email, status) VALUES (10, 'mr_johnson', 'hash', 'johnson@academia.edu', 'registered');"
    );
    db.execute("INSERT INTO user_roles (user_id, role_id) VALUES (10, 2);"); // Teacher

    db.execute(
      "INSERT INTO users (id, username, password_hash, email, status) VALUES (20, 'alice_student', 'hash', 'alice@academia.edu', 'registered');"
    );
    db.execute("INSERT INTO user_roles (user_id, role_id) VALUES (20, 3);"); // Student

    db.execute(
      "INSERT INTO users (id, username, password_hash, email, status) VALUES (21, 'bob_student', 'hash', 'bob@academia.edu', 'registered');"
    );
    db.execute("INSERT INTO user_roles (user_id, role_id) VALUES (21, 3);"); // Student
  });

  tearDown(() {
    db.dispose();
  });

  group('Lecture CRUD & Student/Teacher Linking Tests', () {
    test('Create lecture with assigned teacher and students', () {
      final res = LectureService.createLecture(
        db,
        title: 'Algorithms 101',
        subject: 'Computer Science',
        description: 'Introduction to Sorting and Searching',
        teacherId: 10,
        studentIds: [20, 21],
      );

      expect(res['success'], isTrue);
      final lectureId = res['lectureId'] as int;
      expect(lectureId, isPositive);

      final list = LectureService.getLectures(db);
      expect(list.length, equals(1));
      expect(list.first['title'], equals('Algorithms 101'));
      expect(list.first['teacherName'], equals('mr_johnson'));
      expect(list.first['studentCount'], equals(2));

      final detail = LectureService.getLectureById(db, lectureId);
      expect(detail, isNotNull);
      expect(detail!['teacherName'], equals('mr_johnson'));
      final students = detail['students'] as List;
      expect(students.length, equals(2));
      expect(students.map((s) => s['username']).toList(), containsAll(['alice_student', 'bob_student']));
    });

    test('Update lecture metadata and update student assignments', () {
      final createRes = LectureService.createLecture(
        db,
        title: 'Physics Mechanics',
        subject: 'Physics',
        teacherId: 10,
        studentIds: [20],
      );
      final lectureId = createRes['lectureId'] as int;

      final updateRes = LectureService.updateLecture(
        db,
        lectureId,
        title: 'Advanced Mechanics',
        studentIds: [20, 21],
      );
      expect(updateRes['success'], isTrue);

      final detail = LectureService.getLectureById(db, lectureId);
      expect(detail!['title'], equals('Advanced Mechanics'));
      final students = detail['students'] as List;
      expect(students.length, equals(2));
    });

    test('Delete lecture and verify cascade cleanup', () {
      final createRes = LectureService.createLecture(
        db,
        title: 'Chemistry Basics',
        subject: 'Chemistry',
        teacherId: 10,
        studentIds: [20, 21],
      );
      final lectureId = createRes['lectureId'] as int;

      final delRes = LectureService.deleteLecture(db, lectureId);
      expect(delRes['success'], isTrue);

      final list = LectureService.getLectures(db);
      expect(list.isEmpty, isTrue);

      // Verify bridge table is empty
      final bridgeCount = db.select('SELECT COUNT(*) as count FROM lecture_students WHERE lecture_id = ?', [lectureId]);
      expect(bridgeCount.first['count'], equals(0));
    });
  });
}
