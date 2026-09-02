import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:sqlite3/sqlite3.dart';
import 'database.dart';

// =============================================================================
// 1. OOP PRINCIPLE: ENCAPSULATION & DATA HIDING
// =============================================================================

/// Custom domain exception for security and authorization failures.
/// [OOP Principle: Encapsulation] - Encapsulates security failure details.
class SecurityException implements Exception {
  final String message;
  SecurityException(this.message);

  @override
  String toString() => message;
}

/// Represents a granular system permission entity.
/// [OOP Principle: Encapsulation] - Encapsulates permission state and serialization.
class Permission {
  final int? id;
  final String permissionKey;
  final String module;
  final String? description;

  const Permission({
    this.id,
    required this.permissionKey,
    required this.module,
    this.description,
  });

  factory Permission.fromRow(Map<String, dynamic> row) {
    return Permission(
      id: row['id'] as int?,
      permissionKey: (row['permission_key'] ?? row['name'] ?? '') as String,
      module: (row['module'] ?? 'general') as String,
      description: row['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    if (id != null) 'id': id,
    'permission_key': permissionKey,
    'module': module,
    if (description != null) 'description': description,
  };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Permission &&
          runtimeType == other.runtimeType &&
          permissionKey == other.permissionKey;

  @override
  int get hashCode => permissionKey.hashCode;

  @override
  String toString() => 'Permission($permissionKey, module: $module)';
}

/// Represents a security Role entity encapsulating assigned permissions.
/// [OOP Principle: Encapsulation] - Encapsulates role state and provides permission querying methods.
class Role {
  final int id;
  final String roleName;
  final String? description;
  final List<Permission> permissions;

  const Role({
    required this.id,
    required this.roleName,
    this.description,
    this.permissions = const [],
  });

  bool hasPermission(String permKey) {
    return permissions.any((p) => p.permissionKey == permKey);
  }

  factory Role.fromRow(Map<String, dynamic> row, [List<Permission> permissions = const []]) {
    return Role(
      id: row['id'] as int,
      roleName: row['role_name'] as String,
      description: row['description'] as String?,
      permissions: permissions,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'roleName': roleName,
    if (description != null) 'description': description,
    'permissions': permissions.map((p) => p.toJson()).toList(),
  };

  @override
  String toString() => 'Role($roleName, id: $id)';
}

// =============================================================================
// 2. OOP PRINCIPLES: INHERITANCE, POLYMORPHISM & FACTORY METHOD
// =============================================================================

/// Base domain entity representing a system User.
/// [OOP Principle: Encapsulation & Inheritance Base]
class User {
  final int id;
  final String username;
  final String? email;
  final String? phoneNumber;
  final String? status;
  final String? cnic;
  final String? qualificationGrade;
  final String? certifications;
  final String? cvFile;
  final String? degreeFile;
  final String? certificateFile;
  final String? accessGrade;
  final String? accessSubject;
  final String? permissionsJson;
  final List<Role> roles;
  final List<Permission> directPermissions;

  User({
    required this.id,
    required this.username,
    this.email,
    this.phoneNumber,
    this.status,
    this.cnic,
    this.qualificationGrade,
    this.certifications,
    this.cvFile,
    this.degreeFile,
    this.certificateFile,
    this.accessGrade,
    this.accessSubject,
    this.permissionsJson,
    this.roles = const [],
    this.directPermissions = const [],
  });

  List<String> get roleNames => roles.map((r) => r.roleName).toList();
  bool get isSuperAdmin => roleNames.contains('Super Admin') || roleNames.contains('Admin');
  bool get isTeacher => roleNames.contains('Teacher');
  bool get isStudent => roleNames.contains('Student');
  bool get isParent => roleNames.contains('Parent');

  /// [OOP Principle: Polymorphism] - Virtual method dynamically overridable in subclasses.
  bool hasPermission(String permissionKey) {
    if (isSuperAdmin) return true;
    if (directPermissions.any((p) => p.permissionKey == permissionKey)) return true;
    return roles.any((r) => r.hasPermission(permissionKey));
  }

  /// Collects all effective unique permission keys for this user.
  List<String> getAllPermissionKeys() {
    final Set<String> keys = {};
    for (final role in roles) {
      for (final perm in role.permissions) {
        keys.add(perm.permissionKey);
      }
    }
    for (final perm in directPermissions) {
      keys.add(perm.permissionKey);
    }
    return keys.toList()..sort();
  }

  /// Groups effective permissions by module.
  Map<String, List<String>> getPermissionsByModule() {
    final Map<String, List<String>> grouped = {};
    for (final role in roles) {
      for (final perm in role.permissions) {
        grouped.putIfAbsent(perm.module, () => []).add(perm.permissionKey);
      }
    }
    for (final perm in directPermissions) {
      grouped.putIfAbsent(perm.module, () => []).add(perm.permissionKey);
    }
    return grouped;
  }

  /// [OOP Design Pattern: Factory Method] - Polymorphic creation of specialized subclasses.
  factory User.create({
    required int id,
    required String username,
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
    List<Role> roles = const [],
    List<Permission> directPermissions = const [],
  }) {
    final roleNames = roles.map((r) => r.roleName).toList();
    if (roleNames.contains('Super Admin') || roleNames.contains('Admin')) {
      return SuperAdminUser(
        id: id,
        username: username,
        email: email,
        phoneNumber: phoneNumber,
        status: status,
        cnic: cnic,
        qualificationGrade: qualificationGrade,
        certifications: certifications,
        cvFile: cvFile,
        degreeFile: degreeFile,
        certificateFile: certificateFile,
        accessGrade: accessGrade,
        accessSubject: accessSubject,
        permissionsJson: permissionsJson,
        roles: roles,
        directPermissions: directPermissions,
      );
    } else if (roleNames.contains('Teacher')) {
      return TeacherUser(
        id: id,
        username: username,
        email: email,
        phoneNumber: phoneNumber,
        status: status,
        cnic: cnic,
        qualificationGrade: qualificationGrade,
        certifications: certifications,
        cvFile: cvFile,
        degreeFile: degreeFile,
        certificateFile: certificateFile,
        accessGrade: accessGrade,
        accessSubject: accessSubject,
        permissionsJson: permissionsJson,
        roles: roles,
        directPermissions: directPermissions,
      );
    } else if (roleNames.contains('Student')) {
      return StudentUser(
        id: id,
        username: username,
        email: email,
        phoneNumber: phoneNumber,
        status: status,
        cnic: cnic,
        qualificationGrade: qualificationGrade,
        certifications: certifications,
        cvFile: cvFile,
        degreeFile: degreeFile,
        certificateFile: certificateFile,
        accessGrade: accessGrade,
        accessSubject: accessSubject,
        permissionsJson: permissionsJson,
        roles: roles,
        directPermissions: directPermissions,
      );
    } else if (roleNames.contains('Parent')) {
      return ParentUser(
        id: id,
        username: username,
        email: email,
        phoneNumber: phoneNumber,
        status: status,
        cnic: cnic,
        qualificationGrade: qualificationGrade,
        certifications: certifications,
        cvFile: cvFile,
        degreeFile: degreeFile,
        certificateFile: certificateFile,
        accessGrade: accessGrade,
        accessSubject: accessSubject,
        permissionsJson: permissionsJson,
        roles: roles,
        directPermissions: directPermissions,
      );
    }

    return User(
      id: id,
      username: username,
      email: email,
      phoneNumber: phoneNumber,
      status: status,
      cnic: cnic,
      qualificationGrade: qualificationGrade,
      certifications: certifications,
      cvFile: cvFile,
      degreeFile: degreeFile,
      certificateFile: certificateFile,
      accessGrade: accessGrade,
      accessSubject: accessSubject,
      permissionsJson: permissionsJson,
      roles: roles,
      directPermissions: directPermissions,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'username': username,
    'email': email,
    'phoneNumber': phoneNumber,
    'status': status,
    'cnic': cnic,
    'qualificationGrade': qualificationGrade,
    'certifications': certifications,
    'accessGrade': accessGrade,
    'accessSubject': accessSubject,
    'roles': roleNames,
  };
}

/// [OOP Principle: Inheritance & Polymorphism] - Specialized Super Admin user entity.
class SuperAdminUser extends User {
  SuperAdminUser({
    required super.id,
    required super.username,
    super.email,
    super.phoneNumber,
    super.status,
    super.cnic,
    super.qualificationGrade,
    super.certifications,
    super.cvFile,
    super.degreeFile,
    super.certificateFile,
    super.accessGrade,
    super.accessSubject,
    super.permissionsJson,
    super.roles,
    super.directPermissions,
  });

  /// [OOP Principle: Polymorphism] - Overrides permission check with universal wildcard access.
  @override
  bool hasPermission(String permissionKey) => true;
}

/// [OOP Principle: Inheritance] - Specialized Teacher user entity.
class TeacherUser extends User {
  TeacherUser({
    required super.id,
    required super.username,
    super.email,
    super.phoneNumber,
    super.status,
    super.cnic,
    super.qualificationGrade,
    super.certifications,
    super.cvFile,
    super.degreeFile,
    super.certificateFile,
    super.accessGrade,
    super.accessSubject,
    super.permissionsJson,
    super.roles,
    super.directPermissions,
  });

  String? get assignedSubject => accessSubject;
  String? get academicQualification => qualificationGrade;
}

/// [OOP Principle: Inheritance] - Specialized Student user entity.
class StudentUser extends User {
  StudentUser({
    required super.id,
    required super.username,
    super.email,
    super.phoneNumber,
    super.status,
    super.cnic,
    super.qualificationGrade,
    super.certifications,
    super.cvFile,
    super.degreeFile,
    super.certificateFile,
    super.accessGrade,
    super.accessSubject,
    super.permissionsJson,
    super.roles,
    super.directPermissions,
  });

  String? get gradeLevel => accessGrade;
}

/// [OOP Principle: Inheritance] - Specialized Parent user entity.
class ParentUser extends User {
  ParentUser({
    required super.id,
    required super.username,
    super.email,
    super.phoneNumber,
    super.status,
    super.cnic,
    super.qualificationGrade,
    super.certifications,
    super.cvFile,
    super.degreeFile,
    super.certificateFile,
    super.accessGrade,
    super.accessSubject,
    super.permissionsJson,
    super.roles,
    super.directPermissions,
  });
}

/// Represents an active authenticated user session with embedded permissions and JWT token.
/// [OOP Principle: Encapsulation]
class UserSession {
  final int userId;
  final String username;
  final List<String> roles;
  final List<String> permissions;
  final Map<String, dynamic>? scope;
  final String? authToken;

  UserSession({
    required this.userId,
    required this.username,
    required this.roles,
    this.permissions = const [],
    this.scope,
    this.authToken,
  });

  bool get isSuperAdmin => roles.contains('Super Admin') || roles.contains('Admin');
  bool get isParent => roles.contains('Parent');
  bool get isTeacher => roles.contains('Teacher');
  bool get isStudent => roles.contains('Student');

  /// Direct session-based permission gate (O(1) lookup)
  bool hasPermission(String permKey) {
    if (isSuperAdmin) return true;
    return permissions.contains(permKey);
  }

  Map<String, dynamic> toMap() => {
    'userId': userId,
    'username': username,
    'roles': roles,
    'permissions': permissions,
    if (scope != null) 'scope': scope,
    if (authToken != null) 'authToken': authToken,
  };
}

// =============================================================================
// 3. OOP DESIGN PATTERN: DATA TRANSFER OBJECTS (DTOs)
// =============================================================================

/// Encapsulates user registration request parameters.
/// [OOP Pattern: Parameter Object / DTO]
class UserRegistrationDto {
  final String username;
  final String password;
  final int? roleId;
  final String? adminUsername;
  final String? adminPassword;
  final String? adminToken;
  final String? email;
  final String? phoneNumber;
  final String? status;
  final String? cnic;
  final String? qualificationGrade;
  final String? certifications;
  final String? cvFile;
  final String? degreeFile;
  final String? certificateFile;
  final String? accessGrade;
  final String? accessSubject;
  final String? permissionsJson;

  const UserRegistrationDto({
    required this.username,
    required this.password,
    this.roleId,
    this.adminUsername,
    this.adminPassword,
    this.adminToken,
    this.email,
    this.phoneNumber,
    this.status,
    this.cnic,
    this.qualificationGrade,
    this.certifications,
    this.cvFile,
    this.degreeFile,
    this.certificateFile,
    this.accessGrade,
    this.accessSubject,
    this.permissionsJson,
  });
}

/// Encapsulates user profile update request parameters.
/// [OOP Pattern: Parameter Object / DTO]
class UserUpdateDto {
  final int targetUserId;
  final String? username;
  final String? password;
  final String? email;
  final String? phoneNumber;
  final String? status;
  final int? roleId;
  final String? cnic;
  final String? qualificationGrade;
  final String? certifications;
  final String? cvFile;
  final String? degreeFile;
  final String? certificateFile;
  final String? accessGrade;
  final String? accessSubject;
  final String? permissionsJson;
  final String? adminToken;

  const UserUpdateDto({
    required this.targetUserId,
    this.username,
    this.password,
    this.email,
    this.phoneNumber,
    this.status,
    this.roleId,
    this.cnic,
    this.qualificationGrade,
    this.certifications,
    this.cvFile,
    this.degreeFile,
    this.certificateFile,
    this.accessGrade,
    this.accessSubject,
    this.permissionsJson,
    this.adminToken,
  });
}

// =============================================================================
// 4. OOP PRINCIPLE: ABSTRACTION & INTERFACES (SOLID - DIP / ISP)
// =============================================================================

/// Contract for token generation and verification.
/// [OOP Principle: Abstraction & Interface Segregation]
abstract class ITokenService {
  String generateToken(UserSession session);
  UserSession? verifyToken(String token, [IUserRepository? userRepo, IRolePermissionRepository? roleRepo]);
  void setSecretForTesting(String secret);
}

/// Contract for password hashing and verification.
/// [OOP Principle: Abstraction & Strategy Pattern]
abstract class IPasswordHasher {
  String hash(String plainText);
  bool verify(String plainText, String? hashed);
}

/// Contract for user database persistence operations.
/// [OOP Design Pattern: Repository Pattern]
abstract class IUserRepository {
  Map<String, dynamic>? findById(int id);
  Map<String, dynamic>? findByUsername(String username);
  Map<String, dynamic>? findByIdentifier(String identifier);
  int countUsers();
  int createUser(UserRegistrationDto dto, String hashedPassword);
  void updateUser(UserUpdateDto dto, [String? newHashedPassword]);
  void deleteUser(int id);
  int countSuperAdmins();
}

/// Contract for role and permission persistence operations.
/// [OOP Design Pattern: Repository Pattern]
abstract class IRolePermissionRepository {
  bool roleExists(int roleId);
  List<String> getRoleNamesForUser(int userId);
  List<Role> getRolesForUser(int userId);
  List<Permission> getDirectPermissionsForUser(int userId);
  List<String> getEffectivePermissionKeys(int userId);
  Map<String, List<String>> getUsablePermissionsByModule(int userId);
  bool checkUserPermission(int userId, String permissionKey);
  void assignRoleToUser(int userId, int roleId);
  void assignPermissionToRole(int roleId, int permissionId);
  void assignDirectPermissionToUser(int userId, int permissionId);
  void removeDirectPermissionFromUser(int userId, int permissionId);
  int? findPermissionIdByKey(String permissionKey);
  int countRoles();
  int countPermissions();
}

/// Contract for invitation token persistence operations.
/// [OOP Design Pattern: Repository Pattern]
abstract class IInvitationRepository {
  String? getExistingToken(int userId);
  void saveInvitationToken(int userId, String token, String expiresAt);
  Map<String, dynamic>? findTokenDetails(String token);
  void completeActivationTransaction(int userId, String newHash, String token);
}

// =============================================================================
// 5. OOP CONCRETE IMPLEMENTATIONS: REPOSITORIES & SERVICES
// =============================================================================

/// Standard BCrypt password hasher implementation.
/// [OOP Pattern: Concrete Strategy]
class BcryptPasswordHasher implements IPasswordHasher {
  const BcryptPasswordHasher();

  @override
  String hash(String plainText) => hashPassword(plainText);

  @override
  bool verify(String plainText, String? hashed) => verifyPassword(plainText, hashed);
}

/// Encapsulated JWT Token Service with internal secret management.
/// [OOP Principle: Encapsulation & Service Layer]
class JwtTokenService implements ITokenService {
  static const String _defaultProductionJwtSecret =
      'ACADEMY_SECURE_JWT_SECRET_KEY_PROD_2026_DEFAULT_FALLBACK_KEY_32_BYTES';

  String _secretOverride = '';

  @override
  void setSecretForTesting(String secret) {
    _secretOverride = secret;
  }

  String get _secretKey {
    if (_secretOverride.isNotEmpty) {
      return _secretOverride;
    }
    final envSecret = Platform.environment['ACADEMY_JWT_SECRET']?.trim();
    if (envSecret != null && envSecret.length >= 32) {
      return envSecret;
    }
    return _defaultProductionJwtSecret;
  }

  String _base64UrlEncodeNoPadding(List<int> bytes) {
    return base64Url.encode(bytes).replaceAll('=', '');
  }

  List<int> _base64UrlDecodeNoPadding(String input) {
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

  @override
  String generateToken(UserSession session) {
    final header = {'alg': 'HS256', 'typ': 'JWT'};
    final payload = {
      'sub': session.userId.toString(),
      'username': session.username,
      'roles': session.roles,
      'permissions': session.permissions,
      if (session.scope != null) 'scope': session.scope,
      'iat': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      'exp': (DateTime.now().millisecondsSinceEpoch ~/ 1000) + (86400 * 7),
    };

    final encodedHeader = _base64UrlEncodeNoPadding(utf8.encode(jsonEncode(header)));
    final encodedPayload = _base64UrlEncodeNoPadding(utf8.encode(jsonEncode(payload)));
    final signatureInput = '$encodedHeader.$encodedPayload';
    final hmac = Hmac(sha256, utf8.encode(_secretKey));
    final signature = hmac.convert(utf8.encode(signatureInput));
    final encodedSignature = _base64UrlEncodeNoPadding(signature.bytes);

    return '$signatureInput.$encodedSignature';
  }

  @override
  UserSession? verifyToken(
    String token, [
    IUserRepository? userRepo,
    IRolePermissionRepository? roleRepo,
  ]) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;

      final signatureInput = '${parts[0]}.${parts[1]}';
      final hmac = Hmac(sha256, utf8.encode(_secretKey));
      final expectedSignature = _base64UrlEncodeNoPadding(hmac.convert(utf8.encode(signatureInput)).bytes);

      if (parts[2] != expectedSignature) return null;

      final payloadJson = utf8.decode(_base64UrlDecodeNoPadding(parts[1]));
      final payload = jsonDecode(payloadJson) as Map<String, dynamic>;

      final exp = payload['exp'] as int?;
      if (exp != null) {
        final nowSec = DateTime.now().millisecondsSinceEpoch ~/ 1000;
        if (nowSec > exp) return null;
      }

      final userId = int.parse(payload['sub'] as String);
      final username = payload['username'] as String;
      final roles = (payload['roles'] as List? ?? []).map((e) => e.toString()).toList();
      final permissions = (payload['permissions'] as List? ?? []).map((e) => e.toString()).toList();
      final scope = payload['scope'] is Map ? Map<String, dynamic>.from(payload['scope'] as Map) : null;

      if (userRepo != null && roleRepo != null) {
        final userCheck = userRepo.findById(userId);
        if (userCheck == null || userCheck['username'] != username) {
          return null;
        }
        final freshRoles = roleRepo.getRoleNamesForUser(userId);
        final freshPerms = roleRepo.getEffectivePermissionKeys(userId);

        return UserSession(
          userId: userId,
          username: username,
          roles: freshRoles,
          permissions: freshPerms,
          scope: scope,
          authToken: token,
        );
      }

      return UserSession(
        userId: userId,
        username: username,
        roles: roles,
        permissions: permissions,
        scope: scope,
        authToken: token,
      );
    } catch (_) {
      return null;
    }
  }
}

/// SQLite concrete repository for User entities.
/// [OOP Design Pattern: Repository Pattern]
class SqliteUserRepository implements IUserRepository {
  final Database db;
  const SqliteUserRepository(this.db);

  @override
  Map<String, dynamic>? findById(int id) {
    final results = db.select('SELECT * FROM users WHERE id = ?;', [id]);
    return results.isNotEmpty ? results.first : null;
  }

  @override
  Map<String, dynamic>? findByUsername(String username) {
    final results = db.select('SELECT * FROM users WHERE username = ?;', [username.trim()]);
    return results.isNotEmpty ? results.first : null;
  }

  @override
  Map<String, dynamic>? findByIdentifier(String identifier) {
    final clean = identifier.trim();
    final digitsOnly = clean.replaceAll(RegExp(r'\D'), '');
    final parsedId = digitsOnly.isNotEmpty ? int.tryParse(digitsOnly) : null;

    final ResultSet results;
    if (parsedId != null) {
      results = db.select(
        'SELECT * FROM users WHERE username = ? OR id = ? OR ((id * 2345 + 1000) % 90000 + 10000) = ?;',
        [clean, parsedId, parsedId],
      );
    } else {
      results = db.select('SELECT * FROM users WHERE username = ?;', [clean]);
    }
    return results.isNotEmpty ? results.first : null;
  }

  @override
  int countUsers() {
    final results = db.select('SELECT COUNT(*) as count FROM users;');
    return results.first['count'] as int;
  }

  @override
  int countSuperAdmins() {
    final results = db.select(
      'SELECT COUNT(DISTINCT user_id) as count FROM user_roles WHERE role_id = ?;',
      [superAdminRoleId],
    );
    return results.first['count'] as int;
  }

  @override
  int createUser(UserRegistrationDto dto, String hashedPassword) {
    db.execute(
      'INSERT INTO users (username, password_hash, email, phone_number, status, cnic, qualification_grade, certifications, cv_file, degree_file, certificate_file, access_grade, access_subject, permissions_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [
        dto.username.trim(),
        hashedPassword,
        dto.email,
        dto.phoneNumber,
        dto.status,
        dto.cnic,
        dto.qualificationGrade,
        dto.certifications,
        dto.cvFile,
        dto.degreeFile,
        dto.certificateFile,
        dto.accessGrade,
        dto.accessSubject,
        dto.permissionsJson,
      ],
    );
    return db.lastInsertRowId;
  }

  @override
  void updateUser(UserUpdateDto dto, [String? newHashedPassword]) {
    if (dto.username != null && dto.username!.trim().isNotEmpty) {
      db.execute('UPDATE users SET username = ? WHERE id = ?', [dto.username!.trim(), dto.targetUserId]);
    }
    if (newHashedPassword != null) {
      db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHashedPassword, dto.targetUserId]);
    }
    if (dto.email != null) {
      db.execute('UPDATE users SET email = ? WHERE id = ?', [dto.email!.trim(), dto.targetUserId]);
    }
    if (dto.phoneNumber != null) {
      db.execute('UPDATE users SET phone_number = ? WHERE id = ?', [dto.phoneNumber!.trim(), dto.targetUserId]);
    }
    if (dto.status != null && dto.status!.trim().isNotEmpty) {
      db.execute('UPDATE users SET status = ? WHERE id = ?', [dto.status!.trim(), dto.targetUserId]);
    }
    if (dto.cnic != null) {
      db.execute('UPDATE users SET cnic = ? WHERE id = ?', [dto.cnic!.trim(), dto.targetUserId]);
    }
    if (dto.qualificationGrade != null) {
      db.execute('UPDATE users SET qualification_grade = ? WHERE id = ?', [dto.qualificationGrade!.trim(), dto.targetUserId]);
    }
    if (dto.certifications != null) {
      db.execute('UPDATE users SET certifications = ? WHERE id = ?', [dto.certifications!.trim(), dto.targetUserId]);
    }
    if (dto.cvFile != null) {
      db.execute('UPDATE users SET cv_file = ? WHERE id = ?', [dto.cvFile!.trim(), dto.targetUserId]);
    }
    if (dto.degreeFile != null) {
      db.execute('UPDATE users SET degree_file = ? WHERE id = ?', [dto.degreeFile!.trim(), dto.targetUserId]);
    }
    if (dto.certificateFile != null) {
      db.execute('UPDATE users SET certificate_file = ? WHERE id = ?', [dto.certificateFile!.trim(), dto.targetUserId]);
    }
    if (dto.accessGrade != null) {
      db.execute('UPDATE users SET access_grade = ? WHERE id = ?', [dto.accessGrade!.trim(), dto.targetUserId]);
    }
    if (dto.accessSubject != null) {
      db.execute('UPDATE users SET access_subject = ? WHERE id = ?', [dto.accessSubject!.trim(), dto.targetUserId]);
    }
    if (dto.permissionsJson != null) {
      db.execute('UPDATE users SET permissions_json = ? WHERE id = ?', [dto.permissionsJson!.trim(), dto.targetUserId]);
    }
  }

  @override
  void deleteUser(int id) {
    db.execute('DELETE FROM users WHERE id = ?;', [id]);
  }
}

/// SQLite concrete repository for Role and Permission entities.
/// [OOP Design Pattern: Repository Pattern]
class SqliteRolePermissionRepository implements IRolePermissionRepository {
  final Database db;
  const SqliteRolePermissionRepository(this.db);

  @override
  bool roleExists(int roleId) {
    final results = db.select('SELECT id FROM roles WHERE id = ?;', [roleId]);
    return results.isNotEmpty;
  }

  @override
  List<String> getRoleNamesForUser(int userId) {
    final results = db.select('''
      SELECT r.role_name 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?;
    ''', [userId]);
    return results.map((row) => row['role_name'] as String).toList();
  }

  @override
  List<Role> getRolesForUser(int userId) {
    final rolesResults = db.select('''
      SELECT r.id, r.role_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?;
    ''', [userId]);

    final List<Role> rolesList = [];
    for (final rRow in rolesResults) {
      final roleId = rRow['id'] as int;
      final rolePerms = db.select('''
        SELECT p.id, p.permission_key, p.module, p.description
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ?;
      ''', [roleId]);

      final perms = rolePerms.map((p) => Permission.fromRow(p)).toList();
      rolesList.add(Role.fromRow(rRow, perms));
    }
    return rolesList;
  }

  @override
  List<Permission> getDirectPermissionsForUser(int userId) {
    final results = db.select('''
      SELECT p.id, p.permission_key, p.module, p.description
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = ?;
    ''', [userId]);
    return results.map((p) => Permission.fromRow(p)).toList();
  }

  @override
  List<String> getEffectivePermissionKeys(int userId) {
    final userRoles = getRoleNamesForUser(userId);
    if (userRoles.contains('Super Admin')) {
      final allPerms = db.select('SELECT permission_key FROM permissions');
      return allPerms.map((row) => row['permission_key'] as String).toList();
    }

    final permissions = db.select('''
      SELECT DISTINCT p.permission_key
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN user_roles ur ON rp.role_id = ur.role_id AND ur.user_id = ?
      LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
      WHERE ur.user_id IS NOT NULL OR up.user_id IS NOT NULL;
    ''', [userId, userId]);

    return permissions.map((p) => p['permission_key'] as String).toList();
  }

  @override
  Map<String, List<String>> getUsablePermissionsByModule(int userId) {
    final userRoles = getRoleNamesForUser(userId);
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

  @override
  bool checkUserPermission(int userId, String permissionKey) {
    final userRoles = getRoleNamesForUser(userId);
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

  @override
  void assignRoleToUser(int userId, int roleId) {
    db.execute('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?);', [userId, roleId]);
  }

  @override
  void assignPermissionToRole(int roleId, int permissionId) {
    db.execute('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?);', [roleId, permissionId]);
  }

  @override
  void assignDirectPermissionToUser(int userId, int permissionId) {
    db.execute('INSERT OR IGNORE INTO user_permissions (user_id, permission_id) VALUES (?, ?);', [userId, permissionId]);
  }

  @override
  void removeDirectPermissionFromUser(int userId, int permissionId) {
    db.execute('DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?;', [userId, permissionId]);
  }

  @override
  int? findPermissionIdByKey(String permissionKey) {
    final res = db.select('SELECT id FROM permissions WHERE permission_key = ?', [permissionKey]);
    return res.isNotEmpty ? res.first['id'] as int : null;
  }

  @override
  int countRoles() {
    return db.select('SELECT COUNT(*) as count FROM roles').first['count'] as int;
  }

  @override
  int countPermissions() {
    return db.select('SELECT COUNT(*) as count FROM permissions').first['count'] as int;
  }
}

/// SQLite concrete repository for Invitation Tokens.
/// [OOP Design Pattern: Repository Pattern]
class SqliteInvitationRepository implements IInvitationRepository {
  final Database db;
  const SqliteInvitationRepository(this.db);

  @override
  String? getExistingToken(int userId) {
    final existing = db.select(
      'SELECT token FROM invitation_tokens WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId],
    );
    return existing.isNotEmpty ? existing.first['token'] as String : null;
  }

  @override
  void saveInvitationToken(int userId, String token, String expiresAt) {
    db.execute(
      'INSERT INTO invitation_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt],
    );
  }

  @override
  Map<String, dynamic>? findTokenDetails(String token) {
    final stmt = db.prepare('''
      SELECT i.id, i.user_id, i.expires_at, i.is_used, u.username, u.email
      FROM invitation_tokens i
      JOIN users u ON u.id = i.user_id
      WHERE i.token = ?
    ''');
    try {
      final results = stmt.select([token]);
      return results.isNotEmpty ? results.first : null;
    } finally {
      stmt.dispose();
    }
  }

  @override
  void completeActivationTransaction(int userId, String newHash, String token) {
    db.execute('BEGIN TRANSACTION');
    try {
      db.execute("UPDATE users SET password_hash = ?, status = 'registered' WHERE id = ?", [newHash, userId]);
      db.execute("UPDATE invitation_tokens SET is_used = 1 WHERE token = ?", [token]);
      db.execute('COMMIT');
    } catch (e) {
      db.execute('ROLLBACK');
      rethrow;
    }
  }
}

// =============================================================================
// 6. OOP DESIGN PATTERN: SERVICE LAYER (SOLID - SRP)
// =============================================================================

/// Handles user authentication, token issuance, and credential verification.
/// [OOP Design Pattern: Service Layer (SRP)]
class AuthenticationService {
  final IUserRepository userRepo;
  final IRolePermissionRepository roleRepo;
  final ITokenService tokenService;
  final IPasswordHasher passwordHasher;

  const AuthenticationService({
    required this.userRepo,
    required this.roleRepo,
    required this.tokenService,
    required this.passwordHasher,
  });

  UserSession? login(String username, String password) {
    final clean = username.trim();
    final row = userRepo.findByIdentifier(clean);

    if (row == null) {
      passwordHasher.verify(password, null);
      return null;
    }

    final storedHash = row['password_hash'] as String?;
    if (!passwordHasher.verify(password, storedHash)) {
      return null;
    }

    final userId = row['id'] as int;
    final actualUsername = row['username'] as String? ?? clean;
    final roles = roleRepo.getRoleNamesForUser(userId);
    final permissions = roleRepo.getEffectivePermissionKeys(userId);
    final scope = {
      if (row['access_grade'] != null) 'accessGrade': row['access_grade'],
      if (row['access_subject'] != null) 'accessSubject': row['access_subject'],
    };

    final tempSession = UserSession(
      userId: userId,
      username: actualUsername,
      roles: roles,
      permissions: permissions,
      scope: scope.isNotEmpty ? scope : null,
    );

    final token = tokenService.generateToken(tempSession);
    return UserSession(
      userId: userId,
      username: actualUsername,
      roles: roles,
      permissions: permissions,
      scope: scope.isNotEmpty ? scope : null,
      authToken: token,
    );
  }

  bool isSuperAdminAuthorized({
    String? adminUsername,
    String? adminPassword,
    String? adminToken,
  }) {
    if (adminToken != null && adminToken.isNotEmpty) {
      final session = tokenService.verifyToken(adminToken, userRepo, roleRepo);
      if (session != null && session.isSuperAdmin) {
        return true;
      }
    }

    if (adminUsername != null && adminPassword != null) {
      final session = login(adminUsername, adminPassword);
      if (session != null && session.isSuperAdmin) {
        return true;
      }
    }

    return false;
  }
}

/// Handles user lifecycle management: registration, update, deletion, and hydration.
/// [OOP Design Pattern: Service Layer (SRP)]
class UserManagementService {
  final IUserRepository userRepo;
  final IRolePermissionRepository roleRepo;
  final AuthenticationService authService;
  final IPasswordHasher passwordHasher;

  const UserManagementService({
    required this.userRepo,
    required this.roleRepo,
    required this.authService,
    required this.passwordHasher,
  });

  User? getUserById(int userId) {
    final row = userRepo.findById(userId);
    if (row == null) return null;

    final roles = roleRepo.getRolesForUser(userId);
    final directPerms = roleRepo.getDirectPermissionsForUser(userId);

    return User.create(
      id: row['id'] as int,
      username: row['username'] as String,
      email: row['email'] as String?,
      phoneNumber: row['phone_number'] as String?,
      status: row['status'] as String?,
      cnic: row['cnic'] as String?,
      qualificationGrade: row['qualification_grade'] as String?,
      certifications: row['certifications'] as String?,
      cvFile: row['cv_file'] as String?,
      degreeFile: row['degree_file'] as String?,
      certificateFile: row['certificate_file'] as String?,
      accessGrade: row['access_grade'] as String?,
      accessSubject: row['access_subject'] as String?,
      permissionsJson: row['permissions_json'] as String?,
      roles: roles,
      directPermissions: directPerms,
    );
  }

  Map<String, Object?> registerUser(UserRegistrationDto dto) {
    if (dto.username.trim().isEmpty || dto.password.trim().isEmpty) {
      return {
        'success': false,
        'error': 'Username and password cannot be empty.',
        'message': 'Username and password cannot be empty.',
      };
    }

    final existing = userRepo.findByUsername(dto.username.trim());
    if (existing != null) {
      return {
        'success': false,
        'error': 'Username already exists in the system.',
        'message': 'Username already exists in the system.',
      };
    }

    final userCount = userRepo.countUsers();
    if (userCount > 0) {
      if (!authService.isSuperAdminAuthorized(
        adminUsername: dto.adminUsername,
        adminPassword: dto.adminPassword,
        adminToken: dto.adminToken,
      )) {
        return {
          'success': false,
          'error': 'Invalid Super Admin credentials or authorization token required to register subsequent accounts.',
          'message': 'Invalid Super Admin credentials or authorization token required to register subsequent accounts.',
        };
      }
    }

    final int targetRoleId = (userCount == 0) ? superAdminRoleId : (dto.roleId ?? parentRoleId);
    if (!roleRepo.roleExists(targetRoleId)) {
      return {
        'success': false,
        'error': 'Invalid or unknown role ID #$targetRoleId.',
        'message': 'Invalid or unknown role ID #$targetRoleId.',
      };
    }

    final hashedPassword = passwordHasher.hash(dto.password.trim());
    final effectiveStatus = dto.status ?? (userCount == 0 ? 'registered' : 'pending_activation');
    final registrationWithStatus = UserRegistrationDto(
      username: dto.username,
      password: dto.password,
      roleId: targetRoleId,
      adminUsername: dto.adminUsername,
      adminPassword: dto.adminPassword,
      adminToken: dto.adminToken,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      status: effectiveStatus,
      cnic: dto.cnic,
      qualificationGrade: dto.qualificationGrade,
      certifications: dto.certifications,
      cvFile: dto.cvFile,
      degreeFile: dto.degreeFile,
      certificateFile: dto.certificateFile,
      accessGrade: dto.accessGrade,
      accessSubject: dto.accessSubject,
      permissionsJson: dto.permissionsJson,
    );

    final newUserId = userRepo.createUser(registrationWithStatus, hashedPassword);
    roleRepo.assignRoleToUser(newUserId, targetRoleId);

    return {
      'success': true,
      'message': 'User "${dto.username}" registered successfully with Role ID $targetRoleId.',
      'userId': newUserId,
      'user': {'id': newUserId, 'username': dto.username.trim()},
      'roleId': targetRoleId,
    };
  }

  static String? accessGradeOrNull(String? val) => val;
  static String? accessSubjectOrNull(String? val) => val;

  Map<String, Object?> deleteUser(
    int targetUserId, {
    String? adminUsername,
    String? adminPassword,
    String? adminToken,
  }) {
    if (!authService.isSuperAdminAuthorized(
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    )) {
      return {'success': false, 'message': 'Super Admin authorization failed.'};
    }

    UserSession? actorSession;
    if (adminToken != null) {
      actorSession = authService.tokenService.verifyToken(adminToken, userRepo, roleRepo);
    } else if (adminUsername != null && adminPassword != null) {
      actorSession = authService.login(adminUsername, adminPassword);
    }

    if (actorSession != null && actorSession.userId == targetUserId) {
      return {'success': false, 'message': 'Super Admin cannot delete their own account while logged in.'};
    }

    final targetRoles = roleRepo.getRoleNamesForUser(targetUserId);
    if (targetRoles.contains('Super Admin')) {
      final adminCount = userRepo.countSuperAdmins();
      if (adminCount <= 1) {
        return {'success': false, 'message': 'Cannot delete the last remaining Super Admin account.'};
      }
    }

    userRepo.deleteUser(targetUserId);
    return {'success': true, 'message': 'User ID $targetUserId deleted successfully.'};
  }

  Map<String, Object?> updateUser(UserUpdateDto dto) {
    if (!authService.isSuperAdminAuthorized(adminToken: dto.adminToken)) {
      return {'success': false, 'message': 'Super Admin authorization failed.'};
    }

    final existing = userRepo.findById(dto.targetUserId);
    if (existing == null) {
      return {'success': false, 'message': 'User not found.'};
    }

    if (dto.username != null && dto.username!.trim().isNotEmpty) {
      final conflict = userRepo.findByUsername(dto.username!.trim());
      if (conflict != null && conflict['id'] != dto.targetUserId) {
        return {'success': false, 'message': 'Username already taken by another user.'};
      }
    }

    String? newHashedPassword;
    if (dto.password != null && dto.password!.trim().isNotEmpty) {
      newHashedPassword = passwordHasher.hash(dto.password!.trim());
    }

    userRepo.updateUser(dto, newHashedPassword);

    if (dto.roleId != null && dto.roleId! > 0) {
      roleRepo.assignRoleToUser(dto.targetUserId, dto.roleId!);
    }

    return {'success': true, 'message': 'User updated successfully.'};
  }
}

/// Handles user activation and onboarding invitation tokens.
/// [OOP Design Pattern: Service Layer (SRP)]
class InvitationService {
  final IInvitationRepository invitationRepo;
  final IRolePermissionRepository roleRepo;
  final ITokenService tokenService;
  final IPasswordHasher passwordHasher;

  const InvitationService({
    required this.invitationRepo,
    required this.roleRepo,
    required this.tokenService,
    required this.passwordHasher,
  });

  String generateInvitationToken(int userId) {
    final existing = invitationRepo.getExistingToken(userId);
    if (existing != null) return existing;

    final nowMicro = DateTime.now().microsecondsSinceEpoch;
    final randomBytes = List<int>.generate(32, (i) => (nowMicro ^ (1 + (userId * 31) + (i * 17))) % 256);
    final token = 'inv_${base64Url.encode(randomBytes).replaceAll('=', '').replaceAll('-', '').replaceAll('_', '').substring(0, 40)}';
    final expiresAt = DateTime.now().add(const Duration(hours: 24)).toIso8601String();

    invitationRepo.saveInvitationToken(userId, token, expiresAt);
    return token;
  }

  Map<String, Object?> verifyInvitationToken(String token) {
    if (token.trim().isEmpty) {
      return {'valid': false, 'error': 'Invitation token is missing.'};
    }
    final details = invitationRepo.findTokenDetails(token);
    if (details == null) {
      return {'valid': false, 'error': 'Invalid or non-existent invitation token.'};
    }

    final isUsed = (details['is_used'] as int? ?? 0) == 1;
    if (isUsed) {
      return {'valid': false, 'error': 'This invitation link has already been used.'};
    }

    final expiresAt = DateTime.parse(details['expires_at'] as String);
    if (DateTime.now().isAfter(expiresAt)) {
      return {'valid': false, 'error': 'This invitation link has expired.'};
    }

    final userId = details['user_id'] as int;
    final username = details['username'] as String;
    final roles = roleRepo.getRoleNamesForUser(userId);

    return {
      'valid': true,
      'userId': userId,
      'username': username,
      'roles': roles,
      'email': details['email'],
    };
  }

  UserSession completeInvitationActivation(String token, String newPassword) {
    if (newPassword.trim().length < 4) {
      throw SecurityException('Password must be at least 4 characters.');
    }
    final verification = verifyInvitationToken(token);
    if (verification['valid'] != true) {
      throw SecurityException(verification['error'] as String? ?? 'Invalid invitation token.');
    }

    final userId = verification['userId'] as int;
    final newHash = passwordHasher.hash(newPassword);
    invitationRepo.completeActivationTransaction(userId, newHash, token);

    final username = verification['username'] as String;
    final roles = List<String>.from(verification['roles'] as List);
    final permissions = roleRepo.getEffectivePermissionKeys(userId);

    final tempSession = UserSession(
      userId: userId,
      username: username,
      roles: roles,
      permissions: permissions,
    );
    final authToken = tokenService.generateToken(tempSession);

    return UserSession(
      userId: userId,
      username: username,
      roles: roles,
      permissions: permissions,
      authToken: authToken,
    );
  }
}

// =============================================================================
// 7. OOP DESIGN PATTERN: FACADE PATTERN (RbacManager)
// =============================================================================

/// Encapsulates RBAC domain logic, user lifecycle, and services into a unified facade.
/// [OOP Design Pattern: Facade Pattern]
class RbacManager {
  final Database db;
  final IUserRepository userRepository;
  final IRolePermissionRepository roleRepository;
  final IInvitationRepository invitationRepository;
  final ITokenService tokenService;
  final IPasswordHasher passwordHasher;
  final AuthenticationService authService;
  final UserManagementService userService;
  final InvitationService invitationService;

  RbacManager._({
    required this.db,
    required this.userRepository,
    required this.roleRepository,
    required this.invitationRepository,
    required this.tokenService,
    required this.passwordHasher,
    required this.authService,
    required this.userService,
    required this.invitationService,
  });

  /// Factory constructor to initialize RbacManager with default repositories and services.
  factory RbacManager(Database db, [ITokenService? customTokenService]) {
    final userRepo = SqliteUserRepository(db);
    final roleRepo = SqliteRolePermissionRepository(db);
    final invRepo = SqliteInvitationRepository(db);
    final tokenSvc = customTokenService ?? _globalJwtTokenService;
    const hasher = BcryptPasswordHasher();

    final authSvc = AuthenticationService(
      userRepo: userRepo,
      roleRepo: roleRepo,
      tokenService: tokenSvc,
      passwordHasher: hasher,
    );

    final userSvc = UserManagementService(
      userRepo: userRepo,
      roleRepo: roleRepo,
      authService: authSvc,
      passwordHasher: hasher,
    );

    final invSvc = InvitationService(
      invitationRepo: invRepo,
      roleRepo: roleRepo,
      tokenService: tokenSvc,
      passwordHasher: hasher,
    );

    return RbacManager._(
      db: db,
      userRepository: userRepo,
      roleRepository: roleRepo,
      invitationRepository: invRepo,
      tokenService: tokenSvc,
      passwordHasher: hasher,
      authService: authSvc,
      userService: userSvc,
      invitationService: invSvc,
    );
  }

  // --- Authentication Facade Methods ---
  UserSession? login(String username, String password) =>
      authService.login(username, password);

  bool isSuperAdminAuthorized({
    String? adminUsername,
    String? adminPassword,
    String? adminToken,
  }) =>
      authService.isSuperAdminAuthorized(
        adminUsername: adminUsername,
        adminPassword: adminPassword,
        adminToken: adminToken,
      );

  // --- User Lifecycle Facade Methods ---
  User? getUserById(int userId) => userService.getUserById(userId);

  Map<String, Object?> registerUser(
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
    return userService.registerUser(
      UserRegistrationDto(
        username: username,
        password: password,
        roleId: roleId,
        adminUsername: adminUsername,
        adminPassword: adminPassword,
        adminToken: adminToken,
        email: email,
        phoneNumber: phoneNumber,
        status: status,
        cnic: cnic,
        qualificationGrade: qualificationGrade,
        certifications: certifications,
        cvFile: cvFile,
        degreeFile: degreeFile,
        certificateFile: certificateFile,
        accessGrade: accessGrade,
        accessSubject: accessSubject,
        permissionsJson: permissionsJson,
      ),
    );
  }

  Map<String, Object?> deleteUser(
    int targetUserId, {
    String? adminUsername,
    String? adminPassword,
    String? adminToken,
  }) =>
      userService.deleteUser(
        targetUserId,
        adminUsername: adminUsername,
        adminPassword: adminPassword,
        adminToken: adminToken,
      );

  Map<String, Object?> updateUser(
    int targetUserId, {
    String? username,
    String? password,
    String? email,
    String? phoneNumber,
    String? status,
    int? roleId,
    String? cnic,
    String? qualificationGrade,
    String? certifications,
    String? cvFile,
    String? degreeFile,
    String? certificateFile,
    String? accessGrade,
    String? accessSubject,
    String? permissionsJson,
    String? adminToken,
  }) =>
      userService.updateUser(
        UserUpdateDto(
          targetUserId: targetUserId,
          username: username,
          password: password,
          email: email,
          phoneNumber: phoneNumber,
          status: status,
          roleId: roleId,
          cnic: cnic,
          qualificationGrade: qualificationGrade,
          certifications: certifications,
          cvFile: cvFile,
          degreeFile: degreeFile,
          certificateFile: certificateFile,
          accessGrade: accessGrade,
          accessSubject: accessSubject,
          permissionsJson: permissionsJson,
          adminToken: adminToken,
        ),
      );

  // --- Role & Permission Facade Methods ---
  List<String> getUserRoles(int userId) => roleRepository.getRoleNamesForUser(userId);

  List<String> getUserPermissionKeys(int userId) =>
      roleRepository.getEffectivePermissionKeys(userId);

  bool checkUserPermission(int userId, String permissionKey) =>
      roleRepository.checkUserPermission(userId, permissionKey);

  Map<String, List<String>> getUsablePermissionsByModule(int userId) =>
      roleRepository.getUsablePermissionsByModule(userId);

  Map<String, Object?> getLoginDataForUser(UserSession session) {
    final totalUsers = userRepository.countUsers();
    final totalRoles = roleRepository.countRoles();
    final totalPermissions = roleRepository.countPermissions();

    final userRow = userRepository.findById(session.userId);
    String? permissionsJson;
    String? accessGrade;
    String? accessSubject;
    if (userRow != null) {
      permissionsJson = userRow['permissions_json'] as String?;
      accessGrade = userRow['access_grade'] as String?;
      accessSubject = userRow['access_subject'] as String?;
    }

    return <String, Object?>{
      'user': {
        'id': session.userId,
        'username': session.username,
        'roles': session.roles,
        'permissions': session.permissions,
        'authToken': session.authToken,
        'permissionsJson': permissionsJson ?? '',
        'accessGrade': accessGrade ?? '',
        'accessSubject': accessSubject ?? '',
      },
      'systemStats': {
        'totalUsers': totalUsers,
        'totalRoles': totalRoles,
        'totalPermissions': totalPermissions,
      },
      'usablePermissionsByModule': getUsablePermissionsByModule(session.userId),
    };
  }

  void assignRoleToUser({
    required int userId,
    required int roleId,
    String? adminUsername,
    String? adminPassword,
    String? adminToken,
  }) {
    if (!isSuperAdminAuthorized(
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    )) {
      throw SecurityException('Unauthorized role assignment attempt.');
    }
    roleRepository.assignRoleToUser(userId, roleId);
  }

  void assignPermissionToRole({
    required int roleId,
    required int permissionId,
    String? adminUsername,
    String? adminPassword,
    String? adminToken,
  }) {
    if (!isSuperAdminAuthorized(
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    )) {
      throw SecurityException('Unauthorized permission assignment attempt.');
    }
    roleRepository.assignPermissionToRole(roleId, permissionId);
  }

  void assignDirectPermissionToUser({
    required int userId,
    int? permissionId,
    String? permissionKey,
    String? adminUsername,
    String? adminPassword,
    String? adminToken,
  }) {
    if (!isSuperAdminAuthorized(
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    )) {
      throw SecurityException('Unauthorized direct permission assignment attempt.');
    }

    int targetPermId;
    if (permissionId != null) {
      targetPermId = permissionId;
    } else if (permissionKey != null && permissionKey.isNotEmpty) {
      final pid = roleRepository.findPermissionIdByKey(permissionKey);
      if (pid == null) {
        throw Exception('Unknown permissionKey: "$permissionKey".');
      }
      targetPermId = pid;
    } else {
      throw Exception('Either permissionId or permissionKey must be provided.');
    }

    roleRepository.assignDirectPermissionToUser(userId, targetPermId);
  }

  void removeDirectPermissionFromUser({
    required int userId,
    required int permissionId,
    String? adminUsername,
    String? adminPassword,
    String? adminToken,
  }) {
    if (!isSuperAdminAuthorized(
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    )) {
      throw SecurityException('Unauthorized direct permission removal attempt.');
    }
    roleRepository.removeDirectPermissionFromUser(userId, permissionId);
  }

  // --- Invitation Token Facade Methods ---
  String generateInvitationToken(int userId) =>
      invitationService.generateInvitationToken(userId);

  Map<String, Object?> verifyInvitationToken(String token) =>
      invitationService.verifyInvitationToken(token);

  UserSession completeInvitationActivation(String token, String newPassword) =>
      invitationService.completeInvitationActivation(token, newPassword);
}

// =============================================================================
// 8. GLOBAL SERVICES & COMPATIBILITY LAYER
// =============================================================================

final JwtTokenService _globalJwtTokenService = JwtTokenService();

/// Set an explicit JWT secret for unit testing.
void setJwtSecretForTesting(String secret) {
  _globalJwtTokenService.setSecretForTesting(secret);
}

/// Generates a standard HS256 JWT Token with embedded user roles and permissions.
String generateAuthToken(UserSession session) =>
    _globalJwtTokenService.generateToken(session);

/// Verifies an HS256 JWT Token and returns a UserSession.
UserSession? verifyAuthToken(String token, [Database? db]) {
  if (db != null) {
    final userRepo = SqliteUserRepository(db);
    final roleRepo = SqliteRolePermissionRepository(db);
    return _globalJwtTokenService.verifyToken(token, userRepo, roleRepo);
  }
  return _globalJwtTokenService.verifyToken(token);
}

// Top-level compatibility facades
UserSession? loginUser(Database db, String username, String password) =>
    RbacManager(db).login(username, password);

List<String> getUserRoles(Database db, int userId) =>
    RbacManager(db).getUserRoles(userId);

bool isSuperAdminAuthorized(
  Database db, {
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) =>
    RbacManager(db).isSuperAdminAuthorized(
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    );

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
}) =>
    RbacManager(db).registerUser(
      username,
      password,
      roleId: roleId,
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
      email: email,
      phoneNumber: phoneNumber,
      status: status,
      cnic: cnic,
      qualificationGrade: qualificationGrade,
      certifications: certifications,
      cvFile: cvFile,
      degreeFile: degreeFile,
      certificateFile: certificateFile,
      accessGrade: accessGrade,
      accessSubject: accessSubject,
      permissionsJson: permissionsJson,
    );

Map<String, Object?> deleteUser(
  Database db,
  int targetUserId, {
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) =>
    RbacManager(db).deleteUser(
      targetUserId,
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    );

Map<String, Object?> updateUser(
  Database db,
  int targetUserId, {
  String? username,
  String? password,
  String? email,
  String? phoneNumber,
  String? status,
  int? roleId,
  String? cnic,
  String? qualificationGrade,
  String? certifications,
  String? cvFile,
  String? degreeFile,
  String? certificateFile,
  String? accessGrade,
  String? accessSubject,
  String? permissionsJson,
  String? adminToken,
}) =>
    RbacManager(db).updateUser(
      targetUserId,
      username: username,
      password: password,
      email: email,
      phoneNumber: phoneNumber,
      status: status,
      roleId: roleId,
      cnic: cnic,
      qualificationGrade: qualificationGrade,
      certifications: certifications,
      cvFile: cvFile,
      degreeFile: degreeFile,
      certificateFile: certificateFile,
      accessGrade: accessGrade,
      accessSubject: accessSubject,
      permissionsJson: permissionsJson,
      adminToken: adminToken,
    );

bool checkUserPermission(Database db, int userId, String permissionKey) =>
    RbacManager(db).checkUserPermission(userId, permissionKey);

Map<String, List<String>> getUsablePermissionsByModule(Database db, int userId) =>
    RbacManager(db).getUsablePermissionsByModule(userId);

Map<String, Object?> getLoginDataForUser(Database db, UserSession session) =>
    RbacManager(db).getLoginDataForUser(session);

void assignRoleToUser(
  Database db, {
  required int userId,
  required int roleId,
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) =>
    RbacManager(db).assignRoleToUser(
      userId: userId,
      roleId: roleId,
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    );

void assignPermissionToRole(
  Database db, {
  required int roleId,
  required int permissionId,
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) =>
    RbacManager(db).assignPermissionToRole(
      roleId: roleId,
      permissionId: permissionId,
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    );

void assignDirectPermissionToUser(
  Database db, {
  required int userId,
  int? permissionId,
  String? permissionKey,
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) =>
    RbacManager(db).assignDirectPermissionToUser(
      userId: userId,
      permissionId: permissionId,
      permissionKey: permissionKey,
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    );

void removeDirectPermissionFromUser(
  Database db, {
  required int userId,
  required int permissionId,
  String? adminUsername,
  String? adminPassword,
  String? adminToken,
}) =>
    RbacManager(db).removeDirectPermissionFromUser(
      userId: userId,
      permissionId: permissionId,
      adminUsername: adminUsername,
      adminPassword: adminPassword,
      adminToken: adminToken,
    );

String generateInvitationToken(Database db, int userId) =>
    RbacManager(db).generateInvitationToken(userId);

Map<String, Object?> verifyInvitationToken(Database db, String token) =>
    RbacManager(db).verifyInvitationToken(token);

UserSession completeInvitationActivation(Database db, String token, String newPassword) =>
    RbacManager(db).completeInvitationActivation(token, newPassword);

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
    if (innerMsg.contains('constraint failed') ||
        innerMsg.contains('SELECT') ||
        innerMsg.contains('INSERT') ||
        innerMsg.contains('sqlite')) {
      return 'The request could not be completed.';
    }
    return innerMsg;
  }
  return 'The request could not be completed.';
}
