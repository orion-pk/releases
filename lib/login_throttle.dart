class AttemptRecord {
  final List<DateTime> failedTimestamps = [];
  DateTime? lockedUntil;
}

/// Manages brute-force protection and login rate limiting keyed on (clientIp, username).
class LoginThrottle {
  final int maxAttempts;
  final Duration windowDuration;
  final Duration lockoutDuration;
  final int maxCapacity;
  final DateTime Function() _clock;

  final Map<String, AttemptRecord> _records = {};

  LoginThrottle({
    this.maxAttempts = 5,
    this.windowDuration = const Duration(minutes: 15),
    this.lockoutDuration = const Duration(minutes: 15),
    this.maxCapacity = 10000,
    DateTime Function()? clock,
  }) : _clock = clock ?? DateTime.now;

  String _buildKey(String clientIp, String username) {
    return '${clientIp.trim()}:${username.trim().toLowerCase()}';
  }

  /// Cleans up stale records whose lockouts have expired and have no recent attempts.
  void _cleanupStaleRecords(DateTime now) {
    final cutoff = now.subtract(windowDuration);
    _records.removeWhere((key, record) {
      record.failedTimestamps.removeWhere((ts) => ts.isBefore(cutoff));
      final isLocked = record.lockedUntil != null && now.isBefore(record.lockedUntil!);
      if (!isLocked) {
        record.lockedUntil = null;
      }
      return record.failedTimestamps.isEmpty && !isLocked;
    });

    if (_records.length > maxCapacity) {
      final keysToRemove = <String>[];
      for (final entry in _records.entries) {
        final isLocked = entry.value.lockedUntil != null && now.isBefore(entry.value.lockedUntil!);
        if (!isLocked) {
          keysToRemove.add(entry.key);
          if (_records.length - keysToRemove.length <= maxCapacity) break;
        }
      }
      for (final k in keysToRemove) {
        _records.remove(k);
      }
    }
  }

  /// Returns true if the (clientIp, username) combination is currently locked out.
  bool isLockedOut(String clientIp, String username) {
    final key = _buildKey(clientIp, username);
    final record = _records[key];
    if (record == null) return false;

    final now = _clock();
    if (record.lockedUntil != null) {
      if (now.isBefore(record.lockedUntil!)) {
        return true;
      } else {
        // Lockout expired
        record.lockedUntil = null;
        record.failedTimestamps.clear();
        _records.remove(key);
        return false;
      }
    }
    return false;
  }

  /// Returns the remaining lockout duration in seconds, or 0 if not locked out.
  int getRemainingLockoutSeconds(String clientIp, String username) {
    final key = _buildKey(clientIp, username);
    final record = _records[key];
    if (record == null || record.lockedUntil == null) return 0;

    final now = _clock();
    final remaining = record.lockedUntil!.difference(now).inSeconds;
    return remaining > 0 ? remaining : 0;
  }

  /// Records a failed login attempt. Returns true if this attempt triggered a new lockout.
  bool recordFailedAttempt(String clientIp, String username) {
    final now = _clock();
    _cleanupStaleRecords(now);

    final key = _buildKey(clientIp, username);
    final record = _records.putIfAbsent(key, () => AttemptRecord());

    // Clean up timestamps outside the window
    final cutoff = now.subtract(windowDuration);
    record.failedTimestamps.removeWhere((ts) => ts.isBefore(cutoff));

    record.failedTimestamps.add(now);

    if (record.failedTimestamps.length >= maxAttempts) {
      record.lockedUntil = now.add(lockoutDuration);
      return true;
    }
    return false;
  }

  /// Resets the failed attempt record upon a successful login.
  void recordSuccessfulLogin(String clientIp, String username) {
    final key = _buildKey(clientIp, username);
    _records.remove(key);
  }

  /// Clears all stored records (useful for testing or admin resets).
  void reset() {
    _records.clear();
  }
}
