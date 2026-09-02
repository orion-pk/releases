import 'dart:convert';
import 'dart:io';
import 'package:sqlite3/sqlite3.dart';
import 'package:academia/database.dart';
import 'package:academia/rbac_api.dart';
import 'package:academia/login_throttle.dart';
import 'package:academia/email_service.dart';
import 'package:academia/ocr_service.dart';
import 'package:academia/lecture_service.dart';

late Database db;
final loginThrottle = LoginThrottle();
const String academyCurrentVersion = '0.7.0';

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
        request.headers.set('User-Agent', 'Academia-Platform/$academyCurrentVersion');
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
            String highestVersion = academyCurrentVersion;

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

            if (bestRelease != null && isVersionGreater(highestVersion, academyCurrentVersion)) {
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
                'currentVersion': academyCurrentVersion,
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
    'currentVersion': academyCurrentVersion,
    'latestVersion': academyCurrentVersion,
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
  final lower = filePath.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.tiff') || lower.endsWith('.tif')) return 'image/tiff';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (lower.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.odt')) return 'application/vnd.oasis.opendocument.text';
  if (lower.endsWith('.ods')) return 'application/vnd.oasis.opendocument.spreadsheet';
  if (lower.endsWith('.odp')) return 'application/vnd.oasis.opendocument.presentation';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (lower.endsWith('.csv')) return 'text/csv; charset=utf-8';
  if (lower.endsWith('.rtf')) return 'application/rtf';
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.rar')) return 'application/vnd.rar';
  if (lower.endsWith('.7z')) return 'application/x-7z-compressed';
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
    case '/api/ocr/scan':
    case '/api/ocr/parse':
      await OcrService.handleOcrScanRequest(request, sendJsonResponse);
      break;

    case '/api/version':
      await sendJsonResponse(request, HttpStatus.ok, {
        'success': true,
        'version': academyCurrentVersion,
      });
      break;

    case '/api/check-update':
      final updateData = await checkGitHubUpdate();
      await sendJsonResponse(request, HttpStatus.ok, updateData);
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

    case '/api/document-file':
      if (request.method == 'GET') {
        final userIdParam = request.uri.queryParameters['userId'];
        final typeParam = request.uri.queryParameters['type'];
        final downloadParam = request.uri.queryParameters['download'] == '1';

        final userId = parsePositiveInt(userIdParam);
        if (userId == null || typeParam == null) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'userId and type query parameters are required',
          });
          break;
        }

        String columnName;
        if (typeParam == 'cv') {
          columnName = 'cv_file';
        } else if (typeParam == 'degree') {
          columnName = 'degree_file';
        } else if (typeParam == 'certificate') {
          columnName = 'certificate_file';
        } else {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'Invalid document type. Must be cv, degree, or certificate',
          });
          break;
        }

        final res = db.select('SELECT username, $columnName FROM users WHERE id = ?', [userId]);
        if (res.isEmpty) {
          await sendJsonResponse(request, HttpStatus.notFound, {
            'success': false,
            'error': 'User not found',
          });
          break;
        }

        final username = res.first['username'] as String? ?? 'user';
        final rawVal = res.first[columnName] as String?;
        if (rawVal == null || rawVal.trim().isEmpty) {
          await sendJsonResponse(request, HttpStatus.notFound, {
            'success': false,
            'error': 'Document not found for user',
          });
          break;
        }

        String fileName = '${username}_$typeParam';
        String contentType = 'application/octet-stream';
        List<int> fileBytes = [];

        try {
          final rawTrimmed = rawVal.trim();
          if (rawTrimmed.startsWith('[')) {
            final decodedList = jsonDecode(rawTrimmed) as List<dynamic>;
            final indexParam = int.tryParse(request.uri.queryParameters['index'] ?? '0') ?? 0;
            final item = (indexParam >= 0 && indexParam < decodedList.length)
                ? decodedList[indexParam]
                : (decodedList.isNotEmpty ? decodedList.first : null);

            if (item is Map<String, dynamic>) {
              final rawName = item['name'] as String? ?? item['fileName'] as String? ?? '';
              contentType = item['type'] as String? ?? getContentTypeForFile(rawName);
              if (rawName.isEmpty || rawName.startsWith('data:') || rawName.contains('base64,')) {
                final ext = contentType.split('/').last.replaceAll('jpeg', 'jpg');
                fileName = '${username}_${typeParam}_${indexParam + 1}.$ext';
              } else {
                fileName = rawName;
              }
              final dataStr = (item['data'] as String?) ??
                  (item['file'] is Map ? (item['file']['data'] as String?) : null) ??
                  '';
              if (dataStr.contains('base64,')) {
                final base64Part = dataStr.split('base64,').last;
                fileBytes = base64.decode(base64Part);
              }
            } else if (item is String) {
              fileName = item;
              contentType = getContentTypeForFile(fileName);
            }
          } else if (rawTrimmed.startsWith('{')) {
            final decoded = jsonDecode(rawTrimmed) as Map<String, dynamic>;
            final rawName = decoded['name'] as String? ?? '';
            contentType = decoded['type'] as String? ?? getContentTypeForFile(rawName);
            if (rawName.isEmpty || rawName.startsWith('data:') || rawName.contains('base64,')) {
              final ext = contentType.split('/').last.replaceAll('jpeg', 'jpg');
              fileName = '${username}_$typeParam.$ext';
            } else {
              fileName = rawName;
            }
            final dataStr = decoded['data'] as String? ?? '';
            if (dataStr.contains('base64,')) {
              final base64Part = dataStr.split('base64,').last;
              fileBytes = base64.decode(base64Part);
            }
          } else if (rawTrimmed.startsWith('data:')) {
            final dataStr = rawTrimmed;
            final mimeMatch = RegExp(r'^data:([^;]+);').firstMatch(dataStr);
            if (mimeMatch != null) {
              contentType = mimeMatch.group(1) ?? 'application/pdf';
              final ext = contentType.split('/').last;
              fileName = '${username}_$typeParam.$ext';
            }
            if (dataStr.contains('base64,')) {
              final base64Part = dataStr.split('base64,').last;
              fileBytes = base64.decode(base64Part);
            }
          } else {
            fileName = rawVal;
            contentType = getContentTypeForFile(fileName);
          }
        } catch (_) {}

        if (fileBytes.isEmpty) {
          fileBytes = utf8.encode('Document content for $fileName ($typeParam of $username)');
        }

        final disposition = downloadParam ? 'attachment' : 'inline';
        request.response.statusCode = HttpStatus.ok;
        request.response.headers.set('Content-Type', contentType);
        request.response.headers.set('Content-Disposition', '$disposition; filename="$fileName"');
        request.response.headers.set('Access-Control-Allow-Origin', '*');
        request.response.add(fileBytes);
        await request.response.close();
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method not allowed',
        });
      }
      break;

    case '/api/export-database':
      if (request.method == 'GET') {
        final format = request.uri.queryParameters['format'] ?? 'excel';

        if (format == 'db' || format == 'sql') {
          final dbPath = getResolvedDbFilePath(dbName);
          final file = File(dbPath);
          if (file.existsSync()) {
            final bytes = file.readAsBytesSync();
            final ext = format == 'sql' ? 'sql' : 'db';
            final fileName = 'academy_database_backup.$ext';
            request.response.statusCode = HttpStatus.ok;
            request.response.headers.set('Content-Type', 'application/octet-stream');
            request.response.headers.set('Content-Disposition', 'attachment; filename="$fileName"');
            request.response.headers.set('Access-Control-Allow-Origin', '*');
            request.response.add(bytes);
            await request.response.close();
            return;
          }
        } else if (format == 'pdf') {
          final usersRes = db.select('''
            SELECT u.id, u.username, u.email, u.phone_number, u.status, u.cnic, u.created_at,
                   COALESCE((SELECT r.role_name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = u.id ORDER BY ur.role_id ASC LIMIT 1), 'User') as role_name
            FROM users u
            ORDER BY u.id ASC
          ''');

          final pdfBuffer = StringBuffer();
          pdfBuffer.writeln('%PDF-1.4');
          pdfBuffer.writeln('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
          pdfBuffer.writeln('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
          pdfBuffer.writeln('3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >> endobj');
          pdfBuffer.writeln('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');

          final textStream = StringBuffer();
          // Title Banner
          textStream.writeln('BT /F1 14 Tf 0.01 0.4 0.55 rg 25 755 Td (ACADEMIA PLATFORM - USER GOVERNANCE DIRECTORY) Tj ET');
          textStream.writeln('BT /F1 8 Tf 0.4 0.45 0.55 rg 25 742 Td (Export Date: ${DateTime.now().toIso8601String().substring(0, 10)}) Tj ET');

          // Table Header Background Fill & Border
          textStream.writeln('0.9 0.95 0.98 rg 25 715 562 20 re f');
          textStream.writeln('0.6 0.7 0.8 RG 0.8 w 25 715 562 20 re S');

          // Header Column Titles
          textStream.writeln('BT /F1 8 Tf 0 0 0 rg 30 722 Td (#) Tj ET');
          textStream.writeln('BT /F1 8 Tf 0 0 0 rg 58 722 Td (ID) Tj ET');
          textStream.writeln('BT /F1 8 Tf 0 0 0 rg 125 722 Td (NAME) Tj ET');
          textStream.writeln('BT /F1 8 Tf 0 0 0 rg 235 722 Td (CNIC) Tj ET');
          textStream.writeln('BT /F1 8 Tf 0 0 0 rg 325 722 Td (ROLE) Tj ET');
          textStream.writeln('BT /F1 8 Tf 0 0 0 rg 390 722 Td (EMAIL) Tj ET');
          textStream.writeln('BT /F1 8 Tf 0 0 0 rg 515 722 Td (STATUS) Tj ET');

          int currentY = 696;
          int idx = 1;
          for (final row in usersRes) {
            final uid = row['id'];
            final rName = row['role_name'] == 'Super Admin' ? 'Admin' : (row['role_name'] ?? 'User');
            final prefix = rName == 'Admin' ? 'ADM' : (rName == 'Teacher' ? 'STF' : 'STU');
            final displayId = '$prefix-$uid';

            final uname = (row['username'] ?? '').toString();
            final nameStr = uname.length > 20 ? '${uname.substring(0, 18)}..' : uname;
            final cnicRaw = (row['cnic'] ?? 'N/A').toString();
            final cnicStr = cnicRaw.isEmpty ? 'N/A' : cnicRaw;
            final emailRaw = (row['email'] ?? '').toString();
            final emailStr = emailRaw.length > 24 ? '${emailRaw.substring(0, 22)}..' : emailRaw;
            final statusStr = (row['status'] ?? 'registered') == 'registered' ? 'Registered' : 'Not Registered';

            // Alternating Row Fills & Cell Borders
            if (idx % 2 == 0) {
              textStream.writeln('0.97 0.98 0.99 rg 25 $currentY 562 19 re f');
            }
            textStream.writeln('0.85 0.9 0.93 RG 0.5 w 25 $currentY 562 19 re S');

            final textY = currentY + 6;
            textStream.writeln('BT /F1 8 Tf 0.1 0.1 0.1 rg 30 $textY Td ($idx) Tj ET');
            textStream.writeln('BT /F1 8 Tf 0.1 0.1 0.1 rg 58 $textY Td (${displayId.replaceAll("(", "[").replaceAll(")", "]")}) Tj ET');
            textStream.writeln('BT /F1 8 Tf 0.1 0.1 0.1 rg 125 $textY Td (${nameStr.replaceAll("(", "[").replaceAll(")", "]")}) Tj ET');
            textStream.writeln('BT /F1 8 Tf 0.1 0.1 0.1 rg 235 $textY Td (${cnicStr.replaceAll("(", "[").replaceAll(")", "]")}) Tj ET');
            textStream.writeln('BT /F1 8 Tf 0.1 0.1 0.1 rg 325 $textY Td (${rName.replaceAll("(", "[").replaceAll(")", "]")}) Tj ET');
            textStream.writeln('BT /F1 8 Tf 0.1 0.1 0.1 rg 390 $textY Td (${emailStr.replaceAll("(", "[").replaceAll(")", "]")}) Tj ET');
            textStream.writeln('BT /F1 8 Tf 0.1 0.1 0.1 rg 515 $textY Td ($statusStr) Tj ET');

            currentY -= 19;
            idx++;
            if (currentY < 40) break;
          }

          // Draw Table Column Vertical Grid Lines
          textStream.writeln('0.75 0.82 0.88 RG 0.5 w');
          textStream.writeln('52 735 m 52 ${currentY + 19} l S');
          textStream.writeln('118 735 m 118 ${currentY + 19} l S');
          textStream.writeln('228 735 m 228 ${currentY + 19} l S');
          textStream.writeln('318 735 m 318 ${currentY + 19} l S');
          textStream.writeln('382 735 m 382 ${currentY + 19} l S');
          textStream.writeln('508 735 m 508 ${currentY + 19} l S');

          final textBytes = utf8.encode(textStream.toString());
          pdfBuffer.writeln('5 0 obj << /Length ${textBytes.length} >> stream');
          pdfBuffer.write(textStream.toString());
          pdfBuffer.writeln('endstream endobj');
          pdfBuffer.writeln('xref 0 6');
          pdfBuffer.writeln('trailer << /Size 6 /Root 1 0 R >>');
          pdfBuffer.writeln('startxref 0 %%EOF');

          final bytes = utf8.encode(pdfBuffer.toString());
          request.response.statusCode = HttpStatus.ok;
          request.response.headers.set('Content-Type', 'application/pdf');
          request.response.headers.set('Content-Disposition', 'attachment; filename="user_governance_directory.pdf"');
          request.response.headers.set('Access-Control-Allow-Origin', '*');
          request.response.add(bytes);
          await request.response.close();
          return;
        }

        // Default: Excel / CSV format (Datagrid Table Only with Role & Headers)
        final usersRes = db.select('''
          SELECT u.id, u.username, u.email, u.phone_number, u.status, u.cnic, u.created_at,
                 COALESCE((SELECT r.role_name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = u.id ORDER BY ur.role_id ASC LIMIT 1), 'User') as role_name
          FROM users u
          ORDER BY u.id ASC
        ''');

        final csvBuffer = StringBuffer();
        csvBuffer.write('\uFEFF'); // UTF-8 Byte Order Mark for Excel
        csvBuffer.writeln('#,ID,Name,CNIC,Role,Email,Phone,Status');
        int idx = 1;
        for (final row in usersRes) {
          final uid = row['id'];
          final rName = row['role_name'] == 'Super Admin' ? 'Admin' : (row['role_name'] ?? 'User');
          final prefix = rName == 'Admin' ? 'ADM' : (rName == 'Teacher' ? 'STF' : 'STU');
          final displayId = '$prefix-$uid';
          final cnicVal = (row['cnic'] ?? '').toString().trim().isEmpty ? 'N/A' : row['cnic'];
          final statusVal = (row['status'] ?? 'registered') == 'registered' ? 'Registered' : 'Not Registered';

          csvBuffer.writeln('$idx,"$displayId","${row['username']}","$cnicVal","$rName","${row['email'] ?? ''}","${row['phone_number'] ?? ''}","$statusVal"');
          idx++;
        }

        final bytes = utf8.encode(csvBuffer.toString());
        final fileName = format == 'xlsx' ? 'user_governance_directory.csv' : 'user_governance_directory.csv';
        final contentType = 'text/csv; charset=utf-8';

        request.response.statusCode = HttpStatus.ok;
        request.response.headers.set('Content-Type', contentType);
        request.response.headers.set('Content-Disposition', 'attachment; filename="$fileName"');
        request.response.headers.set('Access-Control-Allow-Origin', '*');
        request.response.add(bytes);
        await request.response.close();
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method not allowed',
        });
      }
      break;



    case '/api/public-onboard':
      if (request.method == 'POST') {
        final body = await parseJsonBody(request);
        final username = (body['username'] as String? ?? '').trim();
        final password = (body['password'] as String? ?? '').trim();
        final email = (body['email'] as String? ?? '').trim();
        final phoneNumber = (body['phoneNumber'] as String? ?? '').trim();
        final cnic = (body['cnic'] as String? ?? '').trim();
        final roleId = body['roleId'] is int ? body['roleId'] as int : int.tryParse(body['roleId']?.toString() ?? '') ?? 3;
        final cvFile = body['cvFile'] as String? ?? '';
        final degreeFile = body['degreeFile'] as String? ?? '';
        final certificateFile = body['certificateFile'] as String? ?? '';
        final qualificationGrade = body['qualificationGrade'] as String? ?? body['qualification_grade'] as String? ?? '';
        final certifications = body['certifications'] as String? ?? '';

        if (username.isEmpty || password.isEmpty) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'Username and password are required.',
          });
          return;
        }

        final existing = db.select('SELECT id FROM users WHERE username = ?;', [username]);
        if (existing.isNotEmpty) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'Username "$username" is already taken. Please choose another username.',
          });
          return;
        }

        final hashedPassword = hashPassword(password);
        db.execute(
          'INSERT INTO users (username, password_hash, email, phone_number, status, cnic, qualification_grade, certifications, cv_file, degree_file, certificate_file) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [username, hashedPassword, email, phoneNumber, 'pending', cnic, qualificationGrade, certifications, cvFile, degreeFile, certificateFile],
        );

        final lastIdRes = db.select('SELECT last_insert_rowid() as id;');
        final newUserId = lastIdRes.first['id'] as int;

        // Assign requested role
        db.execute('INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES (?, ?);', [newUserId, roleId]);

        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'message': 'Onboarding application submitted successfully! Your account is now pending Admin review.',
          'userId': newUserId,
        });
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {'success': false, 'error': 'Method not allowed'});
      }
      break;

    case '/api/onboard-status':
      if (request.method == 'GET') {
        final identifier = (request.uri.queryParameters['identifier'] ?? '').trim().toLowerCase();
        if (identifier.isEmpty) {
          await sendJsonResponse(request, HttpStatus.badRequest, {'success': false, 'error': 'CNIC or Email identifier is required.'});
          return;
        }

        final results = db.select(
          'SELECT u.id, u.username, u.email, u.phone_number, u.status, u.cnic, u.review_notes, u.cv_file, u.degree_file, u.certificate_file, '
          'COALESCE((SELECT r.role_name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = u.id ORDER BY ur.role_id ASC LIMIT 1), "User") as role_name '
          'FROM users u WHERE LOWER(u.cnic) = ? OR LOWER(u.email) = ? OR LOWER(u.username) = ?;',
          [identifier, identifier, identifier],
        );

        if (results.isEmpty) {
          await sendJsonResponse(request, HttpStatus.notFound, {
            'success': false,
            'error': 'No onboarding application found for "$identifier". Please verify your CNIC, Email, or Username.',
          });
          return;
        }

        final row = results.first;
        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'application': {
            'userId': row['id'],
            'username': row['username'],
            'email': row['email'],
            'phoneNumber': row['phone_number'],
            'status': row['status'] ?? 'pending',
            'cnic': row['cnic'] ?? 'N/A',
            'reviewNotes': row['review_notes'] ?? '',
            'roleName': row['role_name'] == 'Super Admin' ? 'Admin' : (row['role_name'] ?? 'User'),
            'cvFile': row['cv_file'] ?? '',
            'degreeFile': row['degree_file'] ?? '',
            'certificateFile': row['certificate_file'] ?? '',
          },
        });
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {'success': false, 'error': 'Method not allowed'});
      }
      break;



    case '/api/approve-onboard':
      if (request.method == 'POST') {
        final body = await parseJsonBody(request);
        final userId = body['userId'] is int ? body['userId'] as int : int.tryParse(body['userId']?.toString() ?? '') ?? 0;
        final adminToken = body['adminToken'] as String?;

        if (!isSuperAdminAuthorized(db, adminToken: adminToken)) {
          await sendJsonResponse(request, HttpStatus.unauthorized, {'success': false, 'error': 'Super Admin authorization required.'});
          return;
        }

        db.execute('UPDATE users SET status = "registered", review_notes = "" WHERE id = ?;', [userId]);

        // Auto-assign default permissions based on role
        final userRoles = getUserRoles(db, userId);
        String defaultPermissions = '';
        if (userRoles.contains('Teacher')) {
          defaultPermissions = jsonEncode(['view:classes', 'manage:grades', 'mark:attendance', 'student:feedback']);
        } else if (userRoles.contains('Student')) {
          defaultPermissions = jsonEncode(['view:courses', 'view:grades', 'view:attendance']);
        } else if (userRoles.contains('Parent')) {
          defaultPermissions = jsonEncode(['view:child_grades', 'view:child_attendance', 'pay:fees']);
        }
        if (defaultPermissions.isNotEmpty) {
          db.execute('UPDATE users SET permissions_json = ? WHERE id = ?;', [defaultPermissions, userId]);
        }

        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'message': 'User approved and registered successfully!',
        });
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {'success': false, 'error': 'Method not allowed'});
      }
      break;



    case '/api/login':
      if (request.method == 'POST') {
        final body = await parseJsonBody(request);
        final username = (body['username'] as String? ?? '').trim();
        final password = (body['password'] as String? ?? '').trim();
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

        // Check if user exists in database by username or User ID (e.g. STF-24180, 24180, STU-10, 10, or username)
        final digitsOnly = username.replaceAll(RegExp(r'\D'), '');
        final parsedId = digitsOnly.isNotEmpty ? int.tryParse(digitsOnly) : null;

        final ResultSet userExistsCheck;
        if (parsedId != null) {
          userExistsCheck = db.select('SELECT id, status, review_notes FROM users WHERE username = ? OR id = ? OR ((id * 2345 + 1000) % 90000 + 10000) = ?;', [username, parsedId, parsedId]);
        } else {
          userExistsCheck = db.select('SELECT id, status, review_notes FROM users WHERE username = ?;', [username]);
        }

        if (userExistsCheck.isEmpty) {
          await sendJsonResponse(request, HttpStatus.unauthorized, {
            'success': false,
            'error': 'User not registered',
          });
          return;
        }

        final uStatus = (userExistsCheck.first['status'] as String? ?? 'registered').toLowerCase();
        if (uStatus == 'pending' || uStatus == 'unregistered') {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'User not registered (Pending Admin approval).',
          });
          return;
        }

        final userSession = loginUser(db, username, password);
        if (userSession != null) {
          loginThrottle.recordSuccessfulLogin(clientIp, username);
          loginThrottle.recordSuccessfulLogin(clientIp, userSession.username);
          final loginData = getLoginDataForUser(db, userSession);
          final loginUserObj = loginData['user'] as Map<String, Object?>? ?? {};
          await sendJsonResponse(request, HttpStatus.ok, {
            'success': true,
            'message': 'Login successful',
            'session': {
              'userId': userSession.userId,
              'username': userSession.username,
              'roles': userSession.roles,
              'authToken': userSession.authToken,
              'permissionsJson': loginUserObj['permissionsJson'] ?? '',
              'accessGrade': loginUserObj['accessGrade'] ?? '',
              'accessSubject': loginUserObj['accessSubject'] ?? '',
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

    case '/api/roles':
      if (request.method == 'GET') {
        final results = db.select('SELECT id, role_name FROM roles ORDER BY id ASC');
        final rolesList = results.map((row) => {
          'id': row['id'] as int,
          'roleName': row['role_name'] as String,
        }).toList();
        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'roles': rolesList,
        });
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    case '/api/permissions':
      if (request.method == 'GET') {
        final results = db.select('SELECT id, permission_key, module, action, description FROM permissions ORDER BY id ASC');
        final permissionsList = results.map((row) => {
          'id': row['id'] as int,
          'permissionKey': row['permission_key'] as String,
          'module': row['module'] as String,
          'action': row['action'] as String,
          'description': row['description'] as String? ?? '',
        }).toList();
        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'permissions': permissionsList,
        });
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

        if (res['success'] == true && res['user'] != null) {
          try {
            final userMap = res['user'] as Map<String, dynamic>;
            final createdUserId = userMap['id'] as int?;
            if (createdUserId != null) {
              final invToken = generateInvitationToken(db, createdUserId);
              res['invitationToken'] = invToken;
              res['invitationUrl'] = '/onboard/activate?token=$invToken';
            }
          } catch (_) {}
        }

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

    case '/api/invitations/generate':
      if (request.method == 'POST') {
        if (session == null || !session.isSuperAdmin) {
          await sendJsonResponse(request, HttpStatus.unauthorized, {
            'success': false,
            'error': 'Super Admin authorization required to generate invitation links.',
          });
          break;
        }
        final body = await parseJsonBody(request);
        final targetUserId = parsePositiveInt(body['userId']?.toString());
        if (targetUserId == null) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'User ID is required.',
          });
          break;
        }
        try {
          final invToken = generateInvitationToken(db, targetUserId);
          await sendJsonResponse(request, HttpStatus.ok, {
            'success': true,
            'invitationToken': invToken,
            'invitationUrl': '/onboard/activate?token=$invToken',
          });
        } catch (e) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
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

    case '/api/invitations/verify':
      if (request.method == 'GET') {
        final invToken = request.uri.queryParameters['token'] ?? '';
        final verification = verifyInvitationToken(db, invToken);
        final statusCode = verification['valid'] == true ? HttpStatus.ok : HttpStatus.badRequest;
        await sendJsonResponse(request, statusCode, verification);
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    case '/api/invitations/complete':
      if (request.method == 'POST') {
        final body = await parseJsonBody(request);
        final invToken = body['token'] as String? ?? '';
        final password = body['password'] as String? ?? '';

        try {
          final userSession = completeInvitationActivation(db, invToken, password);
          await sendJsonResponse(request, HttpStatus.ok, {
            'success': true,
            'message': 'Account activated successfully!',
            'token': userSession.authToken,
            'user': {
              'id': userSession.userId,
              'username': userSession.username,
              'roles': userSession.roles,
            },
          });
        } catch (e) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
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

    case '/api/invitations/send-email':
      if (request.method == 'POST') {
        final body = await parseJsonBody(request);
        final recipientEmail = (body['email'] as String? ?? '').trim();
        final recipientName = (body['name'] as String? ?? 'User').trim();
        final role = (body['role'] as String? ?? 'User').trim();
        final activationUrl = (body['activationUrl'] as String? ?? '').trim();

        if (recipientEmail.isEmpty || activationUrl.isEmpty) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'Email address and activation URL are required.',
          });
          break;
        }

        try {
          await EmailService.sendActivationEmail(
            recipientEmail: recipientEmail,
            recipientName: recipientName,
            role: role,
            activationUrl: activationUrl,
          );

          await sendJsonResponse(request, HttpStatus.ok, {
            'success': true,
            'message': 'Activation email sent silently in the background!',
          });
        } catch (e) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'Failed to send background email: $e',
          });
        }
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    case '/api/users':
      if (request.method == 'GET') {
        if (session == null) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'Unauthorized. Please log in.',
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
            'status': row['status'] as String? ?? 'pending_activation',
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
        final cnic = body['cnic'] as String?;
        final qualificationGrade = body['qualificationGrade'] as String? ?? body['qualification_grade'] as String?;
        final certifications = body['certifications'] as String?;
        final cvFile = body['cvFile'] as String? ?? body['cv_file'] as String?;
        final degreeFile = body['degreeFile'] as String? ?? body['degree_file'] as String?;
        final certificateFile = body['certificateFile'] as String? ?? body['certificate_file'] as String?;
        final accessGrade = body['accessGrade'] as String? ?? body['access_grade'] as String?;
        final accessSubject = body['accessSubject'] as String? ?? body['access_subject'] as String?;
        final permissionsJson = body['permissionsJson'] as String? ?? body['permissions_json'] as String?;

        final res = updateUser(
          db,
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

    case '/api/lectures':
      if (request.method == 'GET') {
        if (session == null) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'Unauthorized. Please log in.',
          });
          return;
        }

        final teacherIdParam = parsePositiveInt(request.uri.queryParameters['teacherId'] ?? request.uri.queryParameters['teacher_id']);
        final studentIdParam = parsePositiveInt(request.uri.queryParameters['studentId'] ?? request.uri.queryParameters['student_id']);

        final lectures = LectureService.getLectures(
          db,
          teacherId: teacherIdParam,
          studentId: studentIdParam,
        );

        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'lectures': lectures,
        });
      } else if (request.method == 'POST') {
        if (session == null) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'Unauthorized. Please log in.',
          });
          return;
        }

        final body = await parseJsonBody(request);
        final title = body['title']?.toString() ?? '';
        final subject = body['subject']?.toString() ?? '';
        final description = body['description']?.toString();
        final teacherId = parsePositiveInt(body['teacherId']?.toString() ?? body['teacher_id']?.toString());
        
        List<int>? studentIds;
        final rawStudentIds = body['studentIds'] ?? body['student_ids'];
        if (rawStudentIds is List) {
          studentIds = rawStudentIds.map((e) => parsePositiveInt(e.toString())).whereType<int>().toList();
        }

        if (teacherId == null) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'Valid teacherId is required',
          });
          return;
        }

        final result = LectureService.createLecture(
          db,
          title: title,
          subject: subject,
          description: description,
          teacherId: teacherId,
          studentIds: studentIds,
        );

        final statusCode = result['success'] == true ? HttpStatus.ok : HttpStatus.badRequest;
        await sendJsonResponse(request, statusCode, result);
      } else if (request.method == 'PUT') {
        if (session == null) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'Unauthorized. Please log in.',
          });
          return;
        }

        final body = await parseJsonBody(request);
        final lectureId = parsePositiveInt(body['id']?.toString() ?? body['lectureId']?.toString());
        if (lectureId == null) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'Valid lecture id is required',
          });
          return;
        }

        final title = body['title']?.toString();
        final subject = body['subject']?.toString();
        final description = body['description']?.toString();
        final teacherId = parsePositiveInt(body['teacherId']?.toString() ?? body['teacher_id']?.toString());

        List<int>? studentIds;
        final rawStudentIds = body['studentIds'] ?? body['student_ids'];
        if (rawStudentIds is List) {
          studentIds = rawStudentIds.map((e) => parsePositiveInt(e.toString())).whereType<int>().toList();
        }

        final result = LectureService.updateLecture(
          db,
          lectureId,
          title: title,
          subject: subject,
          description: description,
          teacherId: teacherId,
          studentIds: studentIds,
        );

        final statusCode = result['success'] == true ? HttpStatus.ok : HttpStatus.badRequest;
        await sendJsonResponse(request, statusCode, result);
      } else if (request.method == 'DELETE') {
        if (session == null) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'Unauthorized. Please log in.',
          });
          return;
        }

        final idParam = request.uri.queryParameters['id'] ?? request.uri.queryParameters['lectureId'];
        final body = (idParam == null || idParam.isEmpty) ? await parseJsonBody(request) : <String, Object?>{};
        final lectureId = parsePositiveInt(idParam) ?? parsePositiveInt(body['id']?.toString() ?? body['lectureId']?.toString());

        if (lectureId == null) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'Valid lecture id is required',
          });
          return;
        }

        final result = LectureService.deleteLecture(db, lectureId);
        final statusCode = result['success'] == true ? HttpStatus.ok : HttpStatus.badRequest;
        await sendJsonResponse(request, statusCode, result);
      } else {
        await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
          'success': false,
          'error': 'Method ${request.method} not allowed for $path',
        });
      }
      break;

    case '/api/lectures/detail':
      if (request.method == 'GET') {
        if (session == null) {
          await sendJsonResponse(request, HttpStatus.forbidden, {
            'success': false,
            'error': 'Unauthorized. Please log in.',
          });
          return;
        }

        final lectureId = parsePositiveInt(request.uri.queryParameters['id'] ?? request.uri.queryParameters['lectureId']);
        if (lectureId == null) {
          await sendJsonResponse(request, HttpStatus.badRequest, {
            'success': false,
            'error': 'Valid lecture id query parameter is required',
          });
          return;
        }

        final lecture = LectureService.getLectureById(db, lectureId);
        if (lecture == null) {
          await sendJsonResponse(request, HttpStatus.notFound, {
            'success': false,
            'error': 'Lecture not found',
          });
          return;
        }

        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'lecture': lecture,
        });
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
