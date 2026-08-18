import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  Heart,
  Calendar,
  Award,
  BookOpen,
  CheckCircle2,
  Users,
} from 'lucide-react';

export const ParentPortal = () => {
  const { user } = useAuth();

  const parentData = {
    parentName: user?.username || 'Parent User',
    childName: 'Sania Ali',
    childId: 'STU-101',
    grade: 'Grade 10-A',
    attendance: '96%',
    termGpa: '3.8',
    subjects: [
      { name: 'Mathematics', score: '92%', status: 'Excellent' },
      { name: 'Physics', score: '88%', status: 'Very Good' },
      { name: 'Computer Science', score: '97%', status: 'Outstanding' },
      { name: 'English', score: '84%', status: 'Good' },
    ],
    teacherMessage: 'Sania is an exemplary student in class. Her active engagement and homework submission punctuality are commendable.',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
          Parent Guardian Portal
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
          Welcome, <strong>{parentData.parentName}</strong>! Monitor your child's academic progress, attendance, and teacher communications.
        </p>
      </div>

      {/* Child Card Header */}
      <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9f1239' }}>
            <Heart size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              Child Profile: {parentData.childName}
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Student ID: {parentData.childId} • {parentData.grade}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Attendance</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981' }}>{parentData.attendance}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Term GPA</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#02658b' }}>{parentData.termGpa}</div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} color="#02658b" />
          <span>Child Performance & Subject Grades</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {parentData.subjects.map((s) => (
            <div key={s.name} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0' }}>{s.score}</div>
              <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>{s.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Note */}
      <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>Class Teacher Progress Note</span>
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          {parentData.teacherMessage}
        </p>
      </div>
    </div>
  );
};
