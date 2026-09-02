import 'package:test/test.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';
import '../support/test_helper.dart';

void main() {
  group('Parent Suite [integration_test/parent]', () {
    late IntegrationTestHelper helper;

    setUp(() {
      helper = IntegrationTestHelper.setup();

      registerUser(helper.db, 'superadmin', 'adminpass');
      final adminSession = loginUser(helper.db, 'superadmin', 'adminpass')!;

      registerUser(helper.db, 'parent_mark', 'pass123', roleId: parentRoleId, adminToken: adminSession.authToken);
    });

    tearDown(() {
      helper.teardown();
    });

    test('Parent User Login Session & Data Payload', () {
      final parentSession = loginUser(helper.db, 'parent_mark', 'pass123')!;
      expect(parentSession.isParent, isTrue);

      final loginData = getLoginDataForUser(helper.db, parentSession);
      final userObj = loginData['user'] as Map<String, Object?>;
      expect(userObj['username'], equals('parent_mark'));
      expect((userObj['roles'] as List), contains('Parent'));
    });
  });
}
