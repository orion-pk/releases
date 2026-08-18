import 'package:sqlite3/sqlite3.dart';
import 'package:test/test.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';
import 'package:academia/login_throttle.dart';

void main() {
  late Database db;

  setUp(() {
    setJwtSecretForTesting('Test_Secret_Key_At_Least_32_Bytes_Long_For_Academy_Testing!');
    db = sqlite3.openInMemory();
    initializeSchema(db);
  });

  tearDown(() {
    db.dispose();
  });

  test('Database Validation succeeds on fresh DB schema', () {
    expect(validateDatabase(db), isTrue);
  });

  test('Missing or short JWT secret in environment falls back to default secret', () {
    setJwtSecretForTesting('');
    final token = generateAuthToken(UserSession(userId: 1, username: 'admin', roles: ['Super Admin']));
    expect(token, isNotEmpty);
    expect(verifyAuthToken(token), isNotNull);
    setJwtSecretForTesting('Test_Secret_Key_At_Least_32_Bytes_Long_For_Academy_Testing!');
  });

  test('getResolvedDbFilePath resolves absolute database file path', () {
    final resolved = getResolvedDbFilePath('test_custom.db');
    expect(resolved, contains('test_custom.db'));
  });

  test('getDbConnection refuses to open non-existent database by default', () {
    expect(
      () => getDbConnection('non_existent_academy_db_path.db'),
      throwsA(isA<StateError>()),
    );
  });

  test('Foreign key enforcement is enabled on connection open and cascades user deletion', () {
    final fkPragma = db.select('PRAGMA foreign_keys;').first['foreign_keys'] as int;
    expect(fkPragma, equals(1));

    final res = registerUser(db, 'cascade_target', 'pass123');
    final targetId = res['userId'] as int;

    // Verify user_roles row exists
    final rolesCountBefore = db.select('SELECT COUNT(*) as count FROM user_roles WHERE user_id = ?;', [targetId]).first['count'] as int;
    expect(rolesCountBefore, equals(1));

    // Delete user directly
    db.execute('DELETE FROM users WHERE id = ?;', [targetId]);

    // Verify ON DELETE CASCADE cleaned up orphan user_roles row
    final rolesCountAfter = db.select('SELECT COUNT(*) as count FROM user_roles WHERE user_id = ?;', [targetId]).first['count'] as int;
    expect(rolesCountAfter, equals(0));
  });

  test('registerUser refuses invalid or unknown roleId and creates no orphan user', () {
    registerUser(db, 'admin1', 'adminpass123');

    final res = registerUser(
      db,
      'invalid_role_user',
      'pass123',
      roleId: 99999,
      adminUsername: 'admin1',
      adminPassword: 'adminpass123',
    );

    expect(res['success'], isFalse);
    expect(res['message'], contains('Invalid or unknown role ID'));

    final userCheck = db.select('SELECT id FROM users WHERE username = ?;', ['invalid_role_user']);
    expect(userCheck, isEmpty);
  });

  group('Password Hashing & Salt Security Tests', () {
    test('hashPassword generates BCrypt hashes with unique salt per invocation', () {
      final hash1 = hashPassword('myPassword123');
      final hash2 = hashPassword('myPassword123');

      expect(hash1.startsWith(RegExp(r'^\$2[ab]\$')), isTrue);
      expect(hash2.startsWith(RegExp(r'^\$2[ab]\$')), isTrue);
      expect(hash1, isNot(equals(hash2)));
      expect(verifyPassword('myPassword123', hash1), isTrue);
      expect(verifyPassword('myPassword123', hash2), isTrue);
      expect(verifyPassword('wrongPassword', hash1), isFalse);
    });

    test('verifyPassword supports legacy unsalted SHA-256 hashes for backward compatibility', () {
      const legacySha256 = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';
      expect(verifyPassword('password123', legacySha256), isTrue);
      expect(verifyPassword('wrongpass', legacySha256), isFalse);
    });
  });

  group('Demo Seeding Idempotency Tests', () {
    test('ensureDemoUsersExist is idempotent and preserves modified password / user IDs', () {
      ensureDemoUsersExist(db);

      final adminBefore = db.select('SELECT id, password_hash FROM users WHERE username = ?', ['superadmin']).first;
      final adminIdBefore = adminBefore['id'] as int;

      final newHash = hashPassword('new_custom_password');
      db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, adminIdBefore]);

      ensureDemoUsersExist(db);

      final adminAfter = db.select('SELECT id, password_hash FROM users WHERE username = ?', ['superadmin']).first;
      expect(adminAfter['id'], equals(adminIdBefore));
      expect(adminAfter['password_hash'], equals(newHash));
    });
  });

  group('User Registration Init Logic (Conditions A, B, C)', () {
    test('Condition C: First user automatically gets Super Admin role', () {
      final result = registerUser(db, 'admin1', 'adminpass123');
      expect(result['success'], isTrue);
      expect(result['userId'], isNotNull);

      final roles = getUserRoles(db, result['userId'] as int);
      expect(roles, contains('Super Admin'));
    });

    test('Conditions A & B: Cannot register subsequent user without admin authorization', () {
      registerUser(db, 'admin1', 'adminpass123');

      final result = registerUser(db, 'parent1', 'parentpass', roleId: 4);
      expect(result['success'], isFalse);
      expect(result['message'], contains('authorization token required'));
    });

    test('Conditions A & B: Cannot register subsequent user with invalid admin credentials', () {
      registerUser(db, 'admin1', 'adminpass123');

      final result = registerUser(
        db,
        'parent1',
        'parentpass',
        roleId: 4,
        adminUsername: 'admin1',
        adminPassword: 'wrongpassword',
      );
      expect(result['success'], isFalse);
      expect(result['message'], contains('Invalid Super Admin credentials'));
    });

    test('Conditions A & B: Successfully register subsequent user with valid admin credentials', () {
      registerUser(db, 'admin1', 'adminpass123');

      final result = registerUser(
        db,
        'parent1',
        'parentpass',
        roleId: 4,
        adminUsername: 'admin1',
        adminPassword: 'adminpass123',
      );
      expect(result['success'], isTrue);
      expect(result['userId'], isNotNull);

      final roles = getUserRoles(db, result['userId'] as int);
      expect(roles, contains('Parent'));
    });

    test('Cannot register duplicate username', () {
      registerUser(db, 'admin1', 'adminpass123');

      final result = registerUser(
        db,
        'admin1',
        'newpass',
        adminUsername: 'admin1',
        adminPassword: 'adminpass123',
      );
      expect(result['success'], isFalse);
      expect(result['message'], contains('Username already exists'));
    });

    test('deleteUser deletes user account cleanly with Super Admin authorization', () {
      registerUser(db, 'admin1', 'adminpass123');

      final parentRes = registerUser(
        db,
        'deletable_parent',
        'pass123',
        roleId: 4,
        adminUsername: 'admin1',
        adminPassword: 'adminpass123',
      );
      final parentId = parentRes['userId'] as int;

      final deleteResult = deleteUser(
        db,
        parentId,
        adminUsername: 'admin1',
        adminPassword: 'adminpass123',
      );
      expect(deleteResult['success'], isTrue);

      final userCheck = db.select('SELECT COUNT(*) as count FROM users WHERE id = ?', [parentId]);
      expect(userCheck.first['count'], equals(0));
    });

    test('deleteUser refuses self-deletion', () {
      final adminRes = registerUser(db, 'admin1', 'adminpass123');
      final adminId = adminRes['userId'] as int;

      final admin2Res = registerUser(
        db,
        'admin2',
        'adminpass123',
        adminUsername: 'admin1',
        adminPassword: 'adminpass123',
      );
      final admin2Id = admin2Res['userId'] as int;
      assignRoleToUser(db, userId: admin2Id, roleId: 1, adminUsername: 'admin1', adminPassword: 'adminpass123');

      final deleteResult = deleteUser(
        db,
        adminId,
        adminUsername: 'admin1',
        adminPassword: 'adminpass123',
      );
      expect(deleteResult['success'], isFalse);
      expect(deleteResult['message'], contains('cannot delete their own account'));
    });

    test('deleteUser refuses to delete the last remaining Super Admin', () {
      final adminRes = registerUser(db, 'admin1', 'adminpass123');
      final adminId = adminRes['userId'] as int;

      final deleteResult = deleteUser(
        db,
        adminId,
        adminUsername: 'admin1',
        adminPassword: 'adminpass123',
      );
      expect(deleteResult['success'], isFalse);
    });
  });

  group('RBAC Assignment and Role Actions', () {
    late int adminId;
    late int parentId;

    setUp(() {
      adminId = registerUser(db, 'admin1', 'adminpass123')['userId'] as int;

      parentId = registerUser(
        db,
        'parent1',
        'parentpass',
        roleId: 4,
        adminUsername: 'admin1',
        adminPassword: 'adminpass123',
      )['userId'] as int;
    });

    test('Roles are assigned correctly', () {
      expect(getUserRoles(db, adminId), contains('Super Admin'));
      expect(getUserRoles(db, parentId), contains('Parent'));
    });
  });

  group('JWT Authentication Token Tests', () {
    late UserSession adminSession;

    setUp(() {
      registerUser(db, 'admin1', 'adminpass123');
      adminSession = loginUser(db, 'admin1', 'adminpass123')!;
    });

    test('loginUser generates valid HS256 JWT Token', () {
      expect(adminSession.authToken, isNotNull);
      expect(adminSession.authToken!.split('.').length, equals(3));
    });

    test('verifyAuthToken verifies valid JWT Token successfully', () {
      final verifiedSession = verifyAuthToken(adminSession.authToken!);
      expect(verifiedSession, isNotNull);
      expect(verifiedSession!.username, equals('admin1'));
      expect(verifiedSession.isSuperAdmin, isTrue);
    });

    test('JWT Token authorizes admin operations without password', () {
      final res = registerUser(
        db,
        'user_via_token',
        'pass123',
        adminToken: adminSession.authToken,
      );
      expect(res['success'], isTrue);
      final newUserId = res['userId'] as int;

      expect(() => assignRoleToUser(db,
          adminToken: adminSession.authToken,
          userId: newUserId,
          roleId: 4), returnsNormally);
      expect(getUserRoles(db, newUserId), contains('Parent'));
    });

    test('Tampered or invalid JWT Token is rejected', () {
      final tamperedToken = '${adminSession.authToken!}extra_tamper_chars';
      expect(verifyAuthToken(tamperedToken), isNull);

      final res = registerUser(
        db,
        'intruder_user',
        'pass123',
        adminToken: tamperedToken,
      );
      expect(res['success'], isFalse);
      expect(res['message'], contains('Invalid'));
    });
  });

  group('Server Error Sanitization & Input Parsing Tests', () {
    test('parsePositiveInt handles valid positive integers and rejects invalid/negative inputs', () {
      expect(parsePositiveInt('123'), equals(123));
      expect(parsePositiveInt('1'), equals(1));
      expect(parsePositiveInt('abc'), isNull);
      expect(parsePositiveInt('-5'), isNull);
      expect(parsePositiveInt('0'), isNull);
      expect(parsePositiveInt(null), isNull);
    });

    test('sanitizeErrorMessage passes SecurityException messages through cleanly', () {
      final secEx = SecurityException('Unauthorized role assignment attempt.');
      expect(sanitizeErrorMessage(secEx), equals('Unauthorized role assignment attempt.'));
    });

    test('sanitizeErrorMessage hides unexpected driver / SQLite tracebacks with generic error message', () {
      final rawSqliteError = Exception('UNIQUE constraint failed: users.username, parameters: teacher1, supersecret');
      expect(sanitizeErrorMessage(rawSqliteError), equals('The request could not be completed.'));
    });
  });

  group('LoginThrottle Brute-Force & Rate Limiting Tests', () {
    late DateTime fakeTime;
    late LoginThrottle throttle;

    setUp(() {
      fakeTime = DateTime(2026, 8, 8, 12, 0, 0);
      throttle = LoginThrottle(
        maxAttempts: 5,
        windowDuration: const Duration(minutes: 15),
        lockoutDuration: const Duration(minutes: 15),
        clock: () => fakeTime,
      );
    });

    test('Allows up to 5 failed attempts before locking out', () {
      const ip = '192.168.1.10';
      const user = 'admin1';

      for (int i = 1; i <= 4; i++) {
        expect(throttle.recordFailedAttempt(ip, user), isFalse);
        expect(throttle.isLockedOut(ip, user), isFalse);
      }

      final triggeredLockout = throttle.recordFailedAttempt(ip, user);
      expect(triggeredLockout, isTrue);
      expect(throttle.isLockedOut(ip, user), isTrue);
    });

    test('6th attempt is blocked by lockout', () {
      const ip = '192.168.1.10';
      const user = 'admin1';

      for (int i = 0; i < 5; i++) {
        throttle.recordFailedAttempt(ip, user);
      }

      expect(throttle.isLockedOut(ip, user), isTrue);
      expect(throttle.getRemainingLockoutSeconds(ip, user), equals(900));
    });

    test('Different username from same IP is not affected', () {
      const ip = '192.168.1.10';

      for (int i = 0; i < 5; i++) {
        throttle.recordFailedAttempt(ip, 'user1');
      }

      expect(throttle.isLockedOut(ip, 'user1'), isTrue);
      expect(throttle.isLockedOut(ip, 'user2'), isFalse);
    });

    test('Different IP for same username is not affected', () {
      const user = 'admin1';

      for (int i = 0; i < 5; i++) {
        throttle.recordFailedAttempt('192.168.1.10', user);
      }

      expect(throttle.isLockedOut('192.168.1.10', user), isTrue);
      expect(throttle.isLockedOut('192.168.1.20', user), isFalse);
    });

    test('Successful login clears failure history', () {
      const ip = '192.168.1.10';
      const user = 'admin1';

      for (int i = 0; i < 4; i++) {
        throttle.recordFailedAttempt(ip, user);
      }

      throttle.recordSuccessfulLogin(ip, user);
      expect(throttle.isLockedOut(ip, user), isFalse);

      for (int i = 0; i < 4; i++) {
        expect(throttle.recordFailedAttempt(ip, user), isFalse);
      }
    });

    test('Lockout automatically expires after 15 minutes', () {
      const ip = '192.168.1.10';
      const user = 'admin1';

      for (int i = 0; i < 5; i++) {
        throttle.recordFailedAttempt(ip, user);
      }
      expect(throttle.isLockedOut(ip, user), isTrue);

      fakeTime = fakeTime.add(const Duration(minutes: 16));

      expect(throttle.isLockedOut(ip, user), isFalse);
      expect(throttle.getRemainingLockoutSeconds(ip, user), equals(0));
    });

    test('Username comparison is case-insensitive', () {
      const ip = '192.168.1.10';

      for (int i = 0; i < 4; i++) {
        throttle.recordFailedAttempt(ip, 'Admin1');
      }

      throttle.recordFailedAttempt(ip, 'ADMIN1');
      expect(throttle.isLockedOut(ip, 'admin1'), isTrue);
    });

    test('Old attempts outside 15-minute window expire automatically', () {
      const ip = '192.168.1.10';
      const user = 'admin1';

      for (int i = 0; i < 4; i++) {
        throttle.recordFailedAttempt(ip, user);
      }

      fakeTime = fakeTime.add(const Duration(minutes: 16));

      final triggered = throttle.recordFailedAttempt(ip, user);
      expect(triggered, isFalse);
      expect(throttle.isLockedOut(ip, user), isFalse);
    });
  });
}
