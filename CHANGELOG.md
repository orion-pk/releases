# Changelog

All notable changes to the Academy platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-08-10

### 🔒 Security, Integrity & Robustness Enhancements
- **HTTP 405 Method Not Allowed Handling:** Updated REST router in `bin/server.dart` to return `405 Method Not Allowed` for unhandled API methods across all endpoints (`Fixes #22`).
- **Graceful Error & Type Parsing:** Wrapped `jsonDecode` with try-catch and added explicit `FormatException` / `TypeError` handlers returning `400 Bad Request` instead of unhandled 500 errors (`Fixes #23`).
- **Proxy IP Spoofing Prevention:** Updated `getClientIp` to strictly require `ACADEMY_TRUST_PROXY=1` environment configuration to parse untrusted `X-Forwarded-For` headers (`Fixes #24`).
- **LoginThrottle Memory Leak Guard:** Added automatic stale record cleanup (`_cleanupStaleRecords`) and `maxCapacity = 10000` eviction limits to `LoginThrottle` (`Fixes #25`).
- **Mandatory Parent User ID Validation:** Enforced required `parentUserId` parameter validation in `/api/transaction-register` without silent default fallback (`Fixes #26`).
- **Deleted Account Token Invalidation:** Added instant user existence check in SQLite database during JWT verification (`verifyAuthToken`) to invalidate active tokens of deleted accounts (`Fixes #27`).
- **Constant-Time Password Comparison:** Implemented constant-time string comparison (`_constantTimeEquals`) in legacy SHA-256 password hash verification to eliminate timing side-channel leaks (`Fixes #28`).

### 🧪 Integration Testing Architecture
- **Medicare-Architecture Integration Suite:** Created dedicated role-based integration test suite under `integration_test/` with `all_test.dart` master runner, `test_helper.dart`, and role-specific test suites for Super Admin, Teacher, Parent, and Student modules.

---

## [0.0.1] - 2026-05-06

### Initial Pre-Release
- Initial pre-release of the Academy Dart Backend Service and React/Vite Frontend Interface.
- Support for JWT authentication, SQLite storage, and Role-Based Access Control (RBAC).
