import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  BookOpen,
  Award,
  Calendar,
  CheckCircle2,
  User,
} from 'lucide-react';

export const StudentPortal = () => {
  const { user } = useAuth();

  const studentName = user?.username || 'Student User';
  const studentId = user?.id ? `STU-${user.id}` : 'STU-01';
  const grade = user?.accessGrade || 'Grade 10';
  const primarySubject = user?.accessSubject || 'General Curriculum';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
          Student Academic Portal
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
          Welcome, <strong>{studentName}</strong>! Inspect your enrolled courses, academic standing, and attendance.
        </p>
      </div>

      {/* Student Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e5f3f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#02658b' }}>
            <User size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Student Profile</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{studentName}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{studentId}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e5f3f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#02658b' }}>
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Enrolled Level</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#02658b' }}>{grade}</div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Active Status</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46' }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Attendance Record</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981' }}>Regular</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Registered Student</div>
          </div>
        </div>
      </div>

      {/* Courses & Marks Grid Table */}
      <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={20} color="#02658b" />
          <span>My Enrolled Subjects</span>
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#e5f3f7', borderBottom: '1.5px solid #cbd5e1', color: '#0f172a', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 1rem' }}>Subject Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Grade Level</th>
                <th style={{ padding: '0.85rem 1rem' }}>Enrollment Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#02658b' }}>{primarySubject}</td>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>{grade}</td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#d1fae5', color: '#065f46', fontWeight: 600, fontSize: '0.8rem' }}>
                    Enrolled
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Educator Remarks */}
      <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>Educator Progress Remarks</span>
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          Registered student account for {studentName}. Participating in {grade} curriculum.
        </p>
      </div>
    </div>
  );
};
