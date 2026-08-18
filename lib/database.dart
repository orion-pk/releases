import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:bcrypt/bcrypt.dart';
import 'package:sqlite3/sqlite3.dart';

const String dbName = "academy.db";

final String _dummyBcryptHash = BCrypt.hashpw('dummy_password_timing_defense', BCrypt.gensalt(logRounds: 10));

/// Hashes a password using BCrypt with a cost factor of 10 and per-password salt.
String hashPassword(String password) {
  return BCrypt.hashpw(password, BCrypt.gensalt(logRounds: 10));
}

/// Constant-time string equality comparison to prevent timing side-channel attacks.
bool _constantTimeEquals(String a, String b) {
  if (a.length != b.length) return false;
  int result = 0;
  for (int i = 0; i < a.length; i++) {
    result |= a.codeUnitAt(i) ^ b.codeUnitAt(i);
  }
  return result == 0;
}

/// Verifies a plain text password against a stored password hash (BCrypt or legacy unsalted SHA-256).
bool verifyPassword(String password, String? storedHash) {
  if (storedHash == null || storedHash.isEmpty) {
    try {
      BCrypt.checkpw(password, _dummyBcryptHash);
    } catch (_) {}
    return false;
  }

  // Support legacy unsalted SHA-256 for backward compatibility
  if (storedHash.length == 64 && !storedHash.startsWith(r'$2')) {
    final bytes = utf8.encode(password);
    final sha256Hash = sha256.convert(bytes).toString();
    return _constantTimeEquals(sha256Hash, storedHash);
  }

  try {
    return BCrypt.checkpw(password, storedHash);
  } catch (_) {
    return false;
  }
}

/// Returns the absolute resolved file path for the SQLite database.
String getResolvedDbFilePath([String path = dbName]) {
  final envPath = Platform.environment['ACADEMY_DB'];
  if (envPath != null && envPath.trim().isNotEmpty) {
    return File(envPath.trim()).absolute.path;
  }

  final exeDir = File(Platform.resolvedExecutable).parent.path;
  final isProgramFiles = exeDir.toLowerCase().contains('program files');
  final localFile = File(path).absolute;

  // If running locally in development mode (outside Program Files)
  if (!isProgramFiles) {
    if (localFile.existsSync()) {
      return localFile.path;
    }
    final parentDb = File('..${Platform.pathSeparator}$path').absolute;
    if (parentDb.existsSync()) {
      return parentDb.path;
    }
    final exeParentDb = File('${Directory(exeDir).parent.path}${Platform.pathSeparator}$path').absolute;
    if (exeParentDb.existsSync()) {
      return exeParentDb.path;
    }
    if (localFile.path.contains('academia')) {
      return localFile.path;
    }
  }

  // Writable AppData Directory for Windows/Desktop environment
  String appDataDir;
  if (Platform.isWindows) {
    final localAppData = Platform.environment['LOCALAPPDATA'] ?? Platform.environment['APPDATA'];
    if (localAppData != null && localAppData.isNotEmpty) {
      appDataDir = '$localAppData${Platform.pathSeparator}Academia Platform';
    } else {
      appDataDir = '${Platform.environment['USERPROFILE']}${Platform.pathSeparator}.academia';
    }
  } else {
    final home = Platform.environment['HOME'] ?? '.';
    appDataDir = '$home${Platform.pathSeparator}.academia';
  }

  final dir = Directory(appDataDir);
  if (!dir.existsSync()) {
    try {
      dir.createSync(recursive: true);
    } catch (_) {}
  }

  final targetFile = File('${dir.path}${Platform.pathSeparator}$dbName');

  // Auto-migrate existing DB if present in exeDir
  try {
    final oldDbInExeDir = File('$exeDir${Platform.pathSeparator}$dbName');
    if (oldDbInExeDir.existsSync() && !targetFile.existsSync()) {
      oldDbInExeDir.copySync(targetFile.path);
      print('📦 Migrated existing database to user data directory: ${targetFile.path}');
    }
  } catch (_) {}

  return targetFile.path;
}

const int superAdminRoleId = 1;
const String superAdminRoleName = 'Super Admin';

const int teacherRoleId = 2;
const String teacherRoleName = 'Teacher';

const int studentRoleId = 3;
const String studentRoleName = 'Student';

const int parentRoleId = 4;
const String parentRoleName = 'Parent';

/// Connects to SQLite database, resolving absolute paths and creating parent directories if needed.
Database getDbConnection([String path = dbName, bool allowCreate = false]) {
  final absolutePath = getResolvedDbFilePath(path);
  final file = File(absolutePath);
  final autoInit = Platform.environment['ACADEMY_INIT_DB'] == '1';

  // Ensure parent directory exists before opening SQLite database
  final parentDir = file.parent;
  if (!parentDir.existsSync()) {
    try {
      parentDir.createSync(recursive: true);
    } catch (_) {}
  }

  if (!file.existsSync() && !allowCreate && !autoInit) {
    throw StateError(
      'Database file not found at: "$absolutePath". '
      'Refusing to silently create a new empty database. '
      'Set ACADEMY_INIT_DB=1 or create the file explicitly.',
    );
  }

  print('📁 SQLite Database Path Resolved: $absolutePath');
  final conn = sqlite3.open(absolutePath);
  conn.execute('PRAGMA foreign_keys = ON;');
  return conn;
}

/// Initializes database tables and default roles/permissions.
void initializeSchema(Database db) {
  // Enable Foreign Key support in SQLite
  db.execute('PRAGMA foreign_keys = ON;');

  // Create tables
  db.execute('''
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      phone_number TEXT,
      status TEXT DEFAULT 'registered',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  ''');

  // Schema Migrations for existing DBs
  try { db.execute("ALTER TABLE users ADD COLUMN email TEXT;"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN phone_number TEXT;"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'registered';"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN cnic TEXT;"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN qualification_grade TEXT;"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN certifications TEXT;"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN cv_file TEXT;"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN degree_file TEXT;"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN certificate_file TEXT;"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN access_grade TEXT;"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN access_subject TEXT;"); } catch (_) {}
  try { db.execute("ALTER TABLE users ADD COLUMN permissions_json TEXT;"); } catch (_) {}

  db.execute('''
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY,
      role_name TEXT UNIQUE NOT NULL
    );
  ''');

  db.execute('''
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY,
      permission_key TEXT UNIQUE NOT NULL,
      module TEXT NOT NULL,
      sub_module TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT
    );
  ''');

  db.execute('''
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER,
      role_id INTEGER,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
  ''');

  db.execute('''
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER,
      permission_id INTEGER,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );
  ''');

  db.execute('''
    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id INTEGER,
      permission_id INTEGER,
      PRIMARY KEY (user_id, permission_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );
  ''');

  // Insert Default Roles
  db.execute("INSERT OR IGNORE INTO roles (id, role_name) VALUES (?, ?);", [superAdminRoleId, superAdminRoleName]);
  db.execute("INSERT OR IGNORE INTO roles (id, role_name) VALUES (?, ?);", [teacherRoleId, teacherRoleName]);
  db.execute("INSERT OR IGNORE INTO roles (id, role_name) VALUES (?, ?);", [studentRoleId, studentRoleName]);
  db.execute("INSERT OR IGNORE INTO roles (id, role_name) VALUES (?, ?);", [parentRoleId, parentRoleName]);

  // Insert Core Permissions
  final permissions = [
    (1, 'read:governance', 'admin', 'governance', 'read', 'Allows reading system governance data'),
    (2, 'manage:users', 'admin', 'users', 'manage', 'Allows managing system users and roles'),
    (3, 'read:student_data', 'teacher', 'student_data', 'read', 'Allows reading student records'),
    (4, 'update:student_data', 'teacher', 'student_data', 'update', 'Allows updating student records'),
    (5, 'read:own_data', 'student', 'own_data', 'read', 'Allows student to read own academic data'),
    (6, 'read:child_data', 'parent', 'child_data', 'read', 'Allows parent to read child academic data'),
  ];

  for (final p in permissions) {
    db.execute('''
      INSERT OR IGNORE INTO permissions (id, permission_key, module, sub_module, action, description)
      VALUES (?, ?, ?, ?, ?, ?);
    ''', [p.$1, p.$2, p.$3, p.$4, p.$5, p.$6]);
  }

  // Grant all permissions to Super Admin role (Role 1)
  for (final p in permissions) {
    db.execute('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?);', [superAdminRoleId, p.$1]);
  }

  // Grant Teacher permissions (Role 2)
  db.execute('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, 3);', [teacherRoleId]);
  db.execute('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, 4);', [teacherRoleId]);

  // Grant Student permissions (Role 3)
  db.execute('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, 5);', [studentRoleId]);

  // Grant Parent permissions (Role 4)
  db.execute('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, 6);', [parentRoleId]);
}

/// Ensures default superadmin account exists with credentials.
void ensureDemoUsersExist(Database db) {
  final demoUsers = [
    {
      'username': 'superadmin',
      'password': 'adminpass',
      'roleId': 1,
      'email': 'admin@academia.edu',
      'phoneNumber': '1234567890',
      'status': 'registered',
    },
  ];

  for (final user in demoUsers) {
    final username = user['username'] as String;
    final password = user['password'] as String;
    final roleId = user['roleId'] as int;
    final email = user['email'] as String;
    final phoneNumber = user['phoneNumber'] as String;
    final status = user['status'] as String;

    db.execute(
      'INSERT OR IGNORE INTO users (username, password_hash, email, phone_number, status) VALUES (?, ?, ?, ?, ?);',
      [username, hashPassword(password), email, phoneNumber, status],
    );

    final res = db.select('SELECT id FROM users WHERE username = ?', [username]);
    if (res.isNotEmpty) {
      final userId = res.first['id'] as int;
      db.execute('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?);', [userId, roleId]);
    }
  }
}

/// Validates that all core tables exist in the database.
bool validateDatabase(Database db) {
  final requiredTables = {
    'users',
    'roles',
    'permissions',
    'user_roles',
    'role_permissions',
    'user_permissions',
  };

  final ResultSet results = db.select(
    "SELECT name FROM sqlite_master WHERE type='table';",
  );
  final existingTables = results.map((row) => row['name'] as String).toSet();

  final missing = requiredTables.difference(existingTables);
  if (missing.isNotEmpty) {
    throw Exception('Database validation failed! Missing tables: $missing');
  }

  print('Database validation successful! All core tables exist.');
  return true;
}
