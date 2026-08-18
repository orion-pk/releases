import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:sqlite3/sqlite3.dart';
import 'database.dart';

String _jwtSecretOverride = '';

/// Set an explicit JWT secret for unit testing.
void setJwtSecretForTesting(String secret) {
  _jwtSecretOverride = secret;
}

const String _defaultProductionJwtSecret = 'ACADEMY_SECURE_JWT_SECRET_KEY_PROD_2026_DEFAULT_FALLBACK_KEY_32_BYTES';

/// Dynamically resolves the JWT secret key from ACADEMY_JWT_SECRET environment variable,
/// falling back to a secure production default key if not provided in the environment.
String get _jwtSecret {
  if (_jwtSecretOverride.isNotEmpty) {
    return _jwtSecretOverride;
  }
  final envSecret = Platform.environment['ACADEMY_JWT_SECRET']?.trim();
  if (envSecret != null && envSecret.length >= 32) {
    return envSecret;
  }
  return _defaultProductionJwtSecret;
}

class SecurityException implements Exception {
  final String message;
  SecurityException(this.message);
  @override
  String toString() => message;
}

/// Represents an active logged-in user session with JWT authentication token.
class UserSession {
  final int userId;
  final String username;
  final List<String> roles;
  final String? authToken;

  UserSession({
    required this.userId,
    required this.username,
    required this.roles,
    this.authToken,
  });

  bool get isSuperAdmin => roles.contains('Super Admin') || roles.contains('Admin');
  bool get isParent => roles.contains('Parent');
}

String base64UrlEncodeNoPadding(List<int> bytes) {
  return base64Url.encode(bytes).replaceAll('=', '');
}

List<int> base64UrlDecodeNoPadding(String input) {
  String normalized = input.replaceAll('-', '+').replaceAll('_', '/');
  switch (normalized.length % 4) {
    case 2:
      normalized += '==';
      break;
    case 3:
      normalized += '=';
      break;
  }
  return base64.decode(normalized);
}

/// Generates a standard HS256 JWT Token for a user session.
String generateAuthToken(UserSession session) {
  final header = {
    'alg': 'HS256',
    'typ': 'JWT',
  };

  final payload = {
    'sub': session.userId.toString(),
    'username': session.username,
    'roles': session.roles,
    'iat': DateTime.now().millisecondsSinceEpoch ~/ 1000,
    'exp': (DateTime.now().millisecondsSinceEpoch ~/ 1000) + (86400 * 7), // 7-day session
  };

  final encodedHeader = base64UrlEncodeNoPadding(utf8.encode(jsonEncode(header)));
  final encodedPayload = base64UrlEncodeNoPadding(utf8.encode(jsonEncode(payload)));

  final signatureInput = '$encodedHeader.$encodedPayload';
  final hmac = Hmac(sha256, utf8.encode(_jwtSecret));
  final signature = hmac.convert(utf8.encode(signatureInput));
  final encodedSignature = base64UrlEncodeNoPadding(signature.bytes);

  return '$signatureInput.$encodedSignature';
}

/// Verifies an HS256 JWT Token and returns a UserSession if valid and user exists in database.
UserSession? verifyAuthToken(String token, [Database? db]) {
  try {
    final parts = token.split('.');
    if (parts.length != 3) return null;

    final signatureInput = '${parts[0]}.${parts[1]}';
    final hmac = Hmac(sha256, utf8.encode(_jwtSecret));
    final expectedSignature = base64UrlEncodeNoPadding(hmac.convert(utf8.encode(signatureInput)).bytes);

    if (parts[2] != expectedSignature) return null;

    final payloadJson = utf8.decode(base64UrlDecodeNoPadding(parts[1]));
    final payload = jsonDecode(payloadJson) as Map<String, dynamic>;

    final exp = payload['exp'] as int?;
    if (exp != null) {
      final nowSec = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      if (nowSec > exp) return null;
    }

    final userId = int.parse(payload['sub'] as String);
    final username = payload['username'] as String;

    if (db != null) {
      final userCheck = db.select('SELECT id FROM users WHERE id = ? AND username = ?', [userId, username]);
      if (userCheck.isEmpty) {
        return null;
      }
      final roles = getUserRoles(db, userId);
      return UserSession(
        userId: userId,
        username: username,
        roles: roles,
        authToken: token,
      );
    }

    final roles = (payload['roles'] as List).map((e) => e.toString()).toList();
    return UserSession(
      userId: userId,
      username: username,
      roles: roles,
      authToken: token,
    );
  } catch (_) {
    return null;
  }
}

/// Authenticate user and return a session object with JWT Token if valid, else null.
UserSession? loginUser(Database db, String username, String password) {
  final results = db.select(
    'SELECT id, username, password_hash FROM users WHERE username = ?;',
    [username],
  );

  if (results.isEmpty) {
    verifyPassword(password, null);
    return null;
  }

  final row = results.first;
  final storedHash = row['password_hash'] as String?;

  if (!verifyPassword(password, storedHash)) {
    return null;
  }

  final userId = row['id'] as int;
  final roles = getUserRoles(db, userId);

  final session = UserSession(
    userId: userId,
    username: username,
    roles: roles,
  );

  final token = generateAuthToken(session);
  return UserSession(
    userId: userId,
    username: username,
    roles: roles,
    authToken: token,
  );
}

/// Get roles assigned to a user ID.
List<String> getUserRoles(Database db, int userId) {
  final results = db.select('''
    SELECT r.role_name 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ?;
  ''', [userId]);

  return results.map((row) => row['role_name'] as String).toList();
}

/// Checks Super Admin or Admin authorization using EITHER a valid JWT Auth Token OR password credentials.
bool isSuperAdminAuthorized(
  Database db, {
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) {
  if (adminToken != null && adminToken.isNotEmpty) {
    final session = verifyAuthToken(adminToken, db);
    if (session != null && session.isSuperAdmin) {
      return true;
    }
  }

  if (adminUsername != null && adminPassword != null) {
    final session = loginUser(db, adminUsername, adminPassword);
    if (session != null && session.isSuperAdmin) {
      return true;
    }
  }

  return false;
}

/// Registers a new user with BCrypt password hashing.
Map<String, Object?> registerUser(
  Database db,
  String username,
  String password, {
  int? roleId,
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
  String? email,
  String? phoneNumber,
  String? status,
  String? cnic,
  String? qualificationGrade,
  String? certifications,
  String? cvFile,
  String? degreeFile,
  String? certificateFile,
  String? accessGrade,
  String? accessSubject,
  String? permissionsJson,
}) {
  if (username.trim().isEmpty || password.trim().isEmpty) {
    return {
      'success': false,
      'error': 'Username and password cannot be empty.',
      'message': 'Username and password cannot be empty.'
    };
  }

  final existingUser = db.select('SELECT id FROM users WHERE username = ?;', [username.trim()]);
  if (existingUser.isNotEmpty) {
    return {
      'success': false,
      'error': 'Username already exists in the system.',
      'message': 'Username already exists in the system.'
    };
  }

  final userCountResult = db.select('SELECT COUNT(*) as count FROM users;');
  final userCount = userCountResult.first['count'] as int;

  if (userCount > 0) {
    if (!isSuperAdminAuthorized(db, adminUsername: adminUsername, adminPassword: adminPassword, adminToken: adminToken)) {
      return {
        'success': false,
        'error': 'Invalid Super Admin credentials or authorization token required to register subsequent accounts.',
        'message': 'Invalid Super Admin credentials or authorization token required to register subsequent accounts.'
      };
    }
  }

  int targetRoleId;
  if (userCount == 0) {
    targetRoleId = superAdminRoleId;
  } else {
    targetRoleId = roleId ?? parentRoleId;
  }

  final roleCheck = db.select('SELECT id FROM roles WHERE id = ?;', [targetRoleId]);
  if (roleCheck.isEmpty) {
    return {
      'success': false,
      'error': 'Invalid or unknown role ID #$targetRoleId.',
      'message': 'Invalid or unknown role ID #$targetRoleId.'
    };
  }

  final hashedPassword = hashPassword(password.trim());

  db.execute(
    'INSERT INTO users (username, password_hash, email, phone_number, status, cnic, qualification_grade, certifications, cv_file, degree_file, certificate_file, access_grade, access_subject, permissions_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
    [
      username.trim(),
      hashedPassword,
      email,
      phoneNumber,
      status ?? 'registered',
      cnic,
      qualificationGrade,
      certifications,
      cvFile,
      degreeFile,
      certificateFile,
      accessGrade,
      accessSubject,
      permissionsJson,
    ],
  );
  final newUserId = db.lastInsertRowId;

  db.execute(
    'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?);',
    [newUserId, targetRoleId],
  );

  return {
    'success': true,
    'message': 'User "$username" registered successfully with Role ID $targetRoleId.',
    'userId': newUserId,
    'roleId': targetRoleId,
  };
}

/// Deletes a user account with Super Admin authorization.
Map<String, Object?> deleteUser(
  Database db,
  int targetUserId, {
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) {
  if (!isSuperAdminAuthorized(db, adminUsername: adminUsername, adminPassword: adminPassword, adminToken: adminToken)) {
    return {'success': false, 'message': 'Super Admin authorization failed.'};
  }

  UserSession? actorSession;
  if (adminToken != null) {
    actorSession = verifyAuthToken(adminToken, db);
  } else if (adminUsername != null && adminPassword != null) {
    actorSession = loginUser(db, adminUsername, adminPassword);
  }

  if (actorSession != null && actorSession.userId == targetUserId) {
    return {'success': false, 'message': 'Super Admin cannot delete their own account while logged in.'};
  }

  final targetRoles = getUserRoles(db, targetUserId);
  if (targetRoles.contains('Super Admin')) {
    final adminCountRes = db.select('''
      SELECT COUNT(DISTINCT user_id) as count 
      FROM user_roles 
      WHERE role_id = ?;
    ''', [superAdminRoleId]);
    final adminCount = adminCountRes.first['count'] as int;

    if (adminCount <= 1) {
      return {'success': false, 'message': 'Cannot delete the last remaining Super Admin account.'};
    }
  }

  db.execute('DELETE FROM users WHERE id = ?;', [targetUserId]);

  return {
    'success': true,
    'message': 'User ID $targetUserId deleted successfully.',
  };
}

/// Updates an existing user with Super Admin authorization.
Map<String, Object?> updateUser(
  Database db,
  int targetUserId, {
  String? username,
  String? password,
  String? email,
  String? phoneNumber,
  String? status,
  int? roleId,
  String? adminToken,
}) {
  if (!isSuperAdminAuthorized(db, adminToken: adminToken)) {
    return {'success': false, 'message': 'Super Admin authorization failed.'};
  }

  final userRes = db.select('SELECT id, username FROM users WHERE id = ?', [targetUserId]);
  if (userRes.isEmpty) {
    return {'success': false, 'message': 'User not found.'};
  }

  if (username != null && username.trim().isNotEmpty) {
    final existing = db.select('SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), targetUserId]);
    if (existing.isNotEmpty) {
      return {'success': false, 'message': 'Username already taken by another user.'};
    }
    db.execute('UPDATE users SET username = ? WHERE id = ?', [username.trim(), targetUserId]);
  }

  if (password != null && password.trim().isNotEmpty) {
    final hashedPassword = hashPassword(password.trim());
    db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, targetUserId]);
  }

  if (email != null) {
    db.execute('UPDATE users SET email = ? WHERE id = ?', [email.trim(), targetUserId]);
  }

  if (phoneNumber != null) {
    db.execute('UPDATE users SET phone_number = ? WHERE id = ?', [phoneNumber.trim(), targetUserId]);
  }

  if (status != null && status.trim().isNotEmpty) {
    db.execute('UPDATE users SET status = ? WHERE id = ?', [status.trim(), targetUserId]);
  }

  if (roleId != null && roleId > 0) {
    db.execute('DELETE FROM user_roles WHERE user_id = ?', [targetUserId]);
    db.execute('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [targetUserId, roleId]);
  }

  return {
    'success': true,
    'message': 'User updated successfully.',
  };
}

/// Check if a user has a specific permission.
bool checkUserPermission(Database db, int userId, String permissionKey) {
  final userRoles = getUserRoles(db, userId);
  if (userRoles.contains('Super Admin')) {
    return true;
  }

  final directPermission = db.select('''
    SELECT p.id 
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = ? AND p.permission_key = ?;
  ''', [userId, permissionKey]);

  if (directPermission.isNotEmpty) {
    return true;
  }

  final rolePermission = db.select('''
    SELECT p.id 
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = ? AND p.permission_key = ?;
  ''', [userId, permissionKey]);

  return rolePermission.isNotEmpty;
}

/// Retrieves all usable permissions grouped by module for a user.
Map<String, List<String>> getUsablePermissionsByModule(Database db, int userId) {
  final userRoles = getUserRoles(db, userId);

  if (userRoles.contains('Super Admin')) {
    final allPerms = db.select('SELECT module, permission_key FROM permissions');
    final Map<String, List<String>> grouped = {};
    for (final row in allPerms) {
      final module = row['module'] as String;
      final key = row['permission_key'] as String;
      grouped.putIfAbsent(module, () => []).add(key);
    }
    return grouped;
  }

  final permissions = db.select('''
    SELECT DISTINCT p.module, p.permission_key
    FROM permissions p
    LEFT JOIN role_permissions rp ON p.id = rp.permission_id
    LEFT JOIN user_roles ur ON rp.role_id = ur.role_id AND ur.user_id = ?
    LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
    WHERE ur.user_id IS NOT NULL OR up.user_id IS NOT NULL;
  ''', [userId, userId]);

  final Map<String, List<String>> grouped = {};
  for (final p in permissions) {
    final module = p['module'] as String;
    final key = p['permission_key'] as String;
    grouped.putIfAbsent(module, () => []).add(key);
  }

  return grouped;
}

/// Retrieves customized "Data for Login" depending on user role.
Map<String, Object?> getLoginDataForUser(Database db, UserSession session) {
  final totalUsers = db.select('SELECT COUNT(*) as count FROM users').first['count'] as int;
  final totalRoles = db.select('SELECT COUNT(*) as count FROM roles').first['count'] as int;
  final totalPermissions = db.select('SELECT COUNT(*) as count FROM permissions').first['count'] as int;

  return <String, Object?>{
    'user': {
      'id': session.userId,
      'username': session.username,
      'roles': session.roles,
      'authToken': session.authToken,
    },
    'systemStats': {
      'totalUsers': totalUsers,
      'totalRoles': totalRoles,
      'totalPermissions': totalPermissions,
    },
    'usablePermissionsByModule': getUsablePermissionsByModule(db, session.userId),
  };
}

/// Grant a role to a user.
void assignRoleToUser(
  Database db, {
  required int userId,
  required int roleId,
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) {
  if (!isSuperAdminAuthorized(db, adminUsername: adminUsername, adminPassword: adminPassword, adminToken: adminToken)) {
    throw SecurityException('Unauthorized role assignment attempt.');
  }
  db.execute(
    'INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?);',
    [userId, roleId],
  );
}

/// Grant a permission to a role.
void assignPermissionToRole(
  Database db, {
  required int roleId,
  required int permissionId,
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) {
  if (!isSuperAdminAuthorized(db, adminUsername: adminUsername, adminPassword: adminPassword, adminToken: adminToken)) {
    throw SecurityException('Unauthorized permission assignment attempt.');
  }
  db.execute(
    'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?);',
    [roleId, permissionId],
  );
}

/// Grant a permission directly to a user.
void assignDirectPermissionToUser(
  Database db, {
  required int userId,
  int? permissionId,
  String? permissionKey,
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) {
  if (!isSuperAdminAuthorized(db, adminUsername: adminUsername, adminPassword: adminPassword, adminToken: adminToken)) {
    throw SecurityException('Unauthorized direct permission assignment attempt.');
  }

  int targetPermId;
  if (permissionId != null) {
    targetPermId = permissionId;
  } else if (permissionKey != null && permissionKey.isNotEmpty) {
    final permRes = db.select('SELECT id FROM permissions WHERE permission_key = ?', [permissionKey]);
    if (permRes.isEmpty) {
      throw Exception('Unknown permissionKey: "$permissionKey".');
    }
    targetPermId = permRes.first['id'] as int;
  } else {
    throw Exception('Either permissionId or permissionKey must be provided.');
  }

  db.execute(
    'INSERT OR IGNORE INTO user_permissions (user_id, permission_id) VALUES (?, ?);',
    [userId, targetPermId],
  );
}

/// Revoke a directly granted permission from a user.
void removeDirectPermissionFromUser(
  Database db, {
  required int userId,
  required int permissionId,
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) {
  if (!isSuperAdminAuthorized(db, adminUsername: adminUsername, adminPassword: adminPassword, adminToken: adminToken)) {
    throw SecurityException('Unauthorized direct permission removal attempt.');
  }
  db.execute(
    'DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?;',
    [userId, permissionId],
  );
}

int? parsePositiveInt(String? value) {
  if (value == null || value.trim().isEmpty) return null;
  final parsed = int.tryParse(value.trim());
  if (parsed == null || parsed <= 0) return null;
  return parsed;
}

String sanitizeErrorMessage(Object error) {
  if (error is SecurityException) {
    return error.message;
  }
  final str = error.toString();
  if (str.startsWith('Exception: ')) {
    final innerMsg = str.substring(11);
    if (innerMsg.contains('constraint failed') || innerMsg.contains('SELECT') || innerMsg.contains('INSERT') || innerMsg.contains('sqlite')) {
      return 'The request could not be completed.';
    }
    return innerMsg;
  }
  return 'The request could not be completed.';
}
