import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandConfig } from '../config/BrandConfig';
import {
  ShieldCheck,
  Users,
  UserPlus,
  X,
  GraduationCap,
  BookOpen,
  Heart,
} from 'lucide-react';

export const Sidebar = ({ isMobileOpen, closeMobile }) => {
  const { user, isSuperAdmin } = useAuth();

  const roles = user?.roles || [];
  const isAdmin = isSuperAdmin || roles.includes('Admin');
  const isTeacher = roles.includes('Teacher') && !isAdmin;
  const isStudent = roles.includes('Student') && !isAdmin;
  const isParent = roles.includes('Parent') && !isAdmin;

  // Admin sees admin pages
  // Each other role sees ONLY their own portal
  const navItems = isAdmin
    ? [
        { path: '/admin', label: 'Admin Governance', icon: ShieldCheck },
        { path: '/admin/users-roles', label: 'User & Role Manager', icon: Users },
        { path: '/admin/add-user', label: 'Add New User', icon: UserPlus },
      ]
    : isTeacher
    ? [{ path: '/teacher', label: 'Teacher Portal', icon: GraduationCap }]
    : isStudent
    ? [{ path: '/student', label: 'Student Portal', icon: BookOpen }]
    : isParent
    ? [{ path: '/parent', label: 'Parent Portal', icon: Heart }]
    : [];

  return (
    <>
      {isMobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          position: 'sticky',
          top: 0,
          zIndex: 95,
          margin: '0.25rem 0.25rem 0.5rem 0.25rem',
        }}
      >
        {/* OUTSIDE LOGO HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            padding: '0.5rem 0.65rem',
            marginBottom: '0.25rem',
          }}
        >
          <img
            src={BrandConfig.brandLogo}
            alt="Logo"
            style={{
              height: '44px',
              width: 'auto',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />

          {isMobileOpen && (
            <button
              onClick={closeMobile}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* SIDEBAR CONTAINER */}
        <aside
          className={`sidebar-container ${isMobileOpen ? 'mobile-open' : ''} collapsed`}
          style={{
            width: '64px',
            minWidth: '64px',
            background: BrandConfig.sidebarBg,
            color: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '0.75rem 0.35rem',
            height: 'calc(100vh - 11rem)',
            maxHeight: 'calc(100vh - 11rem)',
            borderRadius: '0.75rem',
            border: '1px solid #cbd5e1',
            overflowY: 'auto',
          }}
        >
          {/* Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={closeMobile}
                  title={item.label}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.65rem',
                    justifyContent: 'center',
                    borderRadius: '0.5rem',
                    color: isActive ? '#ffffff' : '#0f172a',
                    background: isActive ? '#000000' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                  })}
                >
                  <Icon size={20} style={{ flexShrink: 0 }} />
                </NavLink>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
};
