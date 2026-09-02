import 'package:test/test.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';
import '../support/test_helper.dart';

void main() {
  group('Super Admin Suite [integration_test/superadmin]', () {
    late IntegrationTestHelper helper;

    setUp(() {
      helper = IntegrationTestHelper.setup();
    });

    tearDown(() {
      helper.teardown();
    });

    test('Super Admin Initialization, User Management & Permissions', () {
      final regRes = registerUser(helper.db, 'superadmin', 'adminpass');
      expect(regRes['success'], isTrue);

      final session = loginUser(helper.db, 'superadmin', 'adminpass')!;
      expect(session.isSuperAdmin, isTrue);

      final parentRes = registerUser(helper.db, 'parent_user', 'pass123', roleId: parentRoleId, adminToken: session.authToken);
      expect(parentRes['success'], isTrue);

      final parentId = parentRes['userId'] as int;
      expect(getUserRoles(helper.db, parentId), contains('Parent'));

      final stats = getLoginDataForUser(helper.db, session)['systemStats'] as Map<String, Object?>;
      expect(stats['totalUsers'], equals(2));
    });

    test('Super Admin User Deletion Safety', () {
      registerUser(helper.db, 'superadmin', 'adminpass');
      final session = loginUser(helper.db, 'superadmin', 'adminpass')!;

      final parentRes = registerUser(helper.db, 'parent_tom', 'pass123', roleId: parentRoleId, adminToken: session.authToken);
      final parentId = parentRes['userId'] as int;

      final deleteRes = deleteUser(helper.db, parentId, adminToken: session.authToken);
      expect(deleteRes['success'], isTrue);

      final countRes = helper.db.select('SELECT COUNT(*) as count FROM users WHERE id = ?', [parentId]);
      expect(countRes.first['count'], equals(0));
    });
  });
}
