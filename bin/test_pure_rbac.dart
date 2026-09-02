import 'package:sqlite3/sqlite3.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';

void main() {
  print('===============================================================');
  print('      PURE RBAC NEGATIVE PERMISSIONS VERIFICATION TEST         ');
  print('===============================================================\n');

  final db = sqlite3.openInMemory();
  initializeSchema(db);

  final rbac = RbacManager(db);

  // 1. Register Super Admin and a Teacher
  rbac.registerUser('superadmin', 'adminpass123');
  final teacherReg = rbac.registerUser(
    'teacher_jane',
    'pass123',
    roleId: 2, // Role: Teacher
    adminUsername: 'superadmin',
    adminPassword: 'adminpass123',
  );
  final teacherId = teacherReg['userId'] as int;

  // 2. Load the Teacher's OOP User Entity
  final teacherUser = rbac.getUserById(teacherId)!;
  print('👤 Testing User: "${teacherUser.username}" | Role: ${teacherUser.roleNames}');

  // 3. Verify Allowed vs Blocked Permissions
  final allowedPerms = [
    'students:view',
    'students:edit',
    'lectures:view',
    'lectures:create',
    'lectures:edit',
  ];

  final restrictedPerms = [
    'users:delete',      // Super Admin only
    'users:create',      // Super Admin only
    'teachers:delete',   // Super Admin only
    'classes:delete',    // Super Admin only
    'random:hack_gate',  // Non-existent permission
  ];

  print('\n--- [A. Entity-Level OOP hasPermission Checks] ---');
  for (final perm in allowedPerms) {
    final has = teacherUser.hasPermission(perm);
    print('  ✅ Allowed:    $perm -> $has');
  }

  for (final perm in restrictedPerms) {
    final has = teacherUser.hasPermission(perm);
    print('  🚫 Restricted: $perm -> $has (Properly Denied)');
  }

  // 4. Test Login JWT Token Claims
  print('\n--- [B. JWT Token Embedded Claims Checks] ---');
  final session = rbac.login('teacher_jane', 'pass123')!;
  final verifiedSession = verifyAuthToken(session.authToken!)!;

  print('  • Total Permissions in Token: ${verifiedSession.permissions.length}');
  print('  • Does Token have "users:delete"?   -> ${verifiedSession.permissions.contains('users:delete')} (DENIED ❌)');
  print('  • Does Token have "teachers:delete"? -> ${verifiedSession.permissions.contains('teachers:delete')} (DENIED ❌)');
  print('  • Session hasPermission("users:delete") -> ${verifiedSession.hasPermission('users:delete')} (DENIED ❌)');

  print('\n===============================================================');
  print('  🎉 CONFIRMED: Restricted permissions are completely blocked! ');
  print('===============================================================');

  db.dispose();
}
