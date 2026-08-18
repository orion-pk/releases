import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, fetchLoginDataApi } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('academy_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('academy_token'));
  const [loginData, setLoginData] = useState(() => {
    const saved = localStorage.getItem('academy_login_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const justLoggedIn = React.useRef(false);

  const refreshLoginData = async () => {
    if (!token) return;
    try {
      const res = await fetchLoginDataApi();
      if (res.success && res.loginData) {
        setLoginData(res.loginData);
        localStorage.setItem('academy_login_data', JSON.stringify(res.loginData));
        if (res.loginData.user) {
          setUser(res.loginData.user);
          localStorage.setItem('academy_user', JSON.stringify(res.loginData.user));
        }
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch login data:', err);
      logout();
    }
  };

  useEffect(() => {
    if (token) {
      if (justLoggedIn.current) {
        // Skip refresh on fresh login — loginData already set from login response
        justLoggedIn.current = false;
        setLoading(false);
      } else {
        // On app load / page refresh, re-validate session from server
        refreshLoginData().finally(() => setLoading(false));
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await loginApi(username, password);
      if (res.success && res.session) {
        const sessionUser = {
          userId: res.session.userId,
          username: res.session.username,
          roles: res.session.roles || [],
        };
        // Mark that we just logged in so useEffect skips redundant refreshLoginData
        justLoggedIn.current = true;
        setUser(sessionUser);
        setToken(res.session.authToken);
        setLoginData(res.loginData);

        localStorage.setItem('academy_user', JSON.stringify(sessionUser));
        localStorage.setItem('academy_token', res.session.authToken);
        if (res.loginData) {
          localStorage.setItem('academy_login_data', JSON.stringify(res.loginData));
        }
        return { success: true };
      }
      return { success: false, error: res?.error || 'Login failed. Please check your credentials.' };
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.message || 'Login failed. Please try again.';
      const retryAfter = err.response?.data?.retryAfter;
      return { success: false, error: serverMsg, retryAfter };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setLoginData(null);
    localStorage.removeItem('academy_user');
    localStorage.removeItem('academy_token');
    localStorage.removeItem('academy_login_data');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  const isSuperAdmin = user?.roles?.includes('Super Admin');
  const isTeacher = user?.roles?.includes('Teacher');
  const isParent = user?.roles?.includes('Parent');
  const isStudent = user?.roles?.includes('Student');

  // Global Permissions State
  const globalPermissions = loginData?.usablePermissions || loginData?.grantedPermissions || [];
  const usablePermissionsByModule = loginData?.usablePermissionsByModule || {};

  const hasPermission = (permissionKey) => {
    if (isSuperAdmin) return true; // Super Admin has global override
    return globalPermissions.some(
      (p) => (p.permission_key || p.name) === permissionKey
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loginData,
        loading,
        login,
        logout,
        refreshLoginData,
        isSuperAdmin,
        isTeacher,
        isParent,
        isStudent,
        globalPermissions,
        usablePermissionsByModule,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
