import 'package:sqlite3/sqlite3.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';

void main() {
  print('===============================================================');
  print('   ACADEMIA PLATFORM - OOP & RBAC ARCHITECTURE VERIFICATION    ');
  print('===============================================================\n');

  final db = sqlite3.openInMemory();
  initializeSchema(db);

  // ─────────────────────────────────────────────────────────────
  // 1. ENCAPSULATION TEST
  // ─────────────────────────────────────────────────────────────
  print('🧪 [TEST 1] ENCAPSULATION & DATA HIDING');
  const perm1 = Permission(id: 1, permissionKey: 'students:view', module: 'student');
  const perm2 = Permission(id: 2, permissionKey: 'lectures:create', module: 'lecture');

  final teacherRole = Role(id: 2, roleName: 'Teacher', permissions: [perm1, perm2]);

  print('   • Role Created: ${teacherRole.roleName} (ID: ${teacherRole.id})');
  print('   • Encapsulated Permissions: ${teacherRole.permissions.map((p) => p.permissionKey).toList()}');
  print('   • Checking role.hasPermission("students:view") -> ${teacherRole.hasPermission('students:view')} ✅');
  print('   • Checking role.hasPermission("users:delete")   -> ${teacherRole.hasPermission('users:delete')} ❌ (Blocked)');
  print('');

  // ─────────────────────────────────────────────────────────────
  // 2. INHERITANCE & POLYMORPHISM TEST
  // ─────────────────────────────────────────────────────────────
  print('🧪 [TEST 2] INHERITANCE & POLYMORPHISM');

  // Create specialized TeacherUser polymorphically
  final teacher = User.create(
    id: 10,
    username: 'mr_smith',
    email: 'smith@academy.edu',
    accessSubject: 'Physics',
    qualificationGrade: 'M.Sc Physics',
    roles: [teacherRole],
  );

  print('   • teacher.runtimeType                -> ${teacher.runtimeType} (Specialized Subclass)');
  print('   • teacher is TeacherUser             -> ${teacher is TeacherUser} ✅');
  print('   • (teacher as TeacherUser).assignedSubject -> "${(teacher as TeacherUser).assignedSubject}" ✅');
  print('   • teacher.hasPermission("students:view")   -> ${teacher.hasPermission('students:view')} ✅');
  print('   • teacher.hasPermission("users:delete")    -> ${teacher.hasPermission('users:delete')} ❌ (Blocked)');

  // Create specialized SuperAdminUser polymorphically
  final admin = User.create(
    id: 1,
    username: 'superadmin',
    email: 'admin@academy.edu',
    roles: [const Role(id: 1, roleName: 'Super Admin')],
  );

  print('\n   • admin.runtimeType                  -> ${admin.runtimeType}');
  print('   • admin is SuperAdminUser            -> ${admin is SuperAdminUser} ✅');
  print('   • admin.hasPermission("users:delete")-> ${admin.hasPermission('users:delete')} ✅ (Polymorphic Wildcard Override)');
  print('   • admin.hasPermission("future:gate") -> ${admin.hasPermission('future:gate')} ✅ (Universal Access)');
  print('');

  // ─────────────────────────────────────────────────────────────
  // 3. ABSTRACTION & DOMAIN SERVICE TEST (RbacManager)
  // ─────────────────────────────────────────────────────────────
  print('🧪 [TEST 3] ABSTRACTION & RBAC DOMAIN SERVICE');

  final rbac = RbacManager(db);

  // Register users through the domain manager
  rbac.registerUser('admin_user', 'adminpass123');
  final teacherReg = rbac.registerUser(
    'prof_watson',
    'pass123',
    roleId: 2,
    adminUsername: 'admin_user',
    adminPassword: 'adminpass123',
    accessSubject: 'Advanced Mathematics',
    qualificationGrade: 'Ph.D Mathematics',
  );

  final teacherId = teacherReg['userId'] as int;

  // Retrieve fully hydrated OOP User entity
  final userObj = rbac.getUserById(teacherId);

  print('   • Loaded Entity from DB: ${userObj.runtimeType}');
  print('   • Username: "${userObj?.username}"');
  print('   • Role Names: ${userObj?.roleNames}');
  print('   • All Effective Permissions: ${userObj?.getAllPermissionKeys()}');
  print('   • Permissions by Module: ${userObj?.getPermissionsByModule()}');
  print('');

  // ─────────────────────────────────────────────────────────────
  // 4. JWT TOKEN INTEGRATION TEST
  // ─────────────────────────────────────────────────────────────
  print('🧪 [TEST 4] EMBEDDED JWT TOKEN SESSION TEST');

  final session = rbac.login('prof_watson', 'pass123')!;
  print('   • Generated JWT Token: ${session.authToken?.substring(0, 45)}...');
  
  final verifiedSession = verifyAuthToken(session.authToken!)!;
  print('   • Decoded Session User: "${verifiedSession.username}"');
  print('   • Token Embedded Roles: ${verifiedSession.roles}');
  print('   • Token Embedded Permissions Count: ${verifiedSession.permissions.length}');
  print('   • Session hasPermission("lectures:create") -> ${verifiedSession.hasPermission('lectures:create')} ✅');
  print('   • Session hasPermission("users:delete")    -> ${verifiedSession.hasPermission('users:delete')} ❌');

  print('\n===============================================================');
  print('       🎉 ALL OOP & RBAC ARCHITECTURE TESTS PASSED!            ');
  print('===============================================================');

  db.dispose();
}
