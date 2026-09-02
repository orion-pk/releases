import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Check, Save } from 'lucide-react';
import { BrandConfig } from '../../../config/BrandConfig';

export const RolePermissionsMatrixPage = () => {
  const navigate = useNavigate();
  const [activeMatrixRole, setActiveMatrixRole] = useState('2'); // Default Teacher (Role ID 2)
  const [matrixSaveSuccess, setMatrixSaveSuccess] = useState(null);

  const [rolePermissionsState, setRolePermissionsState] = useState({
    // Role 1 (Super Admin - All True)
    '1': {
      'students:view': true, 'students:create': true, 'students:edit': true, 'students:delete': true,
      'teachers:view': true, 'teachers:create': true, 'teachers:edit': true, 'teachers:delete': true,
      'classes:view': true, 'classes:create': true, 'classes:edit': true, 'classes:delete': true,
      'users:view': true, 'users:create': true, 'users:edit': true, 'users:delete': true,
    },
    // Role 2 (Teacher)
    '2': {
      'students:view': true, 'students:create': false, 'students:edit': true, 'students:delete': false,
      'teachers:view': true, 'teachers:create': false, 'teachers:edit': false, 'teachers:delete': false,
      'classes:view': true, 'classes:create': false, 'classes:edit': false, 'classes:delete': false,
      'users:view': false, 'users:create': false, 'users:edit': false, 'users:delete': false,
    },
    // Role 3 (Student)
    '3': {
      'students:view': true, 'students:create': false, 'students:edit': false, 'students:delete': false,
      'teachers:view': false, 'teachers:create': false, 'teachers:edit': false, 'teachers:delete': false,
      'classes:view': true, 'classes:create': false, 'classes:edit': false, 'classes:delete': false,
      'users:view': false, 'users:create': false, 'users:edit': false, 'users:delete': false,
    },
    // Role 4 (Parent)
    '4': {
      'students:view': true, 'students:create': false, 'students:edit': false, 'students:delete': false,
      'teachers:view': false, 'teachers:create': false, 'teachers:edit': false, 'teachers:delete': false,
      'classes:view': true, 'classes:create': false, 'classes:edit': false, 'classes:delete': false,
      'users:view': false, 'users:create': false, 'users:edit': false, 'users:delete': false,
    },
  });

  const handleToggleRolePermission = (roleId, permKey) => {
    if (roleId === '1') return; // Super Admin locked
    setRolePermissionsState((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permKey]: !prev[roleId]?.[permKey],
      },
    }));
  };

  const handleSave = () => {
    const roleName =
      activeMatrixRole === '1'
        ? 'Super Admin'
        : activeMatrixRole === '2'
        ? 'Teacher'
        : activeMatrixRole === '3'
        ? 'Student'
        : 'Parent';
    setMatrixSaveSuccess(`Permissions for ${roleName} saved successfully!`);
    setTimeout(() => setMatrixSaveSuccess(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: BrandConfig.fontFamily }}>


      {/* Success Notification Banner */}
      {matrixSaveSuccess && (
        <div
          style={{
            background: '#d1fae5',
            border: '1.5px solid #a7f3d0',
            color: '#065f46',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 4px rgba(6, 95, 70, 0.08)',
          }}
        >
          <CheckCircle2 size={18} color="#065f46" />
          <span>{matrixSaveSuccess}</span>
        </div>
      )}

      {/* Main Permissions Matrix Container */}
      <div
        className="card-panel"
        style={{
          padding: '1.75rem',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Role Selection Tabs */}
        <div style={{ display: 'flex', gap: '0.65rem', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '0.85rem', flexWrap: 'wrap' }}>
          {[
            { id: '1', label: 'Super Admin' },
            { id: '2', label: 'Teacher' },
            { id: '3', label: 'Student' },
            { id: '4', label: 'Parent' },
          ].map((role) => {
            const isActive = activeMatrixRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setActiveMatrixRole(role.id)}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 600,
                  background: isActive ? '#02658b' : 'var(--bg-primary)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  border: isActive ? 'none' : '1.5px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 4px rgba(2, 101, 139, 0.2)' : 'none',
                }}
              >
                {role.label}
              </button>
            );
          })}
        </div>

        {/* Active Role Configuration Section */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '1.25rem' }}>


          {/* Permissions Matrix Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr 1fr 1fr 1fr',
              gap: '0.75rem',
              paddingBottom: '0.75rem',
              borderBottom: '2px solid var(--border-color)',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            <div style={{ textAlign: 'left' }}>System Module</div>
            <div>View</div>
            <div>Add</div>
            <div>Edit</div>
            <div>Delete</div>
          </div>

          {/* Module Rows */}
          {[
            { name: 'Student Module', prefix: 'students' },
            { name: 'Teacher Module', prefix: 'teachers' },
            { name: 'Class Module', prefix: 'classes' },
            { name: 'User Governance', prefix: 'users' },
          ].map((m) => (
            <div
              key={m.prefix}
              style={{
                display: 'grid',
                gridTemplateColumns: '220px 1fr 1fr 1fr 1fr',
                gap: '0.75rem',
                padding: '0.85rem 0',
                borderBottom: '1px solid var(--border-color)',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{ textAlign: 'left', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {m.name}
              </div>
              {['view', 'create', 'edit', 'delete'].map((act) => {
                const permKey = `${m.prefix}:${act}`;
                const isChecked = !!rolePermissionsState[activeMatrixRole]?.[permKey];
                const isDisabled = activeMatrixRole === '1'; // Super Admin locked

                return (
                  <div key={permKey} style={{ display: 'flex', justifyContent: 'center' }}>
                    <label
                      onClick={() => !isDisabled && handleToggleRolePermission(activeMatrixRole, permKey)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        padding: '0.2rem',
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: isChecked ? '1.5px solid #02658b' : '1.5px solid var(--border-color)',
                          background: isChecked ? '#02658b' : 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          opacity: isDisabled ? 0.7 : 1,
                        }}
                      >
                        {isChecked && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Save Action Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            style={{
              background: 'var(--bg-primary)',
              border: '1.5px solid var(--border-color)',
              color: 'var(--text-secondary)',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.88rem',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#02658b',
              border: 'none',
              color: '#FFFFFF',
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
              boxShadow: '0 2px 6px rgba(2, 101, 139, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <Save size={16} />
            <span>Save Role Permissions</span>
          </button>
        </div>
      </div>
    </div>
  );
};
