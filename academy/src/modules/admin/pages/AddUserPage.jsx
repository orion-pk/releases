import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandConfig } from '../../../config/BrandConfig';
import { registerApi } from '../../../api';
import {
  GraduationCap,
  User,
  Users,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AddUserPage = () => {
  const navigate = useNavigate();

  // Selected Role State ('Teacher', 'Student', 'Parent')
  const [selectedRole, setSelectedRole] = useState('Teacher');

  // Personal Information State
  const [fullName, setFullName] = useState('');
  const [cnic, setCnic] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Qualification State
  const [qualificationGrade, setQualificationGrade] = useState('');
  const [certificationsText, setCertificationsText] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [degreeFile, setDegreeFile] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);

  // Access State
  const [accessGrade, setAccessGrade] = useState('');
  const [accessSubject, setAccessSubject] = useState('');
  const [permissions, setPermissions] = useState({
    studentDetails: false,
    examPortal: false,
    parentsContact: false,
    attendance: false,
    events: false,
    hr: false,
  });

  // Submission / Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // CNIC Formatting & 13-digit Limit Handler
  const handleCnicChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 13);
    let formatted = raw;
    if (raw.length > 4 && raw.length <= 11) {
      formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    } else if (raw.length > 11) {
      formatted = `${raw.slice(0, 4)}-${raw.slice(4, 11)}-${raw.slice(11)}`;
    }
    setCnic(formatted);
  };

  // Phone Number Formatting & 11-digit Limit Handler
  const handleContactChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 4)} ${raw.slice(4)}`;
    }
    setContact(formatted);
  };

  // Qualification Grades Options depending on Role
  const studentGradeOptions = [
    'Choose from dropdown menu',
    'Primary',
    'Secondary',
    'Matriculation',
    'Intermediate',
    'Graduation',
    'Undergraduation',
    'Master',
    'MPhil',
    'PhD',
  ];

  const teacherGradeOptions = [
    'Choose from dropdown menu',
    'Undergraduation',
    'Graduation',
    'Master',
    'MPhil',
    'PhD',
  ];

  const currentGradeOptions =
    selectedRole === 'Teacher' ? teacherGradeOptions : studentGradeOptions;

  // Toggle Checkbox Permission
  const handlePermissionToggle = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter Full Name.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Please enter Email Address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter Password.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);

    try {
      let roleId = 2; // Teacher default
      if (selectedRole === 'Student') roleId = 3;
      else if (selectedRole === 'Parent') roleId = 4;

      const res = await registerApi({
        username: fullName.trim(),
        password: password,
        email: email.trim(),
        phoneNumber: contact.trim() || '1234567890',
        status: 'registered',
        roleId: roleId,
        cnic: cnic.trim(),
        qualificationGrade: qualificationGrade,
        certifications: certificationsText.trim(),
        cvFile: cvFile ? cvFile.name : null,
        degreeFile: degreeFile ? degreeFile.name : null,
        certificateFile: certificateFile ? certificateFile.name : null,
        accessGrade: accessGrade,
        accessSubject: accessSubject,
        permissionsJson: JSON.stringify(permissions),
      });

      if (res.success || res.user || res.message?.includes('success')) {
        setSuccessMessage(`User "${fullName}" added successfully as ${selectedRole}!`);
        setTimeout(() => {
          navigate('/admin/users-roles');
        }, 1200);
      } else {
        setErrorMessage(res.error || res.message || 'Failed to create user.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error creating user';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Role Selection cleanly to prevent grade option mismatch
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    if (role === 'Teacher' && !teacherGradeOptions.includes(qualificationGrade)) {
      setQualificationGrade('');
    }
  };

  // Is Qualification Card Functional? (Rule: Greyed out for Parent)
  const isQualificationFunctional = selectedRole !== 'Parent';

  // Is CV Upload Functional? (Rule: Non-functional/greyed out for Student)
  const isCvUploadFunctional = selectedRole === 'Teacher';

  return (
    <div
      className="add-user-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        padding: '0.15rem 0.25rem 0.5rem 0.25rem',
        width: '100%',
        maxWidth: '960px',
        margin: '0 auto',
        boxSizing: 'border-box',
        fontFamily: BrandConfig.fontFamily,
        maxHeight: 'calc(100vh - 5.5rem)',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`
        .add-user-container::-webkit-scrollbar {
          display: none;
        }
        .add-user-container input::-ms-reveal,
        .add-user-container input::-ms-clear {
          display: none;
        }
        .upload-box-pixel-bg {
          background-color: #f8fafc !important;
          background-image: 
            linear-gradient(45deg, #e2e8f0 25%, transparent 25%), 
            linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #e2e8f0 75%), 
            linear-gradient(-45deg, transparent 75%, #e2e8f0 75%) !important;
          background-size: 10px 10px !important;
          background-position: 0 0, 0 5px, 5px -5px, -5px 0px !important;
        }
      `}</style>

      {/* Role Selection Chips Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.35rem',
          margin: '0',
          width: '100%',
        }}
      >
        <div
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#0f172a',
            letterSpacing: '0.2px',
          }}
        >
          Select Role
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: '#FFFFFF',
            padding: '0.25rem 0.4rem',
            borderRadius: '50px',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          {/* Teacher Pill */}
          <button
            type="button"
            onClick={() => handleRoleSelect('Teacher')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 1rem',
              borderRadius: '50px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedRole === 'Teacher' ? '1.5px solid #02658b' : '1.5px solid transparent',
              background: selectedRole === 'Teacher' ? '#FFFFFF' : 'transparent',
              color: selectedRole === 'Teacher' ? '#02658b' : '#64748b',
              boxShadow: selectedRole === 'Teacher' ? '0 2px 5px rgba(2,101,139,0.12)' : 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
          >
            <GraduationCap size={15} color={selectedRole === 'Teacher' ? '#02658b' : '#64748b'} />
            <span>Teacher</span>
          </button>

          {/* Student Pill */}
          <button
            type="button"
            onClick={() => handleRoleSelect('Student')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 1rem',
              borderRadius: '50px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedRole === 'Student' ? '1.5px solid #02658b' : '1.5px solid transparent',
              background: selectedRole === 'Student' ? '#FFFFFF' : 'transparent',
              color: selectedRole === 'Student' ? '#02658b' : '#64748b',
              boxShadow: selectedRole === 'Student' ? '0 2px 5px rgba(2,101,139,0.12)' : 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
          >
            <User size={15} color={selectedRole === 'Student' ? '#02658b' : '#64748b'} />
            <span>Student</span>
          </button>

          {/* Parent Pill */}
          <button
            type="button"
            onClick={() => handleRoleSelect('Parent')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 1rem',
              borderRadius: '50px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedRole === 'Parent' ? '1.5px solid #02658b' : '1.5px solid transparent',
              background: selectedRole === 'Parent' ? '#FFFFFF' : 'transparent',
              color: selectedRole === 'Parent' ? '#02658b' : '#64748b',
              boxShadow: selectedRole === 'Parent' ? '0 2px 5px rgba(2,101,139,0.12)' : 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
          >
            <Users size={15} color={selectedRole === 'Parent' ? '#02658b' : '#64748b'} />
            <span>Parent</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.82rem',
            fontWeight: 500,
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#16a34a',
            fontSize: '0.82rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', boxSizing: 'border-box' }}>
        {/* CARD 1: PERSONAL INFORMATION */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '11px',
            border: '1.5px solid #cbd5e1',
            padding: '0.95rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <h3
            style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            Personal Information
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem 1.1rem',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* Row 1: Full Name | CNIC */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter name here"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  height: '39px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  padding: '0 0.8rem',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                CNIC
              </label>
              <input
                type="text"
                placeholder="1234-5678910-2"
                value={cnic}
                onChange={handleCnicChange}
                maxLength={15}
                style={{
                  height: '39px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  padding: '0 0.8rem',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              />
            </div>

            {/* Row 2: Contact | Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Contact
              </label>
              <input
                type="text"
                placeholder="123 045 223 48"
                value={contact}
                onChange={handleContactChange}
                maxLength={12}
                style={{
                  height: '39px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  padding: '0 0.8rem',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  height: '39px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  padding: '0 0.8rem',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              />
            </div>

            {/* Row 3: Password | Confirm Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Password
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    height: '39px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    padding: '0 2.2rem 0 0.8rem',
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  height: '39px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  padding: '0 0.8rem',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              />
            </div>
          </div>
        </div>

        {/* CARD 2: QUALIFICATION */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '11px',
            border: '1.5px solid #cbd5e1',
            padding: '0.9rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            opacity: isQualificationFunctional ? 1 : 0.45,
            pointerEvents: isQualificationFunctional ? 'auto' : 'none',
            transition: 'opacity 0.25s ease',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <h3
            style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            Qualification
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.25rem',
              alignItems: 'stretch',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* Left Column: Grades Dropdown & 3 Upload Boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  Grades
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <select
                    value={qualificationGrade}
                    disabled={!isQualificationFunctional}
                    onChange={(e) => setQualificationGrade(e.target.value)}
                    style={{
                      height: '39px',
                      width: '100%',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      padding: '0 2.5rem 0 0.8rem',
                      fontSize: '0.85rem',
                      color: qualificationGrade ? '#0f172a' : '#94a3b8',
                      outline: 'none',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {currentGradeOptions.map((opt, idx) => (
                      <option key={opt} value={idx === 0 ? '' : opt} disabled={idx === 0}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      position: 'absolute',
                      right: '1.25rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronDown size={15} color="#64748b" />
                  </div>
                </div>
              </div>

              {/* 3 Upload Boxes Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '0.5rem',
                  marginTop: '0.1rem',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* 1. Upload CV Box */}
                <label
                  className="upload-box-pixel-bg"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.85rem 0.45rem',
                    minHeight: '76px',
                    borderRadius: '8px',
                    border: '1.5px dashed #cbd5e1',
                    cursor: isCvUploadFunctional ? 'pointer' : 'not-allowed',
                    opacity: isCvUploadFunctional ? 1 : 0.45,
                    pointerEvents: isCvUploadFunctional ? 'auto' : 'none',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    minWidth: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    disabled={!isCvUploadFunctional}
                    onChange={(e) => setCvFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  <Upload size={18} color={cvFile ? '#16a34a' : '#64748b'} style={{ marginBottom: '0.25rem', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: cvFile ? '#16a34a' : '#475569',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.15',
                      maxHeight: '3.45em',
                      maxWidth: '100%',
                    }}
                    title={cvFile ? cvFile.name : 'Upload CV'}
                  >
                    {cvFile ? cvFile.name : 'Upload CV'}
                  </span>
                </label>

                {/* 2. Upload Recent Degree Box */}
                <label
                  className="upload-box-pixel-bg"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.85rem 0.45rem',
                    minHeight: '76px',
                    borderRadius: '8px',
                    border: '1.5px dashed #cbd5e1',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    minWidth: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setDegreeFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  <Upload size={18} color={degreeFile ? '#16a34a' : '#64748b'} style={{ marginBottom: '0.25rem', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: degreeFile ? '#16a34a' : '#475569',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.15',
                      maxHeight: '3.45em',
                      maxWidth: '100%',
                    }}
                    title={degreeFile ? degreeFile.name : 'Upload Recent Degree'}
                  >
                    {degreeFile ? degreeFile.name : 'Upload Recent Degree'}
                  </span>
                </label>

                {/* 3. Upload Certificates Box */}
                <label
                  className="upload-box-pixel-bg"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.85rem 0.45rem',
                    minHeight: '76px',
                    borderRadius: '8px',
                    border: '1.5px dashed #cbd5e1',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    minWidth: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setCertificateFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  <Upload size={18} color={certificateFile ? '#16a34a' : '#64748b'} style={{ marginBottom: '0.25rem', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: certificateFile ? '#16a34a' : '#475569',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.15',
                      maxHeight: '3.45em',
                      maxWidth: '100%',
                    }}
                    title={certificateFile ? certificateFile.name : 'Upload certificates'}
                  >
                    {certificateFile ? certificateFile.name : 'Upload certificates'}
                  </span>
                </label>
              </div>
            </div>

            {/* Right Column: Certifications Textarea */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0, height: '100%' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Certifications
              </label>
              <textarea
                placeholder="Write down any online courses certifications if any"
                value={certificationsText}
                disabled={!isQualificationFunctional}
                onChange={(e) => setCertificationsText(e.target.value)}
                style={{
                  flex: 1,
                  minHeight: '90px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  padding: '0.6rem 0.8rem',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: BrandConfig.fontFamily,
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: ACCESS */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '11px',
            border: '1.5px solid #cbd5e1',
            padding: '0.9rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <h3
            style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            Access
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.25rem',
              alignItems: 'stretch',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* Left Column: Grades & Subjects Dropdowns */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
              {/* Grades */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  Grades
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <select
                    value={accessGrade}
                    onChange={(e) => setAccessGrade(e.target.value)}
                    style={{
                      height: '39px',
                      width: '100%',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      padding: '0 2.5rem 0 0.8rem',
                      fontSize: '0.85rem',
                      color: accessGrade ? '#0f172a' : '#94a3b8',
                      outline: 'none',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="" disabled>Choose Grades</option>
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </select>
                  <div
                    style={{
                      position: 'absolute',
                      right: '1.25rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronDown size={15} color="#64748b" />
                  </div>
                </div>
              </div>

              {/* Subjects */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  Subjects
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <select
                    value={accessSubject}
                    onChange={(e) => setAccessSubject(e.target.value)}
                    style={{
                      height: '39px',
                      width: '100%',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      padding: '0 2.5rem 0 0.8rem',
                      fontSize: '0.85rem',
                      color: accessSubject ? '#0f172a' : '#94a3b8',
                      outline: 'none',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="" disabled>Choose subjects</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="English">English</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Economics">Economics</option>
                  </select>
                  <div
                    style={{
                      position: 'absolute',
                      right: '1.25rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronDown size={15} color="#64748b" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Access Permissions Checkbox Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0, height: '100%' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Access Permissions
              </label>

              <div
                style={{
                  flex: 1,
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.6rem 0.85rem',
                  background: '#FFFFFF',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  alignContent: 'center',
                  gap: '0.5rem 1rem',
                  boxSizing: 'border-box',
                }}
              >
                {[
                  { key: 'studentDetails', label: 'Student details' },
                  { key: 'attendance', label: 'Attendance' },
                  { key: 'examPortal', label: 'Exam Portal' },
                  { key: 'events', label: 'Events' },
                  { key: 'parentsContact', label: 'Parents Contact' },
                  { key: 'hr', label: 'HR' },
                ].map((item) => (
                  <label
                    key={item.key}
                    onClick={() => handlePermissionToggle(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.8rem',
                      color: '#475569',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '15px',
                        height: '15px',
                        borderRadius: '3px',
                        border: permissions[item.key] ? '1.5px solid #02658b' : '1.5px solid #cbd5e1',
                        background: permissions[item.key] ? '#02658b' : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {permissions[item.key] && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '38px',
              borderRadius: '8px',
              background: '#02658b',
              color: '#FFFFFF',
              border: 'none',
              padding: '0 1.35rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 5px rgba(2,101,139,0.22)',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <span>{loading ? 'Saving...' : 'Save and Continue'}</span>
            {!loading && <ArrowRight size={15} />}
          </button>
        </div>
      </form>
    </div>
  );
};
