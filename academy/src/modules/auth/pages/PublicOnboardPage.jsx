import React, { useState } from 'react';
import {
  GraduationCap,
  User,
  Users,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react';
import { BrandConfig } from '../../../config/BrandConfig';
import { publicOnboardApi, fetchOnboardStatusApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { getMimeType, handleCnicChange, handleContactChange } from '../../../utils/helpers';

export const PublicOnboardPage = () => {
  const auth = useAuth();
  const logout = auth?.logout;

  const handleGoToLogin = () => {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem('academy_user');
      localStorage.removeItem('academy_token');
      localStorage.removeItem('academy_login_data');
      window.location.href = '/login';
    }
  };

  const [activeTab, setActiveTab] = useState('apply'); // 'apply' | 'status'

  // Selected Role ('Teacher', 'Student', 'Parent', 'Staff')
  const [selectedRole, setSelectedRole] = useState('Teacher');

  // Personal Information State
  const [fullName, setFullName] = useState('');
  const [cnic, setCnic] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Parent Specific Fields
  const [childFullName, setChildFullName] = useState('');
  const [childCnic, setChildCnic] = useState('');

  // Qualification Category & Sub-Category State
  const [qualificationLevel, setQualificationLevel] = useState('');
  const [qualificationSubCategory, setQualificationSubCategory] = useState('');

  // Document Files (Base64 + Info)
  const [cvFile, setCvFile] = useState('');
  const [cvFileName, setCvFileName] = useState('');
  const [degreeFile, setDegreeFile] = useState('');
  const [degreeFileName, setDegreeFileName] = useState('');
  const [certificateFile, setCertificateFile] = useState('');
  const [certificateFileName, setCertificateFileName] = useState('');

  // Status Check State
  const [searchIdentifier, setSearchIdentifier] = useState('');
  const [statusApp, setStatusApp] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Alerts & UI States
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState(null);

  // Helper to encode files to Base64 JSON object (matching AddUserPage.jsx, max 5MB)
  const handleFileChange = (e, setFile, setFileName) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds the 5MB size limit.`);
      return;
    }
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const fileObj = {
        name: file.name,
        type: file.type || getMimeType(file.name),
        size: file.size,
        data: evt.target.result,
      };
      setFile(JSON.stringify(fileObj));
    };
    reader.readAsDataURL(file);
  };

  // Dynamic Qualification Levels depending on Role
  const qualificationLevelsByRole = {
    Student: [
      'Choose qualification level',
      'Primary',
      'Middle',
      'Matriculation (SSC)',
      'Intermediate (HSSC)',
      'Undergraduate / ADP (2-Year)',
      'Graduation (BS / Bachelor 4-Year)',
    ],
    Teacher: [
      'Choose qualification level',
      'Graduation (BS / Master 16-Year)',
      'M.Phil / MS (18-Year)',
      'Ph.D. (Doctorate)',
    ],
    Staff: [
      'Choose qualification level',
      'Matriculation (SSC)',
      'Intermediate (HSSC)',
      'Graduation (BS / Bachelor)',
      'Master / M.Phil',
    ],
    Parent: [],
  };

  // Dynamic Sub-Categories depending on selected Qualification Level
  const getSubCategories = (level) => {
    switch (level) {
      case 'Matriculation (SSC)':
        return [
          'Science Group (Biology)',
          'Science Group (Computer Science)',
          'Arts / Humanities Group',
          'Technical / Vocational Group',
        ];
      case 'Intermediate (HSSC)':
        return [
          'F.Sc. Pre-Medical',
          'F.Sc. Pre-Engineering',
          'ICS (Computer & Physics)',
          'ICS (Computer & Statistics)',
          'ICS (Computer & Economics)',
          'I.Com (Commerce)',
          'F.A. (Humanities / Social Sciences)',
          'F.A. (Fine Arts)',
        ];
      case 'Undergraduate / ADP (2-Year)':
        return [
          'ADP Arts (BA - Bachelor of Arts)',
          'ADP Science (BSc - Bachelor of Science)',
          'ADP Computer Science (BSCS 2-Year)',
          'ADP Commerce (B.Com)',
          'ADP Business Administration (BBA 2-Year)',
        ];
      case 'Graduation (BS / Bachelor 4-Year)':
      case 'Graduation (BS / Master 16-Year)':
        return [
          'BS / Master in Computer Science',
          'BS / Master in Software Engineering',
          'BS / Master in Information Technology',
          'BS / Master in Business Administration (BBA / MBA)',
          'BS / Master in Mathematics',
          'BS / Master in Physics',
          'BS / Master in Chemistry',
          'BS / Master in English Literature',
          'BS / Master in Economics',
          'B.Ed / M.Ed (Education)',
        ];
      case 'M.Phil / MS (18-Year)':
      case 'Master / M.Phil':
        return [
          'MS Computer Science',
          'MS Software Engineering',
          'MS Information Technology',
          'MS Mathematics',
          'MS Physics',
          'MS Chemistry',
          'M.Phil English Literature',
          'M.Phil Economics',
          'M.Phil Education',
        ];
      case 'Ph.D. (Doctorate)':
        return [
          'Ph.D. Computer Science',
          'Ph.D. Software Engineering',
          'Ph.D. Mathematics',
          'Ph.D. Physics',
          'Ph.D. Chemistry',
          'Ph.D. English Literature',
          'Ph.D. Economics',
          'Ph.D. Education',
        ];
      case 'Primary':
        return ['General Primary Education (Class 1-5)'];
      case 'Middle':
        return ['General Middle Education (Class 6-8)'];
      default:
        return [];
    }
  };

  // Role ID Mapping
  const roleIdMap = {
    Teacher: 2,
    Student: 3,
    Parent: 4,
    Staff: 5,
  };

  // Submit Public Application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    // Role-specific validation
    if (selectedRole === 'Parent') {
      if (!childFullName.trim() || !childCnic.trim()) {
        setError("Please enter your Child's Full Name and CNIC / B-Form Number.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const fullQualificationStr = qualificationLevel
        ? `${qualificationLevel}${qualificationSubCategory ? ` - ${qualificationSubCategory}` : ''}`
        : '';

      const res = await publicOnboardApi({
        username: fullName.trim(),
        password: password.trim(),
        email: email.trim(),
        phoneNumber: contact.trim(),
        cnic: cnic.trim(),
        roleId: roleIdMap[selectedRole] || 3,
        qualificationGrade: fullQualificationStr,
        certifications: selectedRole === 'Parent' ? `Child Name: ${childFullName} | Child CNIC: ${childCnic}` : '',
        cvFile: selectedRole === 'Parent' ? '' : cvFile,
        degreeFile: selectedRole === 'Parent' ? '' : degreeFile,
        certificateFile: selectedRole === 'Parent' ? '' : certificateFile,
      });

      if (res.success) {
        setSubmittedApp({
          username: fullName.trim(),
          cnic: cnic.trim() || email.trim(),
          userId: res.userId,
        });
        setSuccessMsg('Your application has been submitted successfully!');
      } else {
        setError(res.error || 'Failed to submit application.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Server error during submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Check Application Status
  const handleCheckStatus = async (e) => {
    if (e) e.preventDefault();
    if (!searchIdentifier.trim()) {
      setError('Please enter your CNIC, Email, or Username.');
      return;
    }
    setError('');
    setStatusLoading(true);
    try {
      const res = await fetchOnboardStatusApi(searchIdentifier.trim());
      if (res.success) {
        setStatusApp(res.application);
      } else {
        setError(res.error || 'Application not found.');
        setStatusApp(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'No onboarding record found for this identifier.');
      setStatusApp(null);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: BrandConfig.fontFamily,
        padding: '1.5rem 1rem',
      }}
    >
      {/* Top Section Header */}
      <div style={{ maxWidth: '850px', width: '100%', margin: '0 auto 1.5rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            User Self Registration
          </h1>
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Academia Platform Public Onboarding Portal
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoToLogin}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#02658b',
            color: '#FFFFFF',
            padding: '0.5rem 1.1rem',
            borderRadius: '7px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(2,101,139,0.15)',
            transition: 'all 0.2s',
          }}
        >
          <span>Login</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Navigation Buttons (Submit New Application vs Check Application Status) */}
      <div style={{ maxWidth: '850px', width: '100%', margin: '0 auto 1.5rem auto', display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('apply');
            setError('');
            setSuccessMsg('');
          }}
          style={{
            flex: 1,
            padding: '0.8rem',
            borderRadius: '8px',
            border: activeTab === 'apply' ? '2px solid #02658b' : '1.5px solid #cbd5e1',
            background: activeTab === 'apply' ? '#ffffff' : '#f1f5f9',
            color: activeTab === 'apply' ? '#02658b' : '#64748b',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: activeTab === 'apply' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          <User size={18} />
          <span>Submit New Application</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('status');
            setError('');
            setSuccessMsg('');
          }}
          style={{
            flex: 1,
            padding: '0.8rem',
            borderRadius: '8px',
            border: activeTab === 'status' ? '2px solid #02658b' : '1.5px solid #cbd5e1',
            background: activeTab === 'status' ? '#ffffff' : '#f1f5f9',
            color: activeTab === 'status' ? '#02658b' : '#64748b',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: activeTab === 'status' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          <Search size={18} />
          <span>Check Application Status</span>
        </button>
      </div>

      {/* Main Form Container */}
      <main style={{ maxWidth: '850px', width: '100%', margin: '0 auto' }}>
        {/* Global Error Banner */}
        {error && (
          <div
            style={{
              padding: '0.85rem 1.1rem',
              background: '#ffe4e6',
              color: '#9f1239',
              borderRadius: '8px',
              border: '1px solid #fecdd3',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div
            style={{
              padding: '0.85rem 1.1rem',
              background: '#d1fae5',
              color: '#065f46',
              borderRadius: '8px',
              border: '1px solid #a7f3d0',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: NEW APPLICATION FORM */}
        {activeTab === 'apply' && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              padding: '1.75rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
            }}
          >
            {submittedApp ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#d1fae5',
                    color: '#065f46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem auto',
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Application Under Admin Review
                </h2>
                <p style={{ fontSize: '0.92rem', color: '#64748b', maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
                  Thank you, <strong>{submittedApp.username}</strong>! Your application and details have been securely submitted for Admin review.
                </p>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1.5px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '1.1rem',
                    maxWidth: '450px',
                    margin: '0 auto 2rem auto',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                    <span>CNIC / Reference Identifier:</span>
                    <strong style={{ color: '#0f172a' }}>{submittedApp.cnic}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                    <span>Account Status:</span>
                    <span style={{ color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> Pending Approval
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedApp(null);
                      setFullName('');
                      setPassword('');
                      setConfirmPassword('');
                      setEmail('');
                      setContact('');
                      setCnic('');
                      setChildFullName('');
                      setChildCnic('');
                      setCvFile('');
                      setDegreeFile('');
                      setCertificateFile('');
                    }}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Submit Another Application
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchIdentifier(submittedApp.cnic);
                      setActiveTab('status');
                      handleCheckStatus();
                    }}
                    style={{
                      background: '#02658b',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Check Live Status
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitApplication}>
                {/* 1. Rounded Role Pill Selector Buttons (Centered, Matching AddUserPage.jsx) */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      background: '#f1f5f9',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '50px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {/* Teacher Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('Teacher');
                        setQualificationLevel('');
                        setQualificationSubCategory('');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 1.2rem',
                        borderRadius: '50px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: selectedRole === 'Teacher' ? '1.5px solid #02658b' : '1.5px solid transparent',
                        background: selectedRole === 'Teacher' ? '#FFFFFF' : 'transparent',
                        color: selectedRole === 'Teacher' ? '#02658b' : '#64748b',
                        boxShadow: selectedRole === 'Teacher' ? '0 2px 5px rgba(2,101,139,0.12)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <GraduationCap size={15} color={selectedRole === 'Teacher' ? '#02658b' : '#64748b'} />
                      <span>Teacher</span>
                    </button>

                    {/* Student Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('Student');
                        setQualificationLevel('');
                        setQualificationSubCategory('');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 1.2rem',
                        borderRadius: '50px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: selectedRole === 'Student' ? '1.5px solid #02658b' : '1.5px solid transparent',
                        background: selectedRole === 'Student' ? '#FFFFFF' : 'transparent',
                        color: selectedRole === 'Student' ? '#02658b' : '#64748b',
                        boxShadow: selectedRole === 'Student' ? '0 2px 5px rgba(2,101,139,0.12)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <User size={15} color={selectedRole === 'Student' ? '#02658b' : '#64748b'} />
                      <span>Student</span>
                    </button>

                    {/* Parent Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('Parent');
                        setQualificationLevel('');
                        setQualificationSubCategory('');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 1.2rem',
                        borderRadius: '50px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: selectedRole === 'Parent' ? '1.5px solid #02658b' : '1.5px solid transparent',
                        background: selectedRole === 'Parent' ? '#FFFFFF' : 'transparent',
                        color: selectedRole === 'Parent' ? '#02658b' : '#64748b',
                        boxShadow: selectedRole === 'Parent' ? '0 2px 5px rgba(2,101,139,0.12)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Users size={15} color={selectedRole === 'Parent' ? '#02658b' : '#64748b'} />
                      <span>Parent</span>
                    </button>
                  </div>
                </div>

                {/* 2. Personal Details Form Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  {/* Full Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Muhammad Ali"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* CNIC */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {selectedRole === 'Parent' ? "Parent's Own CNIC Number *" : 'CNIC Number *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={cnic}
                      onChange={(e) => handleCnicChange(e, setCnic)}
                      placeholder="XXXXX-XXXXXXX-X"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Contact / Phone Number */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Contact Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => handleContactChange(e, setContact)}
                      placeholder="03XX XXXXXXX"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Set Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create account password"
                        style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.75rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Confirm Password *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* PARENT SPECIAL FIELDS */}
                {selectedRole === 'Parent' && (
                  <div style={{ background: '#f0f9ff', borderRadius: '8px', border: '1.5px solid #bae6fd', padding: '1rem', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0369a1', margin: '0 0 0.75rem 0' }}>
                      Child Information (Required for Parent Account)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                          Child's Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={childFullName}
                          onChange={(e) => setChildFullName(e.target.value)}
                          placeholder="e.g. Usman Ali"
                          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', background: '#FFFFFF' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                          Child's CNIC / B-Form Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={childCnic}
                          onChange={(e) => handleCnicChange(e, setChildCnic)}
                          placeholder="XXXXX-XXXXXXX-X"
                          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', background: '#FFFFFF' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. QUALIFICATION SECTION (Hidden completely for Parent role) */}
                {selectedRole !== 'Parent' && (
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1.5px solid #e2e8f0',
                      padding: '1.1rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem 0' }}>
                      Academic Qualification & Credentials
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      {/* Dropdown 1: Qualification Level / Category */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                          Qualification Level *
                        </label>
                        <select
                          value={qualificationLevel}
                          onChange={(e) => {
                            setQualificationLevel(e.target.value);
                            setQualificationSubCategory('');
                          }}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '6px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.88rem',
                            background: '#FFFFFF',
                          }}
                        >
                          {(qualificationLevelsByRole[selectedRole] || []).map((lvl, idx) => (
                            <option key={idx} value={idx === 0 ? '' : lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dropdown 2: Sub-Category / Major Discipline */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                          Major Group / Discipline Sub-Category
                        </label>
                        <select
                          disabled={!qualificationLevel}
                          value={qualificationSubCategory}
                          onChange={(e) => setQualificationSubCategory(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '6px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.88rem',
                            background: '#FFFFFF',
                          }}
                        >
                          <option value="">-- Select Group / Discipline --</option>
                          {getSubCategories(qualificationLevel).map((sub, idx) => (
                            <option key={idx} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. DOCUMENT UPLOADS SECTION (Hidden completely for Parent role) */}
                {selectedRole !== 'Parent' && (
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1.5px solid #e2e8f0',
                      padding: '1.1rem',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem 0' }}>
                      Document Uploads (Max 5MB per file)
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      {/* CV Upload (Greyed out for Students) */}
                      <div style={{ opacity: selectedRole === 'Student' ? 0.5 : 1 }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                          CV / Resume {selectedRole === 'Student' && '(Greyed Out for Students)'}
                        </label>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: '1.5px dashed #02658b',
                            background: '#ffffff',
                            cursor: selectedRole === 'Student' ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem',
                            color: '#02658b',
                            fontWeight: 600,
                          }}
                        >
                          <Upload size={14} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cvFileName || 'Upload CV (.pdf/.docx)'}
                          </span>
                          <input
                            type="file"
                            disabled={selectedRole === 'Student'}
                            accept=".pdf,.doc,.docx,.png,.jpg"
                            onChange={(e) => handleFileChange(e, setCvFile, setCvFileName)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>

                      {/* Degree Upload */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                          {selectedRole === 'Student' ? 'Educational Degree / Result Card' : 'Educational Degree'}
                        </label>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: '1.5px dashed #02658b',
                            background: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: '#02658b',
                            fontWeight: 600,
                          }}
                        >
                          <Upload size={14} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {degreeFileName || 'Upload Degree (.pdf/.png)'}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => handleFileChange(e, setDegreeFile, setDegreeFileName)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>

                      {/* Certificate Upload */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                          Certificates (Optional)
                        </label>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: '1.5px dashed #02658b',
                            background: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: '#02658b',
                            fontWeight: 600,
                          }}
                        >
                          <Upload size={14} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {certificateFileName || 'Upload Certificates'}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => handleFileChange(e, setCertificateFile, setCertificateFileName)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#02658b',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: submitting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Transmitting Application...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Submit Application for Admin Review</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: CHECK APPLICATION STATUS */}
        {activeTab === 'status' && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              padding: '1.75rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Track Application & Re-upload Documents
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                Enter your CNIC number, Email, or Username to view live review status or upload requested replacement documents.
              </p>
            </div>

            <form onSubmit={handleCheckStatus} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                required
                value={searchIdentifier}
                onChange={(e) => setSearchIdentifier(e.target.value)}
                placeholder="Enter CNIC (e.g. 42101-1234567-1) or Email"
                style={{
                  flex: 1,
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="submit"
                disabled={statusLoading}
                style={{
                  background: '#02658b',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.65rem 1.4rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {statusLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                <span>Check Status</span>
              </button>
            </form>

            {/* Application Status Result Box */}
            {statusApp && (
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', pb: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {statusApp.username}
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                      Role: {statusApp.roleName} | CNIC: {statusApp.cnic}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {statusApp.status === 'registered' && (
                      <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle2 size={15} /> Approved & Registered
                      </span>
                    )}
                    {statusApp.status !== 'registered' && (
                      <span style={{ background: '#e0f2fe', color: '#075985', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={15} /> Pending Admin Review
                      </span>
                    )}
                  </div>
                </div>

                {/* Case 1: Status = Registered */}
                {statusApp.status === 'registered' && (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ fontSize: '0.92rem', color: '#065f46', fontWeight: 600, marginBottom: '1rem' }}>
                      Your application has been approved by the Administrator! You can now log into your account dashboard.
                    </p>
                    <button
                      type="button"
                      onClick={handleGoToLogin}
                      style={{
                        background: '#02658b',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.6rem 1.4rem',
                        borderRadius: '6px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Proceed to Member Login
                    </button>
                  </div>
                )}

                {/* Case 2: Status = Pending */}
                {statusApp.status !== 'registered' && (
                  <div style={{ padding: '0.5rem 0' }}>
                    <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                      Your application is active and currently being evaluated by the Admin team. Once approved, your account will be activated immediately.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
