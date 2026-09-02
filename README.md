# Academy - Backend & System Architecture

A Dart backend service backed by SQLite, delivering secure authentication, password hashing, and role-based authorization for system governance.

---

## 🧪 Testing Suite

Academy includes unit tests and a dedicated integration testing suite.

```bash
# Run unit tests
dart test

# Run Master Integration Test Suite
dart test integration_test/all_test.dart
```

---

## 🚀 Getting Started

Academy consists of a Dart backend service communicating with an SQLite database and a React/Vite frontend interface. Follow the instructions below to initialize and run the platform locally.

### 1. Backend Setup (Dart)
Ensure Dart SDK (v3.0+) is installed. Install backend dependencies and run the server:

```bash
# Fetch Dart dependencies
dart pub get

# Run backend dev server
dart run bin/server.dart
```

### 2. Frontend Setup (React + Vite)
Navigate to the frontend application directory and install npm packages:

```bash
# Navigate to application workspace
cd academy

# Install packages
npm install

# Start Vite development server
npm run dev
```

---

## 🛠 Tech Stack & System Architecture

The architecture is designed around centralized authorization enforcement in the Dart backend layer, securing all database interactions with SQLite.

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Backend Service** | Dart SDK | Handles HTTP requests, JWT verification, RBAC permissions, and business logic. |
| **Database** | SQLite | Relational file storage providing persistence, password hashing, and atomic queries. |
| **Frontend App** | React 19, Vite, Vanilla CSS | Single Page Application delivering responsive Super Admin governance dashboard views. |
| **Security** | JWT + BCrypt | Token-based authorization with granular permission checks on every route. |

---

## 📡 REST API Reference

Endpoints require JWT authorization sent via `Authorization: Bearer <token>` header unless designated as Public.

| Method | Endpoint | Required Role / Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | Authenticates credentials and issues HS256 JWT session token for Super Admin. |
| `GET` | `/api/login-data` | Super Admin | Re-validates user session and returns system stats and permissions. |
| `POST` | `/api/register` | Super Admin | Registers new user account with initial credentials. |
| `GET` | `/api/users` | Super Admin | Retrieves global system user list with assigned roles. |
| `DELETE` | `/api/users` | Super Admin | Deletes user account with cascade cleanup of associated records. |
| `POST` | `/api/assign-role` | Super Admin | Assigns role (Super Admin, Parent) to specified user. |
| `POST` | `/api/assign-direct-permission` | Super Admin | Grants direct custom permission key to specified user. |

---

## 🗄 Database Schema

SQLite relational table definitions powering the Academy backend (`lib/database.dart`).

### Active Implemented Tables
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  status TEXT DEFAULT 'registered',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
  id INTEGER PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE
);

CREATE TABLE permissions (
  id INTEGER PRIMARY KEY,
  permission_key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  sub_module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT
);

CREATE TABLE user_roles (
  user_id INTEGER,
  role_id INTEGER,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE role_permissions (
  role_id INTEGER,
  permission_id INTEGER,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE user_permissions (
  user_id INTEGER,
  permission_id INTEGER,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```
