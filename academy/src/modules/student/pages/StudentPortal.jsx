import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  Award,
  Calendar,
  CheckCircle2,
  User,
} from 'lucide-react';

export const StudentPortal = () => {
  const { user } = useAuth();

  const studentData = {
    name: user?.username || 'Student User',
    rollNumber: 'STU-2026-88',
    grade: 'Grade 10-A',
    overallGpa: '3.85',
    attendanceRate: '95.5%',
    courses: [
      { code: 'MATH-101', name: 'Advanced Mathematics', grade: 'A', score: '92%' },
      { code: 'PHY-102', name: 'Physics & Mechanics', grade: 'A-', score: '88%' },
      { code: 'CS-103', name: 'Computer Science & Logic', grade: 'A+', score: '97%' },
      { code: 'ENG-104', name: 'English Literature', grade: 'B+', score: '84%' },
    ],
    remarks: 'Demonstrates exceptional analytical skills in STEM subjects. Recommended for advanced computer science seminars.',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
          Student Academic Portal
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
          Personal Student View — Inspect your enrolled courses, grades, and attendance.
        </p>
      </div>

      {/* Student Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e5f3f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#02658b' }}>
            <User size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Student Identity</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{studentData.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{studentData.rollNumber}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e5f3f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#02658b' }}>
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Cumulative GPA</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#02658b' }}>{studentData.overallGpa}</div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Honor Roll Candidate</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46' }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Attendance Rate</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#10b981' }}>{studentData.attendanceRate}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Class Standing: Regular</div>
          </div>
        </div>
      </div>

      {/* Courses & Marks Grid Table */}
      <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={20} color="#02658b" />
          <span>My Enrolled Subjects & Assessment Scores</span>
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#e5f3f7', borderBottom: '1.5px solid #cbd5e1', color: '#0f172a', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 1rem' }}>Course Code</th>
                <th style={{ padding: '0.85rem 1rem' }}>Subject Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Score</th>
                <th style={{ padding: '0.85rem 1rem' }}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {studentData.courses.map((c) => (
                <tr key={c.code} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#02658b' }}>{c.code}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>{c.name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{c.score}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#f1f5f9', fontWeight: 700, color: '#0f172a' }}>
                      {c.grade}
                    </span>
                  </td>
                </tr>
              ))}
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
          {studentData.remarks}
        </p>
      </div>
    </div>
  );
};
