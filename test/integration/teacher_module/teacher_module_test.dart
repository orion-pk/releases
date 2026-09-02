import 'package:sqlite3/sqlite3.dart';
import 'package:test/test.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';

void main() {
  group('3. Teacher Module Integration Tests', () {
    late Database db;

    setUp(() {
      db = sqlite3.openInMemory();
      initializeSchema(db);
      ensureDemoUsersExist(db);

      db.execute('''
        CREATE TABLE IF NOT EXISTS teacher_profiles (
          user_id INTEGER PRIMARY KEY,
          subject_specialty TEXT,
          salary REAL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      ''');

      db.execute('''
        CREATE TABLE IF NOT EXISTS teacher_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacher_id INTEGER,
          student_id INTEGER,
          note_text TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );
      ''');
    });

    tearDown(() {
      db.dispose();
    });

    test('Test 3.1: Teacher Profile and Role Assignment', () {
      final regRes = registerUser(db, 'prof_john', 'password123', adminUsername: 'superadmin', adminPassword: 'adminpass');
      expect(regRes['success'], isTrue);
      final teacherId = regRes['userId'] as int;

      assignRoleToUser(db, userId: teacherId, roleId: teacherRoleId, adminUsername: 'superadmin', adminPassword: 'adminpass');
      expect(getUserRoles(db, teacherId), contains('Teacher'));

      db.execute('''
        INSERT INTO teacher_profiles (user_id, subject_specialty, salary)
        VALUES (?, 'Mathematics & Logic', 4500.00);
      ''', [teacherId]);

      final profile = db.select('SELECT * FROM teacher_profiles WHERE user_id = ?;', [teacherId]).first;
      expect(profile['subject_specialty'], equals('Mathematics & Logic'));
      expect(profile['salary'], equals(4500.00));
    });

    test('Test 3.2: Teacher Permission Gates', () {
      final regRes = registerUser(db, 'teacher_gate_user', 'password123', adminUsername: 'superadmin', adminPassword: 'adminpass');
      expect(regRes['success'], isTrue);
      final teacherId = regRes['userId'] as int;
      assignRoleToUser(db, userId: teacherId, roleId: teacherRoleId, adminUsername: 'superadmin', adminPassword: 'adminpass');

      expect(checkUserPermission(db, teacherId, 'students:view'), isTrue);
      expect(checkUserPermission(db, teacherId, 'students:edit'), isTrue);
      expect(checkUserPermission(db, teacherId, 'users:edit'), isFalse);
    });

    test('Test 3.3: Teacher Student Feedback Notes', () {
      final tRes = registerUser(db, 'teacher_author', 'pass123', adminUsername: 'superadmin', adminPassword: 'adminpass');
      final sRes = registerUser(db, 'student_target', 'pass123', adminUsername: 'superadmin', adminPassword: 'adminpass');
      expect(tRes['success'], isTrue);
      expect(sRes['success'], isTrue);

      final teacherId = tRes['userId'] as int;
      final studentId = sRes['userId'] as int;

      db.execute('''
        INSERT INTO teacher_notes (teacher_id, student_id, note_text)
        VALUES (?, ?, 'Excellent performance in calculus problem set.');
      ''', [teacherId, studentId]);

      final notes = db.select('SELECT note_text FROM teacher_notes WHERE teacher_id = ? AND student_id = ?;', [teacherId, studentId]);
      expect(notes.length, equals(1));
      expect(notes.first['note_text'], contains('calculus problem set'));
    });
  });
}
