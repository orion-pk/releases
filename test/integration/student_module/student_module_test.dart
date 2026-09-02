import 'package:sqlite3/sqlite3.dart';
import 'package:test/test.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';

void main() {
  group('2. Student Module Integration Tests', () {
    late Database db;

    setUp(() {
      db = sqlite3.openInMemory();
      initializeSchema(db);
      ensureDemoUsersExist(db);

      db.execute('''
        CREATE TABLE IF NOT EXISTS student_profiles (
          user_id INTEGER PRIMARY KEY,
          roll_number TEXT UNIQUE,
          grade_level TEXT,
          gpa REAL,
          attendance_percentage REAL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      ''');

      db.execute('''
        CREATE TABLE IF NOT EXISTS student_fees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER,
          amount REAL,
          status TEXT,
          due_date TEXT,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );
      ''');
    });

    tearDown(() {
      db.dispose();
    });

    test('Test 2.1: Student Profile Management', () {
      final regRes = registerUser(db, 'student_sam', 'password123', adminUsername: 'superadmin', adminPassword: 'adminpass');
      expect(regRes['success'], isTrue);
      final studentId = regRes['userId'] as int;

      db.execute('''
        INSERT INTO student_profiles (user_id, roll_number, grade_level, gpa, attendance_percentage)
        VALUES (?, 'STU-2026-01', 'Grade 10-A', 3.85, 95.5);
      ''', [studentId]);

      final profile = db.select('SELECT * FROM student_profiles WHERE user_id = ?;', [studentId]).first;
      expect(profile['roll_number'], equals('STU-2026-01'));
      expect(profile['grade_level'], equals('Grade 10-A'));
      expect(profile['gpa'], equals(3.85));
      expect(profile['attendance_percentage'], equals(95.5));
    });

    test('Test 2.2: Attendance Tracking', () {
      final regRes = registerUser(db, 'student_alex', 'password123', adminUsername: 'superadmin', adminPassword: 'adminpass');
      expect(regRes['success'], isTrue);
      final studentId = regRes['userId'] as int;

      db.execute('''
        INSERT INTO student_profiles (user_id, roll_number, grade_level, gpa, attendance_percentage)
        VALUES (?, 'STU-2026-02', 'Grade 10-B', 3.50, 92.0);
      ''', [studentId]);

      // Update Attendance Percentage to 96%
      db.execute('UPDATE student_profiles SET attendance_percentage = 96.0 WHERE user_id = ?;', [studentId]);

      final updated = db.select('SELECT attendance_percentage FROM student_profiles WHERE user_id = ?;', [studentId]).first;
      expect(updated['attendance_percentage'], equals(96.0));
    });

    test('Test 2.3: Fee and Billing Management', () {
      final regRes = registerUser(db, 'student_fee_user', 'password123', adminUsername: 'superadmin', adminPassword: 'adminpass');
      expect(regRes['success'], isTrue);
      final studentId = regRes['userId'] as int;

      db.execute('''
        INSERT INTO student_fees (student_id, amount, status, due_date)
        VALUES (?, 1200.00, 'Pending', '2026-09-01');
      ''', [studentId]);

      var feeRow = db.select('SELECT * FROM student_fees WHERE student_id = ?;', [studentId]).first;
      expect(feeRow['status'], equals('Pending'));

      // Process Fee Payment to Paid
      db.execute("UPDATE student_fees SET status = 'Paid' WHERE student_id = ?;", [studentId]);

      feeRow = db.select('SELECT status FROM student_fees WHERE student_id = ?;', [studentId]).first;
      expect(feeRow['status'], equals('Paid'));
    });

    test('Test 2.4: Grades and Report Card Permissions', () {
      final regRes = registerUser(db, 'student_grades_user', 'password123', adminUsername: 'superadmin', adminPassword: 'adminpass');
      expect(regRes['success'], isTrue);
      final studentId = regRes['userId'] as int;

      // Verify student role permission check
      final permCheck = checkUserPermission(db, studentId, 'students:create');
      expect(permCheck, isFalse); // Student role does not have students:create permission by default

      assignRoleToUser(db, userId: studentId, roleId: superAdminRoleId, adminUsername: 'superadmin', adminPassword: 'adminpass');
      expect(checkUserPermission(db, studentId, 'students:create'), isTrue);
    });
  });
}
