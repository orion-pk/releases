import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandConfig } from '../config/BrandConfig';
import { VersionBadge } from './VersionBadge';
import { LogOut, User, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const Navbar = ({ onToggleMobileMenu }) => {
  const { user, logout, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileClosing, setIsProfileClosing] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const profileRef = useRef(null);

  const roles = user?.roles || [];
  const isAdmin = isSuperAdmin || roles.includes('Admin') || roles.includes('Super Admin');

  // Dynamic Breadcrumb Title based on active route
  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/teacher')) return 'Teacher/Portal';
    if (path.startsWith('/student')) return 'Student/Portal';
    if (path.startsWith('/parent')) return 'Parent/Portal';
    if (path.startsWith('/admin/add-user')) return 'Admin/Add New User';
    if (path.startsWith('/admin/permissions-matrix')) return 'Admin/Role Permissions Matrix';
    if (path.startsWith('/admin/users')) return 'Admin/Users';
    if (path.startsWith('/admin')) return 'Admin/Governance';
    return 'Academia/Portal';
  };

  const handleCloseProfile = () => {
    setIsProfileClosing(true);
    setTimeout(() => {
      setIsProfileOpen(false);
      setIsProfileClosing(false);
    }, 240);
  };

  const toggleProfile = () => {
    if (isProfileOpen) {
      handleCloseProfile();
    } else {
      setIsProfileOpen(true);
      setIsProfileClosing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Ignore clicks on/inside the version update modal portal
      if (e.target && e.target.closest && e.target.closest('.version-update-modal-portal')) {
        return;
      }

      if (profileRef.current && !profileRef.current.contains(e.target)) {
        if (isProfileOpen && !isProfileClosing) {
          handleCloseProfile();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen, isProfileClosing]);

  return (
    <header
      style={{
        background: BrandConfig.navbarBg,
        border: '1px solid #cbd5e1',
        borderRadius: '0.75rem',
        margin: '0.25rem 1.75rem 0.5rem 0.5rem',
        padding: '0.5rem 1.15rem',
        position: 'sticky',
        top: '0.25rem',
        zIndex: 90,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Left Side: Mobile Menu Toggle + Breadcrumb Title ("Admin/Users") */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            className="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            title="Toggle Menu"
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '0.4rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb Title (e.g. Admin/Users) */}
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#0f172a',
              margin: 0,
              fontFamily: BrandConfig.fontFamily,
            }}
          >
            {getBreadcrumbTitle()}
          </h2>
        </div>

        {/* Right Side: Profile Icon Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {user && (
            <div className="profile-dropdown-wrapper" ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={toggleProfile}
                title="User Profile Menu"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    position: 'relative',
                  }}
                >
                  <User size={18} />
                  {hasUpdate && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%',
                        border: '2px solid #ffffff',
                        boxShadow: '0 0 6px #ef4444',
                      }}
                    />
                  )}
                </div>
              </button>

              {isProfileOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '2.5rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    padding: '0.65rem 0.75rem',
                    minWidth: '180px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ paddingBottom: '0.4rem', borderBottom: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{user.username}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{user.roles?.join(', ') || 'User'}</div>
                  </div>

                  {/* Version Badge under username */}
                  <div>
                    <VersionBadge position="inline" onUpdateStatusChange={setHasUpdate} />
                  </div>

                  {/* Permissions Matrix Button under Version control (Visible ONLY for Admin / Super Admin) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseProfile();
                        navigate('/admin/permissions-matrix');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        color: '#0f172a',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontWeight: 600,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center',
                      }}
                    >
                      <span>Permissions Matrix</span>
                    </button>
                  )}

                  {/* Sign out button underneath */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseProfile();
                      logout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      background: '#ffe4e6',
                      border: 'none',
                      color: '#9f1239',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontWeight: 600,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
