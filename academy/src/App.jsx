import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { RoleGuard } from './components/RoleGuard';

// Auth Module
import { LoginPage } from './modules/auth/pages/LoginPage';

// Admin Module
import { AdminDashboard } from './modules/admin/pages/AdminDashboard';
import { UserRoleManager } from './modules/admin/pages/UserRoleManager';
import { AddUserPage } from './modules/admin/pages/AddUserPage';

// User Role Modules
import { TeacherDashboard } from './modules/teacher/pages/TeacherDashboard';
import { StudentPortal } from './modules/student/pages/StudentPortal';
import { ParentPortal } from './modules/parent/pages/ParentPortal';

const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        Loading Academia Session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar isMobileOpen={isMobileOpen} closeMobile={() => setIsMobileOpen(false)} />
      <div className="main-content">
        <Navbar onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)} />
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
};

const DefaultRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const roles = user.roles || [];
  if (roles.includes('Super Admin') || roles.includes('Admin')) return <Navigate to="/admin" replace />;
  if (roles.includes('Teacher')) return <Navigate to="/teacher" replace />;
  if (roles.includes('Student')) return <Navigate to="/student" replace />;
  if (roles.includes('Parent')) return <Navigate to="/parent" replace />;
  return <Navigate to="/admin" replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Default Landing Page */}
            <Route path="/" element={<DefaultRedirect />} />

            {/* Admin Module Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedLayout>
                  <RoleGuard allowedRoles={['Super Admin', 'Admin']}>
                    <AdminDashboard />
                  </RoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/users-roles"
              element={
                <ProtectedLayout>
                  <RoleGuard allowedRoles={['Super Admin', 'Admin']}>
                    <UserRoleManager />
                  </RoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/add-user"
              element={
                <ProtectedLayout>
                  <RoleGuard allowedRoles={['Super Admin', 'Admin']}>
                    <AddUserPage />
                  </RoleGuard>
                </ProtectedLayout>
              }
            />

            {/* Teacher Module Route */}
            <Route
              path="/teacher"
              element={
                <ProtectedLayout>
                  <RoleGuard allowedRoles={['Super Admin', 'Teacher']}>
                    <TeacherDashboard />
                  </RoleGuard>
                </ProtectedLayout>
              }
            />

            {/* Student Module Route */}
            <Route
              path="/student"
              element={
                <ProtectedLayout>
                  <RoleGuard allowedRoles={['Super Admin', 'Student']}>
                    <StudentPortal />
                  </RoleGuard>
                </ProtectedLayout>
              }
            />

            {/* Parent Module Route */}
            <Route
              path="/parent"
              element={
                <ProtectedLayout>
                  <RoleGuard allowedRoles={['Super Admin', 'Parent']}>
                    <ParentPortal />
                  </RoleGuard>
                </ProtectedLayout>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
