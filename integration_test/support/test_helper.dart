import 'dart:io';
import 'package:sqlite3/sqlite3.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';

const String testJwtSecret = 'medicare_style_integration_test_jwt_secret_key_32chars';

class IntegrationTestHelper {
  final Database db;
  final String tempDbPath;

  IntegrationTestHelper(this.db, this.tempDbPath);

  static IntegrationTestHelper setup() {
    setJwtSecretForTesting(testJwtSecret);
    final tempDir = Directory.systemTemp.createTempSync('academia_integration_test_');
    final dbPath = '${tempDir.path}${Platform.pathSeparator}academy_integration.db';

    final db = sqlite3.open(dbPath);
    db.execute('PRAGMA foreign_keys = ON;');
    initializeSchema(db);
    validateDatabase(db);

    return IntegrationTestHelper(db, dbPath);
  }

  void teardown() {
    try {
      db.dispose();
    } catch (_) {}
    try {
      final file = File(tempDbPath);
      if (file.existsSync()) {
        file.deleteSync();
      }
      final parentDir = file.parent;
      if (parentDir.existsSync()) {
        parentDir.deleteSync(recursive: true);
      }
    } catch (_) {}
  }
}
