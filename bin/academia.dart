import 'dart:convert';
import 'dart:io';
import 'package:sqlite3/sqlite3.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';

void main(List<String> args) {
  runInteractiveCli();
}

void runInteractiveCli() {
  print('====================================================');
  print('       ACADEMY RBAC SYSTEM TERMINAL INTERFACE      ');
  print('====================================================');

  final db = getDbConnection(dbName, true);
  initializeSchema(db);
  validateDatabase(db);
  ensureDemoUsersExist(db);

  UserSession? currentSession;

  while (true) {
    if (currentSession == null) {
      // Unauthenticated Main Menu
      print('\n---------------- MAIN MENU ----------------');
      print('1. Login to Account');
      print('2. Register New User Account');
      print('3. Exit Application');
      stdout.write('Select an option (1-3): ');

      final choice = stdin.readLineSync()?.trim();

      switch (choice) {
        case '1':
          currentSession = handleLogin(db);
          break;
        case '2':
          handleRegistration(db, currentSession);
          break;
        case '3':
          print('Goodbye! Exiting application...');
          db.dispose();
          exit(0);
        default:
          print('Invalid option. Please try again.');
      }
    } else {
      // Authenticated User Session Menu
      print('\n====================================================');
      print(' USER SESSION: ${currentSession.username.toUpperCase()}');
      print(' Roles: ${currentSession.roles.join(', ')}');
      print('====================================================');

      displayLoginData(db, currentSession);

      print('\n---------------- SESSION MENU ----------------');
      if (currentSession.isSuperAdmin) {
        print('1. Register a New User');
        print('2. Assign Role to User');
        print('3. View All System Users');
        print('4. Logout');
      } else {
        print('1. View Session Info');
        print('2. Logout');
      }

      stdout.write('Select an option: ');
      final choice = stdin.readLineSync()?.trim();

      if (currentSession.isSuperAdmin) {
        switch (choice) {
          case '1':
            handleRegistration(db, currentSession);
            break;
          case '2':
            handleAssignRole(db, currentSession);
            break;
          case '3':
            handleViewAllUsers(db);
            break;
          case '4':
            print('\n[LOGOUT] User "${currentSession.username}" logged out successfully.');
            currentSession = null;
            break;
          default:
            print('Invalid option.');
        }
      } else {
        switch (choice) {
          case '1':
            print('User ID: ${currentSession.userId} | Username: ${currentSession.username}');
            break;
          case '2':
            print('\n[LOGOUT] User "${currentSession.username}" logged out successfully.');
            currentSession = null;
            break;
          default:
            print('Invalid option.');
        }
      }
    }
  }
}

UserSession? handleLogin(Database db) {
  print('\n--- LOGIN TO ACCOUNT ---');
  stdout.write('Enter Username: ');
  final username = stdin.readLineSync()?.trim() ?? '';
  stdout.write('Enter Password: ');
  final password = stdin.readLineSync()?.trim() ?? '';

  if (username.isEmpty || password.isEmpty) {
    print('Username and password cannot be empty.');
    return null;
  }

  final session = loginUser(db, username, password);
  if (session != null) {
    print('\n✅ LOGIN SUCCESSFUL!');
    print('   Active Session Auth Token (JWT HS256):');
    print('   "${session.authToken}"');
    return session;
  } else {
    print('\n❌ LOGIN FAILED: Invalid username or password.');
    return null;
  }
}

void displayLoginData(Database db, UserSession session) {
  final loginData = getLoginDataForUser(db, session);
  print('\n📊 DATA FOR LOGIN PAYLOAD:');
  print(encoder.convert(loginData));
}

final encoder = JsonEncoder.withIndent('  ');

void handleRegistration(Database db, UserSession? currentSession) {
  print('\n--- REGISTER NEW USER ACCOUNT ---');
  stdout.write('Enter New Username: ');
  final username = stdin.readLineSync()?.trim() ?? '';
  stdout.write('Enter New Password: ');
  final password = stdin.readLineSync()?.trim() ?? '';

  print('\nSelect System Role:');
  print('1. Super Admin');
  print('4. Parent');
  stdout.write('Enter Role ID (1, 4): ');
  final roleIdStr = stdin.readLineSync()?.trim() ?? '1';

  try {
    final roleId = int.parse(roleIdStr);
    final res = registerUser(
      db,
      username,
      password,
      roleId: roleId,
      adminToken: currentSession?.authToken,
    );

    if (res['success'] == true) {
      print('✅ REGISTRATION SUCCESSFUL: ${res['message']}');
    } else {
      print('❌ REGISTRATION FAILED: ${res['error']}');
    }
  } catch (e) {
    print('❌ Invalid role ID or system error: $e');
  }
}

void handleAssignRole(Database db, UserSession session) {
  stdout.write('Enter Target User ID: ');
  final userIdStr = stdin.readLineSync()?.trim() ?? '';
  stdout.write('Enter Role ID (1: Super Admin, 4: Parent): ');
  final roleIdStr = stdin.readLineSync()?.trim() ?? '';

  try {
    final userId = int.parse(userIdStr);
    final roleId = int.parse(roleIdStr);

    assignRoleToUser(db,
        adminToken: session.authToken, userId: userId, roleId: roleId);
    print('✅ Role ID $roleId assigned to User ID $userId successfully.');
  } catch (e) {
    print('❌ Failed to assign role: $e');
  }
}

void handleViewAllUsers(Database db) {
  print('\n--- ALL REGISTERED USERS ---');
  final results = db.select('SELECT id, username, created_at FROM users');
  for (final row in results) {
    final uid = row['id'] as int;
    final uname = row['username'] as String;
    final roles = getUserRoles(db, uid);
    print('ID: $uid | Username: $uname | Roles: ${roles.join(', ')}');
  }
}
