import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Key, CheckCircle2 } from 'lucide-react';

export const GlobalPermissionsBadge = () => {
  const { globalPermissions } = useAuth();

  return (
    <div className="card-panel" style={{ padding: '1.5rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <Key size={18} color="var(--accent-purple)" />
          <span>Global Assigned Permissions</span>
        </h3>
        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', fontWeight: 600 }}>
          {globalPermissions.length} Active {globalPermissions.length === 1 ? 'Permission' : 'Permissions'}
        </span>
      </div>

      {globalPermissions.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {globalPermissions.map((perm, idx) => {
            const key = perm.permission_key || perm.name || `perm_${idx}`;
            const desc = perm.description || 'Module Access Granted';
            return (
              <div
                key={key}
                title={desc}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                <CheckCircle2 size={14} color="var(--accent-emerald)" />
                <span>{key}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
