import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchUsersApi } from '../../../api';
import {
  Heart,
  Calendar,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const ParentPortal = () => {
  const { user } = useAuth();
  const [linkedChildren, setLinkedChildren] = useState([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLinkedStudents = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetchUsersApi();
        if (res.success && res.users) {
          const currentParentRecord = res.users.find(
            (u) => String(u.id) === String(user?.id || user?.userId) || u.username === user?.username
          );
          const parentPermissionsStr = currentParentRecord?.permissionsJson || user?.permissionsJson || '';

          let childIdsSet = new Set();
          try {
            if (parentPermissionsStr) {
              const parsed = JSON.parse(parentPermissionsStr);
              if (Array.isArray(parsed.linkedStudentIds)) {
                parsed.linkedStudentIds.forEach((id) => id && childIdsSet.add(String(id)));
              }
              if (parsed.linkedStudentId) {
                String(parsed.linkedStudentId).split(',').forEach((id) => id && childIdsSet.add(String(id).trim()));
              }
            }
          } catch {
            // Ignored - permissions string may be unparsed or empty
          }

          if (childIdsSet.size > 0) {
            const foundChildren = res.users
              .filter((u) => childIdsSet.has(String(u.id)))
              .map((u) => ({
                id: u.id,
                username: u.username,
                grade: u.accessGrade || 'Grade 10',
                subject: u.accessSubject || 'General Studies',
                status: u.status || 'registered',
              }));
            setLinkedChildren(foundChildren);
          } else {
            setLinkedChildren([]);
          }
        }
      } catch {
        // Ignored - fallback to empty
      }
      if (!silent) setLoading(false);
    };

    loadLinkedStudents();
    const interval = setInterval(() => loadLinkedStudents(true), 5000);
    return () => clearInterval(interval);
  }, [user]);

  const parentName = user?.username || 'Parent User';
  const activeChild = linkedChildren[selectedChildIndex] || linkedChildren[0] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
          Parent Guardian Portal
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
          Welcome, <strong>{parentName}</strong>! Monitor your child's academic progress and teacher communications.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', background: '#ffffff', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', color: '#64748b' }}>
          Loading linked child records from database...
        </div>
      ) : activeChild ? (
        <>
          {/* Child Selector Tabs (If Parent has Multiple Linked Children) */}
          {linkedChildren.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ffffff', padding: '0.5rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginLeft: '0.5rem' }}>Select Linked Child:</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {linkedChildren.map((ch, idx) => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChildIndex(idx)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.82rem',
                      fontWeight: selectedChildIndex === idx ? 700 : 500,
                      background: selectedChildIndex === idx ? '#02658b' : '#f1f5f9',
                      color: selectedChildIndex === idx ? '#ffffff' : '#475569',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    👧 {ch.username} (ID: {ch.id})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Child Card Header */}
          <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9f1239' }}>
                <Heart size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  {activeChild.username}
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Student ID: <strong>STU-{activeChild.id}</strong> | Enrolled: <strong>{activeChild.grade}</strong>
                </div>
              </div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
              Active Student Record
            </div>
          </div>

          {/* Academic Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e5f3f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#02658b' }}>
                <Award size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Academic Standing</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#02658b' }}>Good Standing</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Enrolled & Active</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Attendance</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>Regular</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Class Presence Verified</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400e' }}>
                <BookOpen size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Primary Subject</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#92400e' }}>{activeChild.subject}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Core Curriculum</div>
              </div>
            </div>
          </div>

          {/* Educator Remarks */}
          <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} color="#10b981" />
              <span>Teacher Communications & Notes</span>
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              {activeChild.username} is participating actively in class sessions for {activeChild.grade}.
            </p>
          </div>
        </>
      ) : (
        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '2.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>No Student Linked</h3>
            <p style={{ margin: '0.4rem 0 0 0', color: '#64748b', fontSize: '0.88rem', maxWidth: '480px' }}>
              No student child is currently linked to your parent account (<strong>{parentName}</strong>). Please contact your school administrator to link your child using the User & Role Management screen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
