import 'package:sqlite3/sqlite3.dart';
import 'package:test/test.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';
import 'package:academia/login_throttle.dart';

void main() {
  group('4. Database and System Admin Integration Tests', () {
    late Database db;
    late LoginThrottle throttle;

    setUp(() {
      db = sqlite3.openInMemory();
      initializeSchema(db);
      ensureDemoUsersExist(db);
      throttle = LoginThrottle();
    });

    tearDown(() {
      db.dispose();
    });

    test('Test 4.1: Super Admin Permission Override', () {
      final res = db.select("SELECT id FROM users WHERE username = 'superadmin';").first;
      final adminId = res['id'] as int;

      // Super Admin bypasses permission checks for any key
      expect(checkUserPermission(db, adminId, 'non_existent_random_permission_key'), isTrue);
      expect(checkUserPermission(db, adminId, 'users:edit'), isTrue);
    });

    test('Test 4.2: Atomic Database Transactions', () {
      // Execute transaction with commit
      db.execute('BEGIN TRANSACTION;');
      db.execute("INSERT INTO users (username, password_hash) VALUES ('tx_user_1', 'pass');");
      db.execute("INSERT INTO users (username, password_hash) VALUES ('tx_user_2', 'pass');");
      db.execute('COMMIT;');

      final count = db.select("SELECT COUNT(*) as count FROM users WHERE username LIKE 'tx_user_%';").first['count'] as int;
      expect(count, equals(2));

      // Rollback transaction test
      db.execute('BEGIN TRANSACTION;');
      db.execute("INSERT INTO users (username, password_hash) VALUES ('tx_user_3', 'pass');");
      db.execute('ROLLBACK;');

      final rolledBack = db.select("SELECT COUNT(*) as count FROM users WHERE username = 'tx_user_3';").first['count'] as int;
      expect(rolledBack, equals(0));
    });

    test('Test 4.3: Login Rate Limiting and IP Throttling', () {
      const clientIp = '192.168.1.100';
      const username = 'test_user';

      // Initial check - not locked out
      expect(throttle.isLockedOut(clientIp, username), isFalse);

      // Record 5 failed attempts to trigger lockout
      for (int i = 0; i < 5; i++) {
        throttle.recordFailedAttempt(clientIp, username);
      }

      // Should now be locked out
      expect(throttle.isLockedOut(clientIp, username), isTrue);

      // Reset throttle
      throttle.reset();
      expect(throttle.isLockedOut(clientIp, username), isFalse);
    });
  });
}
