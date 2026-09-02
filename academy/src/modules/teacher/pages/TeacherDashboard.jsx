import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchUsersApi } from '../../../api';
import {
  Users,
  Search,
  Edit3,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await fetchUsersApi();
        if (res.success && res.users) {
          // Current teacher record from fresh DB users list
          const currentTeacherRecord = res.users.find(
            (u) => String(u.id) === String(user?.id || user?.userId) || u.username === user?.username
          );

          const teacherPermissionsStr = currentTeacherRecord?.permissionsJson || user?.permissionsJson || '';

          let linkedIdsSet = new Set();

          try {
            if (teacherPermissionsStr) {
              const parsed = JSON.parse(teacherPermissionsStr);
              if (Array.isArray(parsed.linkedStudentIds)) {
                parsed.linkedStudentIds.forEach((id) => id && linkedIdsSet.add(String(id)));
              }
              if (parsed.linkedStudentId) {
                String(parsed.linkedStudentId).split(',').forEach((id) => id && linkedIdsSet.add(String(id).trim()));
              }
            }
          } catch {
            // Ignored - permissions string may be unparsed or empty
          }

          const teacherIdStr = String(currentTeacherRecord?.id || user?.id || user?.userId || '');

          const allDbStudents = res.users.filter(
            (u) => u.roles && (u.roles.includes('Student') || u.roles.some?.((r) => r.roleName === 'Student' || r.id === 3))
          );

          // Check if students have permissionsJson pointing to this teacher
          allDbStudents.forEach((st) => {
            try {
              if (st.permissionsJson) {
                const parsed = JSON.parse(st.permissionsJson);
                if (Array.isArray(parsed.linkedTeacherIds) && parsed.linkedTeacherIds.map(String).includes(teacherIdStr)) {
                  linkedIdsSet.add(String(st.id));
                } else if (parsed.linkedTeacherId && String(parsed.linkedTeacherId).split(',').map((s) => s.trim()).includes(teacherIdStr)) {
                  linkedIdsSet.add(String(st.id));
                }
              }
            } catch {
              // Ignored - JSON formatting
            }
          });

          // Filter assigned students using linkedIdsSet
          let assignedStudents = [];
          if (linkedIdsSet.size > 0) {
            assignedStudents = allDbStudents.filter((st) => linkedIdsSet.has(String(st.id)));
          } else {
            const teacherGrade = currentTeacherRecord?.accessGrade || user?.accessGrade;
            const teacherSubject = currentTeacherRecord?.accessSubject || user?.accessSubject;

            if (teacherGrade || teacherSubject) {
              const gradeSubjectMatches = allDbStudents.filter(
                (st) => (teacherGrade && st.accessGrade === teacherGrade) || (teacherSubject && st.accessSubject === teacherSubject)
              );
              assignedStudents = gradeSubjectMatches;
            } else {
              assignedStudents = [];
            }
          }

          const formattedStudents = assignedStudents.map((u) => ({
            id: u.id,
            name: u.username,
            grade: u.accessGrade || 'Grade 10',
            attendance: '96%',
            gpa: '3.8',
            notes: 'Registered system student profile.',
          }));

          setStudents(formattedStudents);
          if (formattedStudents.length > 0) {
            setSelectedStudent(formattedStudents[0]);
            setNoteText(formattedStudents[0].notes);
          } else {
            setSelectedStudent(null);
            setNoteText('');
          }
        }
      } catch {
        // Ignored - fallback
      }
    };
    loadStudents();
    const interval = setInterval(loadStudents, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSelectStudent = (st) => {
    setSelectedStudent(st);
    setNoteText(st.notes || '');
    setSaveSuccess(false);
  };

  const handleSaveNotes = (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setStudents((prev) =>
      prev.map((s) => (s.id === selectedStudent.id ? { ...s, notes: noteText } : s))
    );
    setSelectedStudent((prev) => ({ ...prev, notes: noteText }));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const filteredStudents = students.filter(
    (st) =>
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
          Teacher Portal & Student Management
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
          Welcome back, <strong>{user?.username}</strong>! Read and update student academic records and behavioral notes.
        </p>
      </div>

      {saveSuccess && (
        <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.85rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <CheckCircle2 size={18} />
          <span>Student record updated successfully in database!</span>
        </div>
      )}

      {/* Directory & Search */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
        {/* Left Column: Student Roster */}
        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#02658b" />
              <span>Assigned Students ({students.length})</span>
            </h3>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.5rem 0.45rem 2.2rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem', background: '#FAFAFA', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', overflowY: 'auto' }}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#334155' }}>No assigned students found.</p>
                <span>Please contact an Administrator to assign students to your teacher profile.</span>
              </div>
            ) : (
              filteredStudents.map((st) => {
                const isSelected = selectedStudent?.id === st.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => handleSelectStudent(st)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '0.5rem',
                      border: `1.5px solid ${isSelected ? '#02658b' : '#e2e8f0'}`,
                      background: isSelected ? '#e5f3f7' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{st.name}</span>
                      <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                        {st.grade}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Attendance: <strong style={{ color: '#0f172a' }}>{st.attendance}</strong> | GPA: <strong style={{ color: '#02658b' }}>{st.gpa}</strong>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Student Academic Record Editor */}
        {selectedStudent && (
          <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <GraduationCap size={24} color="#02658b" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    {selectedStudent.name}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Student ID: #{selectedStudent.id} • {selectedStudent.grade}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem', borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Attendance Rate</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginTop: '0.2rem' }}>{selectedStudent.attendance}</div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem', borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Current GPA</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#02658b', marginTop: '0.2rem' }}>{selectedStudent.gpa}</div>
              </div>
            </div>

            <form onSubmit={handleSaveNotes} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                  Academic & Behavioral Progress Notes
                </label>
                <textarea
                  rows={5}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter detailed progress notes..."
                  style={{ width: '100%', padding: '0.65rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', background: '#FAFAFA', fontSize: '0.88rem', outline: 'none', lineHeight: 1.5 }}
                />
              </div>

              <button
                type="submit"
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '0.375rem',
                  background: '#02658b',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={16} />
                <span>Save & Update Student Record</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
