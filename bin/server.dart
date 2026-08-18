import 'dart:convert';
import 'dart:io';
import 'package:sqlite3/sqlite3.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';
import 'package:academia/login_throttle.dart';

late Database db;
final loginThrottle = LoginThrottle();
const String ACADEMY_CURRENT_VERSION = '0.6.1';

// ── Auto-Update Download State ─────────────────────────────
enum DownloadStatus { idle, downloading, done, error }
DownloadStatus _downloadStatus = DownloadStatus.idle;
int _downloadProgress = 0;       // 0-100
String _downloadError = '';
String _downloadedFilePath = '';

bool isVersionGreater(String newVersion, String currentVersion) {
  try {
    final cleanNew = newVersion.replaceAll(RegExp(r'[^0-9.]'), '');
    final cleanCur = currentVersion.replaceAll(RegExp(r'[^0-9.]'), '');
    final v1Parts = cleanNew.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    final v2Parts = cleanCur.split('.').map((e) => int.tryParse(e) ?? 0).toList();

    final maxLen = v1Parts.length > v2Parts.length ? v1Parts.length : v2Parts.length;
    for (int i = 0; i < maxLen; i++) {
      final p1 = i < v1Parts.length ? v1Parts[i] : 0;
      final p2 = i < v2Parts.length ? v2Parts[i] : 0;
      if (p1 > p2) return true;
      if (p1 < p2) return false;
    }
  } catch (_) {}
  return false;
}

Future<Map<String, Object?>> checkGitHubUpdate() async {
  try {
    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 5);

    final endpoints = [
      'https://api.github.com/repos/orion-pk/releases/releases',
      'https://api.github.com/repos/orion-pk/releases/releases/tags/academy-v0.6.0',
    ];

    final token = Platform.environment['GITHUB_TOKEN'] ?? Platform.environment['ACADEMY_GH_TOKEN'] ?? '';

    for (final urlStr in endpoints) {
      try {
        final request = await client.getUrl(Uri.parse(urlStr));
        request.headers.set('User-Agent', 'Academia-Platform/$ACADEMY_CURRENT_VERSION');
        request.headers.set('Accept', 'application/vnd.github.v3+json');
        if (token.isNotEmpty) {
          request.headers.set('Authorization', 'token $token');
        }
        final response = await request.close();

        if (response.statusCode == 200) {
          final content = await utf8.decoder.bind(response).join();
          final decoded = jsonDecode(content);
          final List releases = decoded is List ? decoded : [decoded];

          if (releases.isNotEmpty) {
            Map<String, dynamic>? bestRelease;
            String highestVersion = ACADEMY_CURRENT_VERSION;

            for (final item in releases) {
              if (item is Map<String, dynamic>) {
                final rawTag = item['tag_name'] as String? ?? '';
                final name = item['name'] as String? ?? '';
                final isDraft = item['draft'] as bool? ?? false;
                if (isDraft) continue;

                if (rawTag.contains('academy') || rawTag.startsWith('v') || RegExp(r'^\d').hasMatch(rawTag) || name.toLowerCase().contains('academy')) {
                  final cleanVer = rawTag.replaceAll(RegExp(r'^(academy-v|academy-|v)'), '');
                  if (isVersionGreater(cleanVer, highestVersion)) {
                    highestVersion = cleanVer;
                    bestRelease = item;
                  }
                }
              }
            }

            if (bestRelease != null && isVersionGreater(highestVersion, ACADEMY_CURRENT_VERSION)) {
              final releaseUrl = bestRelease['html_url'] as String? ?? 'https://github.com/orion-pk/releases/releases';
              final releaseNotes = bestRelease['body'] as String? ?? 'New update available.';

              String? downloadUrl;
              final assets = bestRelease['assets'] as List?;
              if (assets != null && assets.isNotEmpty) {
                for (final asset in assets) {
                  final name = asset['name'] as String? ?? '';
                  if (name.endsWith('.exe')) {
                    downloadUrl = asset['browser_download_url'] as String?;
                    break;
                  }
                }
                downloadUrl ??= assets.first['browser_download_url'] as String?;
              }

              client.close();
              return {
                'success': true,
                'currentVersion': ACADEMY_CURRENT_VERSION,
                'latestVersion': highestVersion,
                'updateAvailable': true,
                'releaseUrl': releaseUrl,
                'downloadUrl': downloadUrl,
                'releaseNotes': releaseNotes,
              };
            }
          }
        }
      } catch (_) {}
    }
    client.close();
  } catch (e) {
    stderr.writeln('⚠️ [UPDATE CHECK FAILED]: $e');
  }

  return {
    'success': true,
    'currentVersion': ACADEMY_CURRENT_VERSION,
    'latestVersion': ACADEMY_CURRENT_VERSION,
    'updateAvailable': false,
  };
}

// Silently ignore a future (used to run background tasks without await)
void unawaited(Future<void> future) => future.ignore();

/// Downloads the installer .exe to a temp directory in background,
/// tracking progress in global state. When done, launches the installer
/// silently (Inno Setup /VERYSILENT) and exits the server.
Future<void> _downloadInstaller(String url) async {
  try {
    final tempDir = Directory.systemTemp;
    final fileName = 'Academia_Update_${DateTime.now().millisecondsSinceEpoch}.exe';
    final destFile = File('${tempDir.path}${Platform.pathSeparator}$fileName');

    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 30);
    final req = await client.getUrl(Uri.parse(url));
    final resp = await req.close();

    final totalBytes = resp.contentLength;
    int receivedBytes = 0;
    final sink = destFile.openWrite();

    await for (final chunk in resp) {
      sink.add(chunk);
      receivedBytes += chunk.length;
      if (totalBytes > 0) {
        _downloadProgress = ((receivedBytes / totalBytes) * 100).round().clamp(0, 99);
      } else {
        // Unknown size — pulse between 10-90
        _downloadProgress = (_downloadProgress < 90) ? _downloadProgress + 1 : 90;
      }
    }

    await sink.flush();
    await sink.close();
    client.close();

    _downloadedFilePath = destFile.path;
    _downloadProgress = 100;
    _downloadStatus = DownloadStatus.done;

    print('✅ Update downloaded to: ${destFile.path}');

    // Wait 1.5s so frontend can read status=done before we exit
    await Future.delayed(const Duration(milliseconds: 1500));

    // Launch installer silently and exit server
    if (Platform.isWindows) {
      await Process.start(
        destFile.path,
        ['/VERYSILENT', '/NORESTART'],
        mode: ProcessStartMode.detached,
      );
    } else if (Platform.isMacOS) {
      await Process.start('open', [destFile.path], mode: ProcessStartMode.detached);
    } else {
      await Process.start('xdg-open', [destFile.path], mode: ProcessStartMode.detached);
    }

    print('🚀 Installer launched. Academia server shutting down for update...');
    exit(0);
  } catch (e) {
    _downloadStatus = DownloadStatus.error;
    _downloadError = e.toString();
    print('❌ Update download failed: $e');
  }
}

String getClientIp(HttpRequest request) {
  final trustProxy = Platform.environment['ACADEMY_TRUST_PROXY'] == '1';
  if (trustProxy) {
    final xForwardedFor = request.headers.value('X-Forwarded-For');
    if (xForwardedFor != null && xForwardedFor.trim().isNotEmpty) {
      return xForwardedFor.split(',').first.trim();
    }
  }
  return request.connectionInfo?.remoteAddress.address ?? '127.0.0.1';
}

void main() async {
  try {
    print('====================================================');
    print('       ACADEMY RBAC WEB SERVER INITIALIZING...      ');
    print('====================================================');

    db = getDbConnection(dbName, true);
    initializeSchema(db);
    validateDatabase(db);

    print('Ensuring core system demo accounts (Admin, Teacher, Student, Parent)...');
    ensureDemoUsersExist(db);

    final hostEnv = Platform.environment['ACADEMY_HOST'];
    final host = (hostEnv != null && hostEnv.trim().isNotEmpty) ? hostEnv.trim() : '127.0.0.1';
    
    HttpServer? server;
    int port = 8085;
    for (int tryPort = 8085; tryPort <= 8095; tryPort++) {
      try {
        server = await HttpServer.bind(host, tryPort);
        port = tryPort;
        break;
      } catch (e) {
        if (tryPort == 8095) rethrow;
      }
    }
    final serverUrl = 'http://$host:$port/';
    print('🌐 Academy RBAC Web Server is running on: $serverUrl');
    print('Press Ctrl+C to stop the server.');

    // Auto-open browser on startup unless explicitly disabled via ACADEMY_AUTO_OPEN=0
    if (Platform.environment['ACADEMY_AUTO_OPEN'] != '0') {
      Future.delayed(const Duration(milliseconds: 500), () {
        try {
          if (Platform.isWindows) {
            Process.run('cmd', ['/c', 'start', serverUrl]);
          } else if (Platform.isMacOS) {
            Process.run('open', [serverUrl]);
          } else if (Platform.isLinux) {
            Process.run('xdg-open', [serverUrl]);
          }
        } catch (_) {}
      });
    }

    await for (HttpRequest request in server!) {
      handleRequest(request);
    }
  } catch (e, stack) {
    print('❌ CRITICAL ERROR IN SERVER STARTUP: $e');
    print(stack);
    try {
      final exeDir = File(Platform.resolvedExecutable).parent.path;
      File('$exeDir${Platform.pathSeparator}error.log').writeAsStringSync('ERROR AT ${DateTime.now()}:\n$e\n$stack\n');
    } catch (_) {}
    sleep(const Duration(seconds: 10));
  }
}

String getContentTypeForFile(String filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

Directory? findDistDirectory() {
  final exeDir = File(Platform.resolvedExecutable).parent.path;
  final exeParent = Directory(exeDir).parent.path;
  final cwd = Directory.current.path;
  final cwdParent = Directory(cwd).parent.path;

  final candidates = [
    Directory('$exeDir${Platform.pathSeparator}dist'),
    Directory('$exeDir${Platform.pathSeparator}academy${Platform.pathSeparator}dist'),
    Directory('$exeDir${Platform.pathSeparator}wwwroot'),
    Directory('$exeParent${Platform.pathSeparator}dist'),
    Directory('$exeParent${Platform.pathSeparator}academy${Platform.pathSeparator}dist'),
    Directory('$cwd${Platform.pathSeparator}dist'),
    Directory('$cwd${Platform.pathSeparator}academy${Platform.pathSeparator}dist'),
    Directory('$cwdParent${Platform.pathSeparator}dist'),
  ];

  for (final dir in candidates) {
    if (dir.existsSync()) {
      return dir;
    }
  }
  return null;
}

Future<void> serveStaticFile(HttpRequest request, String path) async {
  final distDir = findDistDirectory();
  if (distDir == null) {
    await sendJsonResponse(request, HttpStatus.ok, {
      'success': true,
      'service': 'Academia RBAC REST API Server',
      'status': 'online',
      'version': '1.0.0',
    });
    return;
  }

  String cleanReqPath = (path == '/' || path.isEmpty) ? '/index.html' : path;
  final relPath = cleanReqPath.replaceAll('/', Platform.pathSeparator);
  File targetFile = File('${distDir.path}$relPath');

  if (!targetFile.existsSync()) {
    targetFile = File('${distDir.path}${Platform.pathSeparator}index.html');
  }

  if (targetFile.existsSync()) {
    try {
      final contentType = getContentTypeForFile(targetFile.path);
      request.response.headers.set('Content-Type', contentType);
      request.response.statusCode = HttpStatus.ok;
      await targetFile.openRead().pipe(request.response);
      return;
    } catch (_) {}
  }

  await sendJsonResponse(request, HttpStatus.ok, {
    'success': true,
    'service': 'Academia RBAC REST API Server',
    'status': 'online',
    'version': '1.0.0',
  });
}

void handleRequest(HttpRequest request) async {
  // CORS Headers - Origin Allowlist Enforcement
  final requestOrigin = request.headers.value('origin');
  final envAllowed = Platform.environment['ACADEMY_ALLOWED_ORIGINS'];
  final allowedOrigins = (envAllowed != null && envAllowed.trim().isNotEmpty)
      ? envAllowed.split(',').map((e) => e.trim()).toList()
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:8085',
          'http://127.0.0.1:8085',
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ];

  bool isOriginAllowed(String origin) {
    if (allowedOrigins.contains(origin)) return true;
    final uri = Uri.tryParse(origin);
    if (uri != null && (uri.host == 'localhost' || uri.host == '127.0.0.1')) {
      return true;
    }
    return false;
  }

  if (requestOrigin != null && requestOrigin.isNotEmpty) {
    if (isOriginAllowed(requestOrigin)) {
      request.response.headers.set('Access-Control-Allow-Origin', requestOrigin);
      request.response.headers.set('Vary', 'Origin');
    }
  }

  request.response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  request.response.headers.set(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );

  if (request.method == 'OPTIONS') {
    request.response.statusCode = HttpStatus.ok;
    await request.response.close();
    return;
  }

  final path = request.uri.path;

  try {
    if (path.startsWith('/api/')) {
      await handleApiRoute(request, path);
    } else if (path == '/health') {
      await sendJsonResponse(request, HttpStatus.ok, {
        'success': true,
        'service': 'Academia RBAC REST API Server',
        'status': 'online',
        'version': '1.0.0',
      });
    } else {
      await serveStaticFile(request, path);
    }
  } catch (e, stackTrace) {
    if (e is FormatException) {
      await sendJsonResponse(request, HttpStatus.badRequest, {
        'success': false,
        'error': sanitizeErrorMessage(e),
      });
      return;
    }
    if (e is TypeError) {
      await sendJsonResponse(request, HttpStatus.badRequest, {
        'success': false,
        'error': 'Invalid parameter data types in request body.',
      });
      return;
    }
    stderr.writeln('⚠️ [UNCAUGHT SERVER ERROR]: $e\n$stackTrace');
    await sendJsonResponse(request, HttpStatus.internalServerError, {
      'success': false,
      'error': sanitizeErrorMessage(e),
    });
  }
}



Future<void> sendJsonResponse(
  HttpRequest request,
  int statusCode,
  Map<String, Object?> body,
) async {
  request.response.statusCode = statusCode;
  request.response.headers.contentType = ContentType.json;
  request.response.write(jsonEncode(body));
  await request.response.close();
}

String? extractBearerToken(HttpRequest request) {
  final authHeader = request.headers.value('Authorization');
  if (authHeader != null && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

Future<Map<String, Object?>> parseJsonBody(HttpRequest request) async {
  final content = await utf8.decoder.bind(request).join();
  if (content.trim().isEmpty) return {};
  try {
    final decoded = jsonDecode(content);
    if (decoded is Map<String, Object?>) {
      return decoded;
    }
    throw const FormatException('JSON body payload must be an object.');
  } on FormatException {
    rethrow;
  } catch (e) {
    throw FormatException('Invalid JSON payload: $e');
  }
}

Future<void> handleApiRoute(HttpRequest request, String path) async {
  final token = extractBearerToken(request);
  final session = token != null ? verifyAuthToken(token, db) : null;

  switch (path) {
    case '/api/version':
      await sendJsonResponse(request, HttpStatus.ok, {
        'success': true,
        'version': ACADEMY_CURRENT_VERSION,
      });
      break;

    case '/api/check-update':
      final updateData = await checkGitHubUpdate();
      await sendJsonResponse(request, HttpStatus.ok, updateData);
      break;

    case '/api/trigger-update':
      // Legacy: kept for backward compat, redirects to start-download
      await sendJsonResponse(request, HttpStatus.ok, {
        'success': true,
        'message': 'Use /api/start-download for auto-update.',
      });
      break;

    case '/api/start-download':
      if (request.method == 'POST') {
        if (_downloadStatus == DownloadStatus.downloading) {
          await sendJsonResponse(request, HttpStatus.ok, {
            'success': true,
            'message': 'Download already in progress.',
            'alreadyRunning': true,
          });
          break;
        }

        final updateInfo = await checkGitHubUpdate();
        final dlUrl = updateInfo['downloadUrl'] as String?;

        if (dlUrl == null || dlUrl.isEmpty) {
          await sendJsonResponse(request, HttpStatus.ok, {
            'success': false,
            'error': 'No download URL found. Check GitHub releases.',
          });
          break;
        }

        // Start download in background (non-blocking)
        _downloadStatus = DownloadStatus.downloading;
        _downloadProgress = 0;
        _downloadError = '';
        _downloadedFilePath = '';

        unawaited(_downloadInstaller(dlUrl));

        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'message': 'Download started in background.',
          'downloadUrl': dlUrl,
        });
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method not allowed',
        });
      }
      break;

    case '/api/download-progress':
      await sendJsonResponse(request, HttpStatus.ok, {
        'success': true,
        'status': _downloadStatus.name,
        'progress': _downloadProgress,
        'error': _downloadError,
        'filePath': _downloadedFilePath,
      });
      break;

    case '/api/login':
      if (request.method == 'POST') {
        final body = await parseJsonBody(request);
        final username = body['username'] as String? ?? '';
        final password = body['password'] as String? ?? '';
        final clientIp = getClientIp(request);

        if (loginThrottle.isLockedOut(clientIp, username)) {
          final retryAfter = loginThrottle.getRemainingLockoutSeconds(clientIp, username);
          request.response.headers.set('Retry-After', retryAfter.toString());
          await sendJsonResponse(request, HttpStatus.tooManyRequests, {
            'success': false,
            'error': 'Too many failed login attempts. Please try again later.',
            'retryAfter': retryAfter,
          });
          return;
        }

        final userSession = loginUser(db, username, password);
        if (userSession != null) {
          loginThrottle.recordSuccessfulLogin(clientIp, username);
          loginThrottle.recordSuccessfulLogin(clientIp, userSession.username);
          final loginData = getLoginDataForUser(db, userSession);
          await sendJsonResponse(request, HttpStatus.ok, {
            'success': true,
            'message': 'Login successful',
            'session': {
              'userId': userSession.userId,
              'username': userSession.username,
              'roles': userSession.roles,
              'authToken': userSession.authToken,
            },
            'loginData': loginData,
          });
        } else {
          loginThrottle.recordFailedAttempt(clientIp, username);
          if (loginThrottle.isLockedOut(clientIp, username)) {
            final retryAfter = loginThrottle.getRemainingLockoutSeconds(clientIp, username);
            request.response.headers.set('Retry-After', retryAfter.toString());
            await sendJsonResponse(request, HttpStatus.tooManyRequests, {
              'success': false,
              'error': 'Too many failed login attempts. Please try again later.',
              'retryAfter': retryAfter,
            });
          } else {
            await sendJsonResponse(request, HttpStatus.unauthorized, {
              'success': false,
              'error': 'Invalid username or password',
            });
          }
        }
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    case '/api/login-data':
      if (request.method == 'GET') {
        if (session == null) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'Unauthorized. Please log in.',
          });
          return;
        }
        final loginData = getLoginDataForUser(db, session);
        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'loginData': loginData,
        });
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    case '/api/register':
      if (request.method == 'POST') {
        final body = await parseJsonBody(request);
        final username = body['username'] as String? ?? '';
        final password = body['password'] as String? ?? '';
        final roleId = parsePositiveInt(body['roleId']?.toString());
        final adminUsername = body['adminUsername'] as String?;
        final adminPassword = body['adminPassword'] as String?;
        final email = body['email'] as String?;
        final phoneNumber = body['phoneNumber'] as String? ?? body['phone_number'] as String?;
        final status = body['status'] as String?;
        final cnic = body['cnic'] as String?;
        final qualificationGrade = body['qualificationGrade'] as String? ?? body['qualification_grade'] as String?;
        final certifications = body['certifications'] as String?;
        final cvFile = body['cvFile'] as String? ?? body['cv_file'] as String?;
        final degreeFile = body['degreeFile'] as String? ?? body['degree_file'] as String?;
        final certificateFile = body['certificateFile'] as String? ?? body['certificate_file'] as String?;
        final accessGrade = body['accessGrade'] as String? ?? body['access_grade'] as String?;
        final accessSubject = body['accessSubject'] as String? ?? body['access_subject'] as String?;
        final permissionsJson = body['permissionsJson'] as String? ?? body['permissions_json'] as String?;

        final res = registerUser(
          db,
          username,
          password,
          roleId: roleId,
          adminUsername: adminUsername,
          adminPassword: adminPassword,
          adminToken: token,
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

        final statusCode = res['success'] == true
            ? HttpStatus.ok
            : HttpStatus.badRequest;
        await sendJsonResponse(request, statusCode, res);
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    case '/api/users':
      if (request.method == 'GET') {
        if (session == null || !session.isSuperAdmin) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'Super Admin authorization required',
          });
          return;
        }
        final results = db.select('SELECT id, username, email, phone_number, status, cnic, qualification_grade, certifications, cv_file, degree_file, certificate_file, access_grade, access_subject, permissions_json, created_at FROM users');
        final userList = results.map((row) {
          final uid = row['id'] as int;
          return {
            'id': uid,
            'username': row['username'] as String,
            'roles': getUserRoles(db, uid),
            'email': row['email'] as String? ?? '',
            'phoneNumber': row['phone_number'] as String? ?? '',
            'status': row['status'] as String? ?? 'registered',
            'cnic': row['cnic'] as String? ?? '',
            'qualificationGrade': row['qualification_grade'] as String? ?? '',
            'certifications': row['certifications'] as String? ?? '',
            'cvFile': row['cv_file'] as String? ?? '',
            'degreeFile': row['degree_file'] as String? ?? '',
            'certificateFile': row['certificate_file'] as String? ?? '',
            'accessGrade': row['access_grade'] as String? ?? '',
            'accessSubject': row['access_subject'] as String? ?? '',
            'permissionsJson': row['permissions_json'] as String? ?? '',
            'createdAt': row['created_at'] as String? ?? '',
          };
        }).toList();

        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'users': userList,
        });
      } else if (request.method == 'DELETE') {
        if (session == null || !session.isSuperAdmin) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'Super Admin authorization required',
          });
          return;
        }
        final userIdParam = request.uri.queryParameters['userId'];
        final body = (userIdParam == null || userIdParam.isEmpty) ? await parseJsonBody(request) : <String, Object?>{};
        final targetUserId = parsePositiveInt(userIdParam) ?? parsePositiveInt(body['userId']?.toString());

        if (targetUserId == null) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'userId parameter is required and must be a positive integer',
          });
          return;
        }

        final res = deleteUser(db, targetUserId, adminToken: session.authToken);
        final statusCode = res['success'] == true ? HttpStatus.ok : HttpStatus.badRequest;
        await sendJsonResponse(request, statusCode, res);
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    case '/api/update-user':
    case '/api/update-user-status':
      if (request.method == 'POST') {
        if (session == null || !session.isSuperAdmin) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'Super Admin authorization required',
          });
          return;
        }
        final body = await parseJsonBody(request);
        final targetUserId = parsePositiveInt(body['userId']?.toString());
        if (targetUserId == null) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'userId parameter is required and must be a positive integer',
          });
          return;
        }

        final username = body['username'] as String?;
        final password = body['password'] as String?;
        final email = body['email'] as String?;
        final phoneNumber = body['phoneNumber'] as String? ?? body['phone_number'] as String?;
        final status = body['status'] as String?;
        final roleId = parsePositiveInt(body['roleId']?.toString());

        final res = updateUser(
          db,
          targetUserId,
          username: username,
          password: password,
          email: email,
          phoneNumber: phoneNumber,
          status: status,
          roleId: roleId,
          adminToken: session.authToken,
        );

        final statusCode = res['success'] == true ? HttpStatus.ok : HttpStatus.badRequest;
        await sendJsonResponse(request, statusCode, res);
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    case '/api/assign-role':
      if (request.method == 'POST') {
        final body = await parseJsonBody(request);
        final userId = parsePositiveInt(body['userId']?.toString());
        final roleId = parsePositiveInt(body['roleId']?.toString());

        if (userId == null || roleId == null) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'userId and roleId are required positive integers',
          });
          return;
        }

        try {
          assignRoleToUser(db, userId: userId, roleId: roleId, adminToken: token);
          await sendJsonResponse(request, HttpStatus.ok, {
            'success': true,
            'message': 'Role assigned successfully',
          });
        } catch (e) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': sanitizeErrorMessage(e),
          });
        }
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    case '/api/assign-direct-permission':
      if (request.method == 'POST') {
        final body = await parseJsonBody(request);
        final userId = parsePositiveInt(body['userId']?.toString());
        final permId = parsePositiveInt(body['permissionId']?.toString());
        final permKey = body['permissionKey'] as String?;

        if (userId == null || (permId == null && (permKey == null || permKey.isEmpty))) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'userId and either permissionId or permissionKey are required',
          });
          return;
        }

        try {
          assignDirectPermissionToUser(db,
              userId: userId, permissionId: permId, permissionKey: permKey, adminToken: token);
          await sendJsonResponse(request, HttpStatus.ok, {
            'success': true,
            'message': 'Direct permission assigned successfully',
          });
        } catch (e) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': sanitizeErrorMessage(e),
          });
        }
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    default:
      await sendJsonResponse(request, HttpStatus.notFound, {
        'success': false,
        'error': 'Unknown API endpoint',
      });
  }
}
