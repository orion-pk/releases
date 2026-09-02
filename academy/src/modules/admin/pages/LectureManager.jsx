import React, { useState, useEffect } from 'react';
import {
  fetchLecturesApi,
  fetchLectureDetailApi,
  createLectureApi,
  updateLectureApi,
  deleteLectureApi,
  fetchUsersApi,
} from '../../../api';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Users,
  GraduationCap,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';

export const LectureManager = () => {
  const [lectures, setLectures] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    teacherId: '',
    studentIds: [],
  });

  // Detail Modal State
  const [detailModalLecture, setDetailModalLecture] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lecturesRes, usersRes] = await Promise.all([
        fetchLecturesApi(),
        fetchUsersApi(),
      ]);

      if (lecturesRes?.success) {
        setLectures(lecturesRes.lectures || []);
      }
      if (usersRes?.success) {
        setUsers(usersRes.users || []);
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to load lecture data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const teachers = users.filter((u) => {
    const roles = u.roles || [];
    return roles.includes('Teacher') || roles.includes('Super Admin');
  });

  const students = users.filter((u) => {
    const roles = u.roles || [];
    return roles.includes('Student') || roles.length === 0;
  });

  const handleOpenCreateModal = () => {
    setEditingLecture(null);
    setFormData({
      title: '',
      subject: '',
      description: '',
      teacherId: teachers.length > 0 ? teachers[0].id : '',
      studentIds: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (lecture) => {
    try {
      const detailRes = await fetchLectureDetailApi(lecture.id);
      const fullLecture = detailRes?.lecture || lecture;
      const assignedStudentIds = (fullLecture.students || []).map((s) => s.id);

      setEditingLecture(lecture);
      setFormData({
        title: lecture.title,
        subject: lecture.subject,
        description: lecture.description || '',
        teacherId: lecture.teacherId,
        studentIds: assignedStudentIds,
      });
      setIsModalOpen(true);
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to fetch lecture details for editing.' });
    }
  };

  const handleOpenDetailModal = async (lectureId) => {
    try {
      const res = await fetchLectureDetailApi(lectureId);
      if (res?.success) {
        setDetailModalLecture(res.lecture);
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to view lecture details.' });
    }
  };

  const handleToggleStudent = (studentId) => {
    setFormData((prev) => {
      const exists = prev.studentIds.includes(studentId);
      return {
        ...prev,
        studentIds: exists
          ? prev.studentIds.filter((id) => id !== studentId)
          : [...prev.studentIds, studentId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.subject.trim() || !formData.teacherId) {
      setStatusMessage({ type: 'error', text: 'Please fill in Title, Subject, and Teacher.' });
      return;
    }

    try {
      if (editingLecture) {
        await updateLectureApi({
          id: editingLecture.id,
          ...formData,
        });
        setStatusMessage({ type: 'success', text: 'Lecture updated successfully!' });
      } else {
        await createLectureApi(formData);
        setStatusMessage({ type: 'success', text: 'Lecture created successfully!' });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Operation failed.',
      });
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete lecture "${title}"?`)) return;

    try {
      await deleteLectureApi(id);
      setStatusMessage({ type: 'success', text: 'Lecture deleted successfully.' });
      loadData();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to delete lecture.',
      });
    }
  };

  const filteredLectures = lectures.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      l.subject.toLowerCase().includes(q) ||
      l.teacherName?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        className="card-panel"
        style={{
          padding: '1.5rem 2rem',
          background: 'var(--bg-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99, 102, 241, 0.15)', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 600, marginBottom: '0.4rem' }}>
            <BookOpen size={14} />
            <span>Curriculum & Lectures</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            Lecture Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Create lectures, assign instructors, and manage enrolled students.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--accent-indigo)',
            color: '#fff',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: '0.5rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          <Plus size={18} />
          <span>New Lecture</span>
        </button>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: statusMessage.type === 'success' ? '#10b981' : '#ef4444',
            border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search lectures by title, subject, or teacher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Lectures List */}
      <div className="card-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading lectures...
          </div>
        ) : filteredLectures.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <BookOpen size={40} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p style={{ margin: 0, fontSize: '1rem' }}>No lectures found. Click <strong>New Lecture</strong> to create one.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Topic / Title</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Instructor</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Enrolled Students</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLectures.map((lec) => (
                  <tr key={lec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div>{lec.title}</div>
                      {lec.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.15rem' }}>
                          {lec.description.length > 60 ? `${lec.description.substring(0, 60)}...` : lec.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ display: 'inline-block', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {lec.subject}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <GraduationCap size={16} color="var(--accent-emerald)" />
                        <span>{lec.teacherName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button
                        onClick={() => handleOpenDetailModal(lec.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'none',
                          border: '1px solid #cbd5e1',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <Users size={14} />
                        <span>{lec.studentCount} Students</span>
                      </button>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenDetailModal(lec.id)}
                          title="View Details & Roster"
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(lec)}
                          title="Edit Lecture"
                          style={{ background: 'none', border: 'none', color: 'var(--accent-indigo)', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(lec.id, lec.title)}
                          title="Delete Lecture"
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #fff)',
              borderRadius: '0.75rem',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {editingLecture ? 'Edit Lecture' : 'Create New Lecture'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Lecture Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures & Algorithms"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-primary, #fff)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science / Mathematics"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-primary, #fff)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Assigned Instructor (Teacher) *
                </label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-primary, #fff)',
                  }}
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.username} {t.email ? `(${t.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Description / Topic Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Lecture notes, overview, or syllabus..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-primary, #fff)',
                  }}
                />
              </div>

              {/* Assign Students Checkbox List */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Assign Students ({formData.studentIds.length} selected)
                </label>
                <div
                  style={{
                    maxHeight: '140px',
                    overflowY: 'auto',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.4rem',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    background: 'var(--bg-primary, #fff)',
                  }}
                >
                  {students.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No student accounts available.</span>
                  ) : (
                    students.map((st) => (
                      <label
                        key={st.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.studentIds.includes(st.id)}
                          onChange={() => handleToggleStudent(st.id)}
                        />
                        <span>{st.username}</span>
                        {st.email && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({st.email})</span>}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #cbd5e1',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '0.4rem',
                    border: 'none',
                    background: 'var(--accent-indigo)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {editingLecture ? 'Save Changes' : 'Create Lecture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster & Details Modal */}
      {detailModalLecture && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #fff)',
              borderRadius: '0.75rem',
              width: '100%',
              maxWidth: '520px',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                  {detailModalLecture.title}
                </h2>
                <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {detailModalLecture.subject}
                </span>
              </div>
              <button
                onClick={() => setDetailModalLecture(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Teacher:</strong> {detailModalLecture.teacherName} ({detailModalLecture.teacherEmail || 'No email'})</p>
              {detailModalLecture.description && (
                <p style={{ margin: '0 0 0.4rem 0' }}><strong>Description:</strong> {detailModalLecture.description}</p>
              )}
            </div>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              Assigned Students ({detailModalLecture.students?.length || 0})
            </h3>

            <div
              style={{
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '0.4rem',
                padding: '0.5rem',
              }}
            >
              {(detailModalLecture.students || []).length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No students assigned to this lecture yet.
                </div>
              ) : (
                detailModalLecture.students.map((st) => (
                  <div
                    key={st.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.4rem 0.5rem',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{st.username}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{st.email || 'No email'}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                onClick={() => setDetailModalLecture(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.4rem',
                  border: 'none',
                  background: 'var(--accent-indigo)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
