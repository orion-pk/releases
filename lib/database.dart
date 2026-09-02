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
  try { db.execute("ALTER TABLE users ADD COLUMN review_notes TEXT;"); } catch (_) {}

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

    CREATE TABLE IF NOT EXISTS invitation_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      is_used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lectures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT,
      teacher_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lecture_students (
      lecture_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (lecture_id, student_id),
      FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );
  ''');

  // Insert Default Roles
  db.execute("INSERT OR IGNORE INTO roles (id, role_name) VALUES (?, ?);", [superAdminRoleId, superAdminRoleName]);
  db.execute("INSERT OR IGNORE INTO roles (id, role_name) VALUES (?, ?);", [teacherRoleId, teacherRoleName]);
  db.execute("INSERT OR IGNORE INTO roles (id, role_name) VALUES (?, ?);", [studentRoleId, studentRoleName]);
  db.execute("INSERT OR IGNORE INTO roles (id, role_name) VALUES (?, ?);", [parentRoleId, parentRoleName]);

  // Insert Core CRUD Permissions dynamically from Static JSON Manifest (lib/config/permissions.json)
  final manifest = loadPermissionsManifest();
  final modules = manifest['modules'] as List<dynamic>? ?? [];

  for (final mod in modules) {
    if (mod is! Map) continue;
    final moduleName = mod['name'] as String? ?? 'General';
    final subModule = mod['sub_module'] as String? ?? 'general';
    final perms = mod['permissions'] as List<dynamic>? ?? [];

    for (final p in perms) {
      if (p is! Map) continue;
      final permId = p['id'] as int?;
      final permKey = p['key'] as String;
      final action = p['action'] as String? ?? 'view';
      final desc = p['description'] as String? ?? p['label'] as String? ?? '';

      if (permId != null) {
        db.execute('''
          INSERT OR REPLACE INTO permissions (id, permission_key, module, sub_module, action, description)
          VALUES (?, ?, ?, ?, ?, ?);
        ''', [permId, permKey, moduleName, subModule, action, desc]);
      } else {
        db.execute('''
          INSERT OR REPLACE INTO permissions (permission_key, module, sub_module, action, description)
          VALUES (?, ?, ?, ?, ?);
        ''', [permKey, moduleName, subModule, action, desc]);
      }
    }
  }

  // Grant all permissions to Super Admin role (Role 1)
  final allPermIds = db.select('SELECT id FROM permissions').map((r) => r['id'] as int).toList();
  for (final pId in allPermIds) {
    db.execute('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?);', [superAdminRoleId, pId]);
  }

  // Synchronize Default Role Templates from JSON Manifest
  final roleTemplates = manifest['defaultRoleTemplates'] as Map<String, dynamic>? ?? {};

  // Teacher Template (Role 2)
  final teacherTemplate = roleTemplates['Teacher'] as Map<String, dynamic>?;
  final teacherPermKeys = (teacherTemplate?['permissions'] as List<dynamic>? ?? [
    'students:view', 'students:create', 'students:edit', 'teachers:view', 'classes:view', 'lectures:view', 'lectures:create', 'lectures:edit'
  ]).map((e) => e.toString()).toList();

  for (final key in teacherPermKeys) {
    final res = db.select('SELECT id FROM permissions WHERE permission_key = ?', [key]);
    if (res.isNotEmpty) {
      final pId = res.first['id'] as int;
      db.execute('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?);', [teacherRoleId, pId]);
    }
  }

  // Student Template (Role 3)
  final studentTemplate = roleTemplates['Student'] as Map<String, dynamic>?;
  final studentPermKeys = (studentTemplate?['permissions'] as List<dynamic>? ?? [
    'students:view', 'classes:view', 'lectures:view'
  ]).map((e) => e.toString()).toList();

  for (final key in studentPermKeys) {
    final res = db.select('SELECT id FROM permissions WHERE permission_key = ?', [key]);
    if (res.isNotEmpty) {
      final pId = res.first['id'] as int;
      db.execute('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?);', [studentRoleId, pId]);
    }
  }

  // Parent Template (Role 4)
  final parentTemplate = roleTemplates['Parent'] as Map<String, dynamic>?;
  final parentPermKeys = (parentTemplate?['permissions'] as List<dynamic>? ?? [
    'students:view', 'classes:view', 'lectures:view'
  ]).map((e) => e.toString()).toList();

  for (final key in parentPermKeys) {
    final res = db.select('SELECT id FROM permissions WHERE permission_key = ?', [key]);
    if (res.isNotEmpty) {
      final pId = res.first['id'] as int;
      db.execute('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?);', [parentRoleId, pId]);
    }
  }
}

/// Locates and loads the static permissions JSON manifest from lib/config/permissions.json.
Map<String, dynamic> loadPermissionsManifest() {
  final candidatePaths = [
    '${Directory.current.path}/lib/config/permissions.json',
    '${Directory.current.path}/config/permissions.json',
    'lib/config/permissions.json',
    'config/permissions.json',
  ];

  for (final p in candidatePaths) {
    final file = File(p);
    if (file.existsSync()) {
      try {
        final content = file.readAsStringSync();
        return jsonDecode(content) as Map<String, dynamic>;
      } catch (_) {}
    }
  }

  // Fallback default manifest if external file is inaccessible
  return {
    "modules": [
      {
        "name": "Student Module",
        "sub_module": "students",
        "permissions": [
          {"id": 1, "key": "students:view", "action": "view", "label": "View Students", "description": "View student profiles, rosters & report cards"},
          {"id": 2, "key": "students:create", "action": "create", "label": "Create Student", "description": "Enroll / Register new students"},
          {"id": 3, "key": "students:edit", "action": "edit", "label": "Edit Student", "description": "Modify student profile, grades & attendance"},
          {"id": 4, "key": "students:delete", "action": "delete", "label": "Delete Student", "description": "Remove student records"}
        ]
      },
      {
        "name": "Teacher Module",
        "sub_module": "teachers",
        "permissions": [
          {"id": 5, "key": "teachers:view", "action": "view", "label": "View Teachers", "description": "View teacher directory & schedules"},
          {"id": 6, "key": "teachers:create", "action": "create", "label": "Create Teacher", "description": "Add new teacher profiles & subject assignments"},
          {"id": 7, "key": "teachers:edit", "action": "edit", "label": "Edit Teacher", "description": "Update teacher qualifications & assigned classes"},
          {"id": 8, "key": "teachers:delete", "action": "delete", "label": "Delete Teacher", "description": "Remove teacher profiles"}
        ]
      },
      {
        "name": "Class Module",
        "sub_module": "classes",
        "permissions": [
          {"id": 9, "key": "classes:view", "action": "view", "label": "View Classes", "description": "View class listings, timetables & section rosters"},
          {"id": 10, "key": "classes:create", "action": "create", "label": "Create Class", "description": "Create new classes, subjects & course sections"},
          {"id": 11, "key": "classes:edit", "action": "edit", "label": "Edit Class", "description": "Edit class details & assigned teachers"},
          {"id": 12, "key": "classes:delete", "action": "delete", "label": "Delete Class", "description": "Delete classes or sections"}
        ]
      },
      {
        "name": "User Governance",
        "sub_module": "users",
        "permissions": [
          {"id": 13, "key": "users:view", "action": "view", "label": "View Users", "description": "View user directory & role assignments"},
          {"id": 14, "key": "users:create", "action": "create", "label": "Create User", "description": "Register new user accounts"},
          {"id": 15, "key": "users:edit", "action": "edit", "label": "Edit User", "description": "Modify user details, email & role assignments"},
          {"id": 16, "key": "users:delete", "action": "delete", "label": "Delete User", "description": "Delete user accounts permanently"}
        ]
      },
      {
        "name": "Lecture Module",
        "sub_module": "lectures",
        "permissions": [
          {"id": 17, "key": "lectures:view", "action": "view", "label": "View Lectures", "description": "View lecture listings and rosters"},
          {"id": 18, "key": "lectures:create", "action": "create", "label": "Create Lecture", "description": "Create and schedule lectures"},
          {"id": 19, "key": "lectures:edit", "action": "edit", "label": "Edit Lecture", "description": "Modify lecture details and assigned students"},
          {"id": 20, "key": "lectures:delete", "action": "delete", "label": "Delete Lecture", "description": "Remove lectures"}
        ]
      },
      {
        "name": "Document & OCR Module",
        "sub_module": "ocr",
        "permissions": [
          {"id": 21, "key": "ocr:view", "action": "view", "label": "View Documents", "description": "View uploaded degrees, certificates, and CVs"},
          {"id": 22, "key": "ocr:scan", "action": "create", "label": "Scan Document", "description": "Scan and extract data from degree certificates"}
        ]
      }
    ],
    "defaultRoleTemplates": {
      "Super Admin": {"roleId": 1, "allPermissions": true},
      "Teacher": {"roleId": 2, "permissions": ["students:view", "students:create", "students:edit", "teachers:view", "classes:view", "lectures:view", "lectures:create", "lectures:edit", "ocr:view"]},
      "Student": {"roleId": 3, "permissions": ["students:view", "classes:view", "lectures:view"]},
      "Parent": {"roleId": 4, "permissions": ["students:view", "classes:view", "lectures:view"]}
    }
  };
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
