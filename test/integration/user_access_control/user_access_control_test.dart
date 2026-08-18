import 'package:sqlite3/sqlite3.dart';
import 'package:test/test.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';

void main() {
  group('1. User and Access Control Integration Tests', () {
    late Database db;
    late String adminToken;

    setUp(() {
      setJwtSecretForTesting('Integration_Test_Secret_Key_32_Bytes_Long!');
      db = sqlite3.openInMemory();
      initializeSchema(db);
      ensureDemoUsersExist(db);

      final session = loginUser(db, 'superadmin', 'adminpass');
      adminToken = generateAuthToken(session!);
    });

    tearDown(() {
      db.dispose();
    });

    test('Test 1.1: User Registration, Profile Update, and Cascade Deletion', () {
      final regRes = registerUser(
        db,
        'new_user_1',
        'password123',
        adminUsername: 'superadmin',
        adminPassword: 'adminpass',
        email: 'user1@academia.edu',
        phoneNumber: '555-0192',
      );
      expect(regRes['success'], isTrue);
      final userId = regRes['userId'] as int;

      // Update User Details
      final updateRes = updateUser(
        db,
        userId,
        adminToken: adminToken,
        email: 'updated1@academia.edu',
        phoneNumber: '555-9999',
        status: 'active',
      );
      expect(updateRes['success'], isTrue);

      final userRow = db.select('SELECT email, phone_number, status FROM users WHERE id = ?;', [userId]).first;
      expect(userRow['email'], equals('updated1@academia.edu'));
      expect(userRow['phone_number'], equals('555-9999'));
      expect(userRow['status'], equals('active'));

      // Delete User with Cascade Cleanup
      final deleteRes = deleteUser(db, userId, adminUsername: 'superadmin', adminPassword: 'adminpass');
      expect(deleteRes['success'], isTrue);
      final count = db.select('SELECT COUNT(*) as count FROM users WHERE id = ?;', [userId]).first['count'] as int;
      expect(count, equals(0));
    });

    test('Test 1.2: Dynamic Role Assignment', () {
      final regRes = registerUser(
        db,
        'role_test_user',
        'password123',
        adminUsername: 'superadmin',
        adminPassword: 'adminpass',
      );
      expect(regRes['success'], isTrue);
      final userId = regRes['userId'] as int;

      // Assign Teacher Role (Role ID 2)
      assignRoleToUser(db, userId: userId, roleId: teacherRoleId, adminUsername: 'superadmin', adminPassword: 'adminpass');
      final userRoles = getUserRoles(db, userId);
      expect(userRoles, contains('Teacher'));

      // Assign Parent Role (Role ID 4)
      assignRoleToUser(db, userId: userId, roleId: parentRoleId, adminUsername: 'superadmin', adminPassword: 'adminpass');
      final updatedRoles = getUserRoles(db, userId);
      expect(updatedRoles, contains('Teacher'));
      expect(updatedRoles, contains('Parent'));
    });

    test('Test 1.3: Direct Custom Permissions', () {
      final regRes = registerUser(
        db,
        'perm_test_user',
        'password123',
        adminUsername: 'superadmin',
        adminPassword: 'adminpass',
      );
      expect(regRes['success'], isTrue);
      final userId = regRes['userId'] as int;

      // Initially user does not have manage:users permission
      expect(checkUserPermission(db, userId, 'manage:users'), isFalse);

      // Grant direct permission ID 2 (manage:users)
      assignDirectPermissionToUser(db, userId: userId, permissionId: 2, adminUsername: 'superadmin', adminPassword: 'adminpass');

      // Verify direct permission now evaluates to true
      expect(checkUserPermission(db, userId, 'manage:users'), isTrue);
    });

    test('Test 1.4: Login and JWT Token Lifecycle', () {
      final session = loginUser(db, 'superadmin', 'adminpass');
      expect(session, isNotNull);

      final token = generateAuthToken(session!);
      expect(token, isNotEmpty);

      // Verify token decoding
      final verifiedSession = verifyAuthToken(token);
      expect(verifiedSession, isNotNull);
      expect(verifiedSession!.username, equals('superadmin'));
      expect(verifiedSession.roles, contains('Super Admin'));
    });
  });
}
