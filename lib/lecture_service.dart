import 'package:sqlite3/sqlite3.dart';

class LectureService {
  /// Create a new lecture and optionally assign students
  static Map<String, Object?> createLecture(
    Database db, {
    required String title,
    required String subject,
    String? description,
    required int teacherId,
    List<int>? studentIds,
  }) {
    final cleanTitle = title.trim();
    final cleanSubject = subject.trim();

    if (cleanTitle.isEmpty) {
      return {'success': false, 'error': 'Lecture title cannot be empty.'};
    }
    if (cleanSubject.isEmpty) {
      return {'success': false, 'error': 'Lecture subject cannot be empty.'};
    }

    // Verify teacher exists
    final teacherCheck = db.select('SELECT id, username FROM users WHERE id = ?', [teacherId]);
    if (teacherCheck.isEmpty) {
      return {'success': false, 'error': 'Teacher with ID $teacherId does not exist.'};
    }

    db.execute('BEGIN TRANSACTION;');
    try {
      db.execute(
        '''
        INSERT INTO lectures (title, subject, description, teacher_id)
        VALUES (?, ?, ?, ?);
        ''',
        [cleanTitle, cleanSubject, description?.trim() ?? '', teacherId],
      );

      final lectureId = db.lastInsertRowId;

      if (studentIds != null && studentIds.isNotEmpty) {
        final uniqueStudentIds = studentIds.toSet();
        for (final sId in uniqueStudentIds) {
          db.execute(
            '''
            INSERT OR IGNORE INTO lecture_students (lecture_id, student_id)
            VALUES (?, ?);
            ''',
            [lectureId, sId],
          );
        }
      }

      db.execute('COMMIT;');
      return {
        'success': true,
        'message': 'Lecture created successfully.',
        'lectureId': lectureId,
      };
    } catch (e) {
      try { db.execute('ROLLBACK;'); } catch (_) {}
      return {'success': false, 'error': 'Failed to create lecture: $e'};
    }
  }

  /// Get list of all lectures with teacher name and student count
  static List<Map<String, Object?>> getLectures(
    Database db, {
    int? teacherId,
    int? studentId,
  }) {
    String query = '''
      SELECT 
        l.id,
        l.title,
        l.subject,
        l.description,
        l.teacher_id,
        u.username AS teacher_name,
        l.created_at,
        COUNT(ls.student_id) AS student_count
      FROM lectures l
      JOIN users u ON l.teacher_id = u.id
      LEFT JOIN lecture_students ls ON l.id = ls.lecture_id
    ''';

    final List<Object?> params = [];
    final List<String> conditions = [];

    if (teacherId != null) {
      conditions.add('l.teacher_id = ?');
      params.add(teacherId);
    }

    if (studentId != null) {
      conditions.add('l.id IN (SELECT lecture_id FROM lecture_students WHERE student_id = ?)');
      params.add(studentId);
    }

    if (conditions.isNotEmpty) {
      query += ' WHERE ${conditions.join(' AND ')}';
    }

    query += ' GROUP BY l.id ORDER BY l.id DESC;';

    final results = db.select(query, params);
    return results.map((row) {
      return {
        'id': row['id'] as int,
        'title': row['title'] as String,
        'subject': row['subject'] as String,
        'description': row['description'] as String? ?? '',
        'teacherId': row['teacher_id'] as int,
        'teacherName': row['teacher_name'] as String? ?? 'Unknown',
        'studentCount': row['student_count'] as int? ?? 0,
        'createdAt': row['created_at'] as String? ?? '',
      };
    }).toList();
  }

  /// Get detailed single lecture including assigned students roster
  static Map<String, Object?>? getLectureById(Database db, int lectureId) {
    final lectureRes = db.select(
      '''
      SELECT 
        l.id,
        l.title,
        l.subject,
        l.description,
        l.teacher_id,
        u.username AS teacher_name,
        u.email AS teacher_email,
        l.created_at
      FROM lectures l
      JOIN users u ON l.teacher_id = u.id
      WHERE l.id = ?;
      ''',
      [lectureId],
    );

    if (lectureRes.isEmpty) return null;
    final row = lectureRes.first;

    final studentRows = db.select(
      '''
      SELECT 
        u.id,
        u.username,
        u.email,
        u.phone_number,
        ls.assigned_at
      FROM lecture_students ls
      JOIN users u ON ls.student_id = u.id
      WHERE ls.lecture_id = ?
      ORDER BY u.username ASC;
      ''',
      [lectureId],
    );

    final students = studentRows.map((s) => {
      'id': s['id'] as int,
      'username': s['username'] as String,
      'email': s['email'] as String? ?? '',
      'phoneNumber': s['phone_number'] as String? ?? '',
      'assignedAt': s['assigned_at'] as String? ?? '',
    }).toList();

    return {
      'id': row['id'] as int,
      'title': row['title'] as String,
      'subject': row['subject'] as String,
      'description': row['description'] as String? ?? '',
      'teacherId': row['teacher_id'] as int,
      'teacherName': row['teacher_name'] as String? ?? 'Unknown',
      'teacherEmail': row['teacher_email'] as String? ?? '',
      'createdAt': row['created_at'] as String? ?? '',
      'students': students,
    };
  }

  /// Update lecture details and optionally sync assigned students
  static Map<String, Object?> updateLecture(
    Database db,
    int lectureId, {
    String? title,
    String? subject,
    String? description,
    int? teacherId,
    List<int>? studentIds,
  }) {
    final existing = db.select('SELECT id FROM lectures WHERE id = ?', [lectureId]);
    if (existing.isEmpty) {
      return {'success': false, 'error': 'Lecture not found.'};
    }

    if (teacherId != null) {
      final teacherCheck = db.select('SELECT id FROM users WHERE id = ?', [teacherId]);
      if (teacherCheck.isEmpty) {
        return {'success': false, 'error': 'Teacher with ID $teacherId does not exist.'};
      }
    }

    db.execute('BEGIN TRANSACTION;');
    try {
      if (title != null && title.trim().isNotEmpty) {
        db.execute('UPDATE lectures SET title = ? WHERE id = ?;', [title.trim(), lectureId]);
      }
      if (subject != null && subject.trim().isNotEmpty) {
        db.execute('UPDATE lectures SET subject = ? WHERE id = ?;', [subject.trim(), lectureId]);
      }
      if (description != null) {
        db.execute('UPDATE lectures SET description = ? WHERE id = ?;', [description.trim(), lectureId]);
      }
      if (teacherId != null) {
        db.execute('UPDATE lectures SET teacher_id = ? WHERE id = ?;', [teacherId, lectureId]);
      }

      if (studentIds != null) {
        db.execute('DELETE FROM lecture_students WHERE lecture_id = ?;', [lectureId]);
        for (final sId in studentIds.toSet()) {
          db.execute(
            'INSERT OR IGNORE INTO lecture_students (lecture_id, student_id) VALUES (?, ?);',
            [lectureId, sId],
          );
        }
      }

      db.execute('COMMIT;');
      return {'success': true, 'message': 'Lecture updated successfully.'};
    } catch (e) {
      try { db.execute('ROLLBACK;'); } catch (_) {}
      return {'success': false, 'error': 'Failed to update lecture: $e'};
    }
  }

  /// Delete lecture and cascade clean student assignments
  static Map<String, Object?> deleteLecture(Database db, int lectureId) {
    final existing = db.select('SELECT id FROM lectures WHERE id = ?', [lectureId]);
    if (existing.isEmpty) {
      return {'success': false, 'error': 'Lecture not found.'};
    }

    db.execute('DELETE FROM lectures WHERE id = ?;', [lectureId]);
    return {'success': true, 'message': 'Lecture deleted successfully.'};
  }
}
