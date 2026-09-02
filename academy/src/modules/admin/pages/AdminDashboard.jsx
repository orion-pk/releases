import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { GlobalPermissionsBadge } from '../../../components/GlobalPermissionsBadge';
import { UserCheck, Key, Users } from 'lucide-react';


export const AdminDashboard = () => {
  const { user, loginData } = useAuth();
  const systemStats = loginData?.systemStats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div
        className="card-panel"
        style={{
          padding: '1.75rem 2rem',
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* Top Row: Chip Tag on Left */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(99, 102, 241, 0.15)', padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', color: 'var(--accent-indigo)', fontWeight: 600 }}>
            <span>Super Admin Workspace</span>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            System Governance Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Logged in as <strong style={{ color: 'var(--accent-indigo)' }}>{user?.username}</strong>. You have full system-wide permissions to manage users and assigned security roles.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className="card-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Managed Users</span>
            <Users size={20} color="var(--accent-indigo)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {systemStats?.totalUsers || 0}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Manage Users & Roles
          </span>
        </div>

        <div className="card-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active System Roles</span>
            <UserCheck size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {systemStats?.totalRoles || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Super Admin, Parent
          </div>
        </div>

        <div className="card-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Granular Permissions</span>
            <Key size={20} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent-purple)' }}>
            {systemStats?.totalPermissions || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Seeded across all modules
          </div>
        </div>
      </div>

      {/* Global State Permissions Badge */}
      <GlobalPermissionsBadge />
    </div>
  );
};
