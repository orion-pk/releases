import React, { useState, useEffect, useRef } from 'react';
import { BrandConfig } from '../../../config/BrandConfig';
import { registerApi, fetchUsersApi, scanDocumentApi } from '../../../api';
import { MultiSelectDropdown } from '../../../components/MultiSelectDropdown';
import { getMimeType, handleCnicChange, handleContactChange } from '../../../utils/helpers';
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
  Mail,
  Copy,
  X,
  Plus,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

const ScannedDocumentPreview = ({ fileObj, fileName }) => {
  const [zoom, setZoom] = useState(1.0);

  if (!fileObj) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '380px',
          color: '#94a3b8',
          gap: '0.5rem',
        }}
      >
        <FileText size={36} color="#cbd5e1" />
        <span style={{ fontSize: '0.82rem' }}>No document preview available</span>
      </div>
    );
  }

  const rawData = typeof fileObj === 'string' ? fileObj : fileObj.data;
  const name = fileName || fileObj.name || 'Document';
  const type = (fileObj.type || '').toLowerCase();
  const isPdf =
    type.includes('pdf') ||
    (typeof rawData === 'string' && rawData.startsWith('data:application/pdf')) ||
    name.toLowerCase().endsWith('.pdf');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '460px',
        maxHeight: '620px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Preview Header & Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, overflow: 'hidden' }}>
          {isPdf ? <FileText size={16} color="#ef4444" style={{ flexShrink: 0 }} /> : <ImageIcon size={16} color="#02658b" style={{ flexShrink: 0 }} />}
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#1e293b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={name}
          >
            {name}
          </span>
        </div>

        {!isPdf && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100))}
              style={{
                padding: '0.25rem 0.45rem',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Zoom Out"
            >
              <ZoomOut size={13} color="#475569" />
            </button>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', minWidth: '38px', textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3.0, Math.round((prev + 0.25) * 100) / 100))}
              style={{
                padding: '0.25rem 0.45rem',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Zoom In"
            >
              <ZoomIn size={13} color="#475569" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1.0)}
              style={{
                padding: '0.25rem 0.45rem',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Reset Zoom (100%)"
            >
              <RotateCcw size={12} color="#475569" />
            </button>
          </div>
        )}
      </div>

      {/* Preview Body */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: isPdf ? '0' : '0.75rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: isPdf ? 'stretch' : 'flex-start',
          background: isPdf ? '#525659' : '#f1f5f9',
          position: 'relative',
        }}
      >
        {isPdf ? (
          rawData ? (
            <iframe
              src={rawData}
              title={name}
              style={{ width: '100%', height: '100%', minHeight: '460px', border: 'none' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ffffff' }}>
              PDF Document
            </div>
          )
        ) : rawData ? (
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
              display: 'inline-block',
            }}
          >
            <img
              src={rawData}
              alt={name}
              style={{
                maxWidth: '100%',
                maxHeight: '520px',
                objectFit: 'contain',
                borderRadius: '4px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
            No image data available
          </div>
        )}
      </div>
    </div>
  );
};

const EditableOcrField = ({
  label,
  value,
  fieldKey,
  editingFieldKey,
  setEditingFieldKey,
  onChange,
  isFullWidth = false,
  customColor,
  fontWeight,
}) => {
  const isEditing = editingFieldKey === fieldKey;

  return (
    <div style={{ gridColumn: isFullWidth ? 'span 2' : 'span 1' }}>
      <span
        style={{
          fontSize: '0.76rem',
          color: '#64748b',
          fontWeight: 600,
          display: 'block',
          marginBottom: '0.12rem',
        }}
      >
        {label}
      </span>
      {isEditing ? (
        <input
          autoFocus
          type="text"
          value={value ?? ''}
          placeholder={`Enter ${label}...`}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditingFieldKey(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              setEditingFieldKey(null);
            }
          }}
          style={{
            width: '100%',
            fontSize: '0.88rem',
            padding: '0.28rem 0.5rem',
            borderRadius: '6px',
            border: '1.5px solid #02658b',
            outline: 'none',
            background: '#ffffff',
            color: '#1e293b',
            fontWeight: fontWeight || 600,
            boxSizing: 'border-box',
            boxShadow: '0 0 0 2px rgba(2, 101, 139, 0.15)',
          }}
        />
      ) : (
        <div
          onClick={() => setEditingFieldKey(fieldKey)}
          title="Click to edit field"
          style={{
            fontSize: '0.88rem',
            color: customColor || (value ? '#1e293b' : '#94a3b8'),
            fontWeight: fontWeight || 600,
            cursor: 'pointer',
            padding: '0.2rem 0.35rem',
            marginLeft: '-0.35rem',
            borderRadius: '5px',
            transition: 'background 0.15s ease',
            display: 'inline-block',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {value || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>N/A (Click to edit)</span>}
        </div>
      )}
    </div>
  );
};

export const AddUserPage = () => {
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
  const [linkedStudentIds, setLinkedStudentIds] = useState([]);
  const [linkedTeacherIds, setLinkedTeacherIds] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalCopied, setModalCopied] = useState(false);
  const [modalAssignedOpen, setModalAssignedOpen] = useState(false);
  const modalAssignedDropdownRef = useRef(null);

  useEffect(() => {
    if (!modalAssignedOpen) return;
    const handleClickOutside = (e) => {
      if (modalAssignedDropdownRef.current && !modalAssignedDropdownRef.current.contains(e.target)) {
        setModalAssignedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalAssignedOpen]);

  const handleToggleAddUserStudent = (stId) => {
    const idStr = String(stId);
    setLinkedStudentIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    );
  };

  const handleToggleAddUserTeacher = (tcId) => {
    const idStr = String(tcId);
    setLinkedTeacherIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    );
  };

  // Qualification State
  const [qualificationGrade, setQualificationGrade] = useState('');
  const [certificationsText, setCertificationsText] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [degreeFile, setDegreeFile] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);
  const [uploadedDegrees, setUploadedDegrees] = useState([]);
  const [viewingDegree, setViewingDegree] = useState(null);
  const [currentDegreeUpload, setCurrentDegreeUpload] = useState(null);
  const [currentOcrData, setCurrentOcrData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [ocrModalData, setOcrModalData] = useState(null);
  const [editingFieldKey, setEditingFieldKey] = useState(null);

  const updateCurrentOcrField = (key, val) => {
    if (key === 'marksObtained') {
      if (val.includes('/')) {
        const parts = val.split('/');
        setCurrentOcrData((prev) => ({
          ...prev,
          marksObtained: parts[0].trim(),
          totalMarks: parts[1]?.trim() || prev?.totalMarks || '1100',
        }));
      } else {
        setCurrentOcrData((prev) => ({ ...prev, marksObtained: val }));
      }
    } else {
      setCurrentOcrData((prev) => ({ ...prev, [key]: val }));
    }
  };

  const updateViewingDegreeField = (key, val) => {
    setViewingDegree((prev) => {
      if (!prev) return prev;
      let updatedOcr = { ...(prev.ocrData || {}) };
      if (key === 'marksObtained') {
        if (val.includes('/')) {
          const parts = val.split('/');
          updatedOcr.marksObtained = parts[0].trim();
          updatedOcr.totalMarks = parts[1]?.trim() || updatedOcr.totalMarks || '1100';
        } else {
          updatedOcr.marksObtained = val;
        }
      } else {
        updatedOcr[key] = val;
      }
      const updated = {
        ...prev,
        ocrData: updatedOcr,
        title: key === 'degreeName' ? (val || prev.title) : prev.title,
      };
      setUploadedDegrees((list) =>
        list.map((item) => (item.id === prev.id ? updated : item))
      );
      return updated;
    });
  };

  const handleFileSelection = (file, setFileState) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileState({
        name: file.name,
        type: file.type || getMimeType(file.name),
        size: file.size,
        data: e.target.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const dataURLtoBlob = (dataurl) => {
    try {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch {
      return new Blob([], { type: 'application/octet-stream' });
    }
  };

  const openDocInNewTab = (doc) => {
    if (!doc || !doc.fileObj) return;
    const dataStr = doc.fileObj.data || (typeof doc.fileObj === 'string' && doc.fileObj.startsWith('data:') ? doc.fileObj : null);
    if (dataStr && dataStr.startsWith('data:')) {
      const blob = dataURLtoBlob(dataStr);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    }
  };

  const OCR_TOTAL_FIELDS = 13;
  const OCR_FIELD_KEYS = [
    'boardName',
    'degreeName',
    'fullName',
    'fatherName',
    'rollNo',
    'registrationNo',
    'examMonth',
    'marksObtained',
    'totalMarks',
    'grade',
    'group',
    'institution',
    'dob',
  ];

  const countExtractedFields = (data) => {
    if (!data) return 0;
    return OCR_FIELD_KEYS.filter((key) => {
      const val = data[key];
      return val && typeof val === 'string' && val.trim().length > 0 && val.trim() !== 'N/A';
    }).length;
  };

  const handleOcrDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileSelection(file, (fileObj) => {
      setCurrentDegreeUpload(fileObj);
    });
    setIsScanning(true);
    setScanMessage('Scanning document...');
    setErrorMessage(null);

    try {
      const res = await scanDocumentApi(file);
      if (res && res.success && res.data) {
        const d = res.data;
        setOcrModalData(d);
        setCurrentOcrData(d);
        const count = countExtractedFields(d);
        const docName = file.name || d.degreeName || d.boardName || 'Document';
        setScanMessage(`Scanned: ${docName} (${count}/${OCR_TOTAL_FIELDS} fields extracted)`);
      } else {
        setScanMessage('Document processed.');
      }
    } catch {
      setScanMessage('Document scanning failed.');
    } finally {
      setIsScanning(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleOpenUploadModal = () => {
    setViewingDegree(null);
    setCurrentDegreeUpload(null);
    setCurrentOcrData(null);
    setScanMessage('');
    setShowDocsModal(true);
  };

  const handleCancelDocsModal = () => {
    setCurrentDegreeUpload(null);
    setCurrentOcrData(null);
    setScanMessage('');
    setShowDocsModal(false);
    setViewingDegree(null);
  };

  const handleSaveDegreeModal = () => {
    if (currentDegreeUpload) {
      const newDeg = {
        id: Date.now() + Math.random(),
        file: currentDegreeUpload,
        fileName: currentDegreeUpload.name,
        ocrData: currentOcrData || ocrModalData,
        title: (currentOcrData || ocrModalData)?.degreeName || currentDegreeUpload.name || 'Degree',
      };
      setUploadedDegrees((prev) => [...prev, newDeg]);
      setDegreeFile(currentDegreeUpload);
      setCurrentDegreeUpload(null);
      setCurrentOcrData(null);
    }
    setShowDocsModal(false);
    setViewingDegree(null);
    setScanMessage('');
  };

  const handleViewDegreeDetails = (deg) => {
    setViewingDegree(deg);
    setShowDocsModal(true);
  };

  const handleDeleteDegree = (id) => {
    setUploadedDegrees((prev) => prev.filter((d) => d.id !== id));
  };

  // Access State
  const [accessGrade, setAccessGrade] = useState('');
  const [accessSubject, setAccessSubject] = useState('');
  const [systemUsersList, setSystemUsersList] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetchUsersApi();
        if (res.success) {
          setSystemUsersList(res.users || []);
        }
      } catch {
        // Ignored - fallback
      }
    };
    loadUsers();
  }, []);

  const defaultPermissions = {
    'students:view': true,
    'students:create': false,
    'students:edit': false,
    'students:delete': false,
    'teachers:view': true,
    'teachers:create': false,
    'teachers:edit': false,
    'teachers:delete': false,
    'classes:view': true,
    'classes:create': false,
    'classes:edit': false,
    'classes:delete': false,
    'users:view': false,
    'users:create': false,
    'users:edit': false,
    'users:delete': false,
  };

  const studentOptionsList = systemUsersList.filter((u) =>
    u.roles && (u.roles.includes('Student') || u.roles.some?.((r) => r.roleName === 'Student' || r.id === 3))
  );

  const teacherOptionsList = systemUsersList.filter((u) =>
    u.roles && (u.roles.includes('Teacher') || u.roles.some?.((r) => r.roleName === 'Teacher' || r.id === 2))
  );

  // Submission / Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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

    if (password && password !== confirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    const finalPassword = password || `temp_${Math.random().toString(36).substring(2, 10)}`;
    const finalStatus = 'pending_activation';

    setLoading(true);

    try {
      let roleId = 2; // Teacher default
      if (selectedRole === 'Student') roleId = 3;
      else if (selectedRole === 'Parent') roleId = 4;

      const res = await registerApi({
        username: fullName.trim(),
        password: finalPassword,
        email: email.trim(),
        phoneNumber: contact.trim() || '1234567890',
        status: finalStatus,
        roleId: roleId,
        cnic: cnic.trim(),
        qualificationGrade: qualificationGrade,
        certifications: certificationsText.trim(),
        cvFile: cvFile ? (typeof cvFile === 'object' && cvFile.data ? JSON.stringify(cvFile) : cvFile.name || String(cvFile)) : null,
        degreeFile: uploadedDegrees.length > 0
          ? (uploadedDegrees.length === 1
              ? (typeof uploadedDegrees[0].file === 'object' && uploadedDegrees[0].file.data
                  ? JSON.stringify({
                      name: uploadedDegrees[0].fileName,
                      type: uploadedDegrees[0].file?.type,
                      size: uploadedDegrees[0].file?.size,
                      data: uploadedDegrees[0].file?.data,
                      ocrData: uploadedDegrees[0].ocrData,
                    })
                  : uploadedDegrees[0].fileName || String(uploadedDegrees[0].file))
              : JSON.stringify(uploadedDegrees.map((d) => ({
                  name: d.fileName,
                  type: d.file?.type,
                  size: d.file?.size,
                  data: d.file?.data,
                  ocrData: d.ocrData,
                })))
            )
          : (degreeFile ? (typeof degreeFile === 'object' && degreeFile.data ? JSON.stringify(degreeFile) : degreeFile.name || String(degreeFile)) : null),
        certificateFile: certificateFile ? (typeof certificateFile === 'object' && certificateFile.data ? JSON.stringify(certificateFile) : certificateFile.name || String(certificateFile)) : null,
        accessGrade: accessGrade,
        accessSubject: accessSubject,
        permissionsJson: JSON.stringify({
          ...defaultPermissions,
          linkedStudentId: linkedStudentIds.join(','),
          linkedStudentIds: linkedStudentIds,
          linkedTeacherId: linkedTeacherIds.join(','),
          linkedTeacherIds: linkedTeacherIds,
        }),
      });

      if (res.success || res.user || res.message?.includes('success')) {
        const fullUrl = res.invitationUrl ? `${window.location.origin}${res.invitationUrl}` : '';

        const getDocLabel = (val) => {
          if (!val) return 'Not Uploaded';
          if (typeof val === 'object' && val.name) return val.name;
          if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const parsed = JSON.parse(trimmed);
                if (parsed.name) return parsed.name;
                if (parsed.fileName) return parsed.fileName;
              } catch {
                // Ignored - fallback
              }
            }
            return trimmed;
          }
          return 'Uploaded Document';
        };

        const docs = [];
        if (selectedRole === 'Teacher') {
          docs.push({ label: 'CV Document', fileObj: cvFile, name: getDocLabel(cvFile), present: !!cvFile });
          if (uploadedDegrees.length > 1) {
            uploadedDegrees.forEach((d, i) => {
              docs.push({ label: `Degree #${i + 1}`, fileObj: d.file, name: d.fileName, present: true });
            });
          } else {
            const degObj = uploadedDegrees.length === 1 ? uploadedDegrees[0].file : degreeFile;
            const degName = uploadedDegrees.length === 1 ? uploadedDegrees[0].fileName : getDocLabel(degreeFile);
            docs.push({ label: 'Degree Document', fileObj: degObj, name: degName, present: uploadedDegrees.length > 0 || !!degreeFile });
          }
          docs.push({ label: 'Certificate', fileObj: certificateFile, name: getDocLabel(certificateFile), present: !!certificateFile });
        } else if (selectedRole === 'Student') {
          if (uploadedDegrees.length > 1) {
            uploadedDegrees.forEach((d, i) => {
              docs.push({ label: `Degree #${i + 1}`, fileObj: d.file, name: d.fileName, present: true });
            });
          } else {
            const degObj = uploadedDegrees.length === 1 ? uploadedDegrees[0].file : degreeFile;
            const degName = uploadedDegrees.length === 1 ? uploadedDegrees[0].fileName : getDocLabel(degreeFile);
            docs.push({ label: 'Degree / Record', fileObj: degObj, name: degName, present: uploadedDegrees.length > 0 || !!degreeFile });
          }
          docs.push({ label: 'Certificate', fileObj: certificateFile, name: getDocLabel(certificateFile), present: !!certificateFile });
        } else {
          docs.push({ label: 'Document 1', fileObj: cvFile || degreeFile || uploadedDegrees[0]?.file, name: getDocLabel(cvFile) !== 'Not Uploaded' ? getDocLabel(cvFile) : (uploadedDegrees[0]?.fileName || getDocLabel(degreeFile)), present: !!(cvFile || degreeFile || uploadedDegrees.length > 0) });
          docs.push({ label: 'Document 2', fileObj: certificateFile, name: getDocLabel(certificateFile), present: !!certificateFile });
        }

        let assignedFieldLabel = 'Assigned';
        let assignedList = [];

        if (selectedRole === 'Teacher') {
          assignedFieldLabel = 'Assigned Student(s)';
          assignedList = linkedStudentIds.map(
            (id) => studentOptionsList.find((s) => String(s.id) === String(id))?.username || `Student #${id}`
          );
        } else if (selectedRole === 'Parent') {
          assignedFieldLabel = 'Linked Child(ren)';
          assignedList = linkedStudentIds.map(
            (id) => studentOptionsList.find((s) => String(s.id) === String(id))?.username || `Child #${id}`
          );
        } else if (selectedRole === 'Student') {
          assignedFieldLabel = 'Assigned Teacher(s)';
          assignedList = linkedTeacherIds.map(
            (id) => teacherOptionsList.find((t) => String(t.id) === String(id))?.username || `Teacher #${id}`
          );
        }

        setModalAssignedOpen(false);
        setModalData({
          name: fullName.trim(),
          email: email.trim(),
          contact: contact.trim(),
          cnic: cnic.trim(),
          role: selectedRole,
          activationUrl: fullUrl,
          docs: docs,
          assignedFieldLabel: assignedFieldLabel,
          assignedList: assignedList,
        });

        // Wipe out form completely
        setFullName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setContact('');
        setCnic('');
        setQualificationGrade('');
        setCertificationsText('');
        setCvFile(null);
        setDegreeFile(null);
        setCertificateFile(null);
        setUploadedDegrees([]);
        setViewingDegree(null);
        setCurrentDegreeUpload(null);
        setCurrentOcrData(null);
        setOcrModalData(null);
        setAccessGrade('');
        setAccessSubject('');
        setLinkedStudentIds([]);
        setLinkedTeacherIds([]);
        setSuccessMessage(null);
        setErrorMessage(null);

        setShowSuccessModal(true);
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              Personal Information
            </h3>
          </div>

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
                onChange={(e) => handleCnicChange(e, setCnic)}
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
                onChange={(e) => handleContactChange(e, setContact)}
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
            padding: '0.65rem 1.15rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            opacity: isQualificationFunctional ? 1 : 0.45,
            pointerEvents: isQualificationFunctional ? 'auto' : 'none',
            transition: 'opacity 0.25s ease',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: uploadedDegrees.length > 0 ? '0.5rem' : '0.25rem' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              Qualification
            </h3>
            {uploadedDegrees.length > 0 && (
              <button
                type="button"
                onClick={handleOpenUploadModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  height: '30px',
                  background: '#02658b',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(2,101,139,0.18)',
                  transition: 'background 0.15s ease',
                }}
                title="Add more degrees or documents"
              >
                <Plus size={14} />
                <span>Add Documents</span>
              </button>
            )}
          </div>

          {uploadedDegrees.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <button
                type="button"
                onClick={handleOpenUploadModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  height: '34px',
                  background: '#02658b',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0 1.25rem',
                  borderRadius: '7px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(2,101,139,0.18)',
                  transition: 'background 0.15s ease',
                }}
                title="Upload CV, Degree and Certificate documents"
              >
                <Upload size={15} />
                <span>Add Documents</span>
              </button>
              {(cvFile || certificateFile) && (
                <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={14} color="#16a34a" />
                  <span>
                    {[
                      cvFile ? 'CV' : null,
                      certificateFile ? 'Certificates' : null,
                    ].filter(Boolean).join(', ')} attached
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.15rem 0',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {uploadedDegrees.map((deg, idx) => (
                <div
                  key={deg.id || idx}
                  onClick={() => handleViewDegreeDetails(deg)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#f8fafc',
                    border: '1.5px solid #0284c7',
                    borderRadius: '8px',
                    padding: '0.4rem 0.75rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(2,132,199,0.1)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Click to view degree data & Alma Mater details"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0f9ff';
                    e.currentTarget.style.borderColor = '#02658b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#0284c7';
                  }}
                >
                  <div style={{ width: '26px', height: '26px', borderRadius: '5px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GraduationCap size={15} color="#0284c7" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                      {deg.ocrData?.degreeName || deg.title || deg.fileName || `Degree #${idx + 1}`}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                      {deg.ocrData?.boardName || (deg.ocrData?.marksObtained ? `Marks: ${deg.ocrData.marksObtained}` : 'Scanned Degree')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDegree(deg.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: '0.2rem',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                    title="Remove degree"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {(cvFile || certificateFile) && (
                <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
                  <CheckCircle2 size={13} color="#16a34a" />
                  <span>
                    {[
                      cvFile ? 'CV' : null,
                      certificateFile ? 'Certificates' : null,
                    ].filter(Boolean).join(', ')} attached
                  </span>
                </div>
              )}
            </div>
          )}
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
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.75rem',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* 1. Grades (Row 1, Col 1) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0, gridColumn: '1 / span 1' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: selectedRole === 'Parent' ? '#94a3b8' : '#334155' }}>
                Grades
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <select
                  value={accessGrade}
                  disabled={selectedRole === 'Parent'}
                  onChange={(e) => setAccessGrade(e.target.value)}
                  style={{
                    height: '39px',
                    width: '100%',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    padding: '0 2.5rem 0 0.8rem',
                    fontSize: '0.85rem',
                    color: selectedRole === 'Parent' ? '#94a3b8' : accessGrade ? '#0f172a' : '#94a3b8',
                    outline: 'none',
                    background: selectedRole === 'Parent' ? '#f1f5f9' : '#FFFFFF',
                    cursor: selectedRole === 'Parent' ? 'not-allowed' : 'pointer',
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

            {/* 2. Subjects (Row 1, Col 2) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0, gridColumn: '2 / span 1' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: selectedRole === 'Parent' ? '#94a3b8' : '#334155' }}>
                Subjects
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <select
                  value={accessSubject}
                  disabled={selectedRole === 'Parent'}
                  onChange={(e) => setAccessSubject(e.target.value)}
                  style={{
                    height: '39px',
                    width: '100%',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    padding: '0 2.5rem 0 0.8rem',
                    fontSize: '0.85rem',
                    color: selectedRole === 'Parent' ? '#94a3b8' : accessSubject ? '#0f172a' : '#94a3b8',
                    outline: 'none',
                    background: selectedRole === 'Parent' ? '#f1f5f9' : '#FFFFFF',
                    cursor: selectedRole === 'Parent' ? 'not-allowed' : 'pointer',
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

            {/* 3. MultiSelectDropdown (Row 2, Col 1 - Under Grades) */}
            {(selectedRole === 'Parent' || selectedRole === 'Teacher') && (
              <div style={{ gridColumn: '1 / span 1', minWidth: 0 }}>
                <MultiSelectDropdown
                  label={selectedRole === 'Parent' ? 'Link Student Children' : 'Assign Students'}
                  placeholder={selectedRole === 'Parent' ? '-- Select Student Children --' : '-- Select Students to Assign --'}
                  options={studentOptionsList.map((st) => ({ id: st.id, name: `${st.username} (ID: ${st.id})` }))}
                  selectedIds={linkedStudentIds}
                  onToggle={handleToggleAddUserStudent}
                />
              </div>
            )}

            {/* MultiSelectDropdown for Student assigning Teacher(s) */}
            {selectedRole === 'Student' && (
              <div style={{ gridColumn: '1 / span 1', minWidth: 0 }}>
                <MultiSelectDropdown
                  label="Assign Teacher(s)"
                  placeholder="-- Select Teacher(s) to Assign --"
                  options={teacherOptionsList.map((tc) => ({ id: tc.id, name: `${tc.username} (ID: ${tc.id})` }))}
                  selectedIds={linkedTeacherIds}
                  onToggle={handleToggleAddUserTeacher}
                />
              </div>
            )}
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

      {/* SUCCESS MODAL DIALOGUE */}
      {showSuccessModal && modalData && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Header with Title and Close Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  User Created Successfully
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* User Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #edf2f7' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Full Name</span>
                <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>{modalData.name}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Role</span>
                <span style={{ fontSize: '0.88rem', color: '#02658b', fontWeight: 700 }}>{modalData.role}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>CNIC</span>
                <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>{modalData.cnic || 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Contact</span>
                <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>{modalData.contact || 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Email Address</span>
                <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600, wordBreak: 'break-all' }}>{modalData.email}</span>
              </div>
              <div ref={modalAssignedDropdownRef} style={{ position: 'relative' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                  {modalData.assignedFieldLabel || 'Assigned'}
                </span>
                <button
                  type="button"
                  onClick={() => setModalAssignedOpen(!modalAssignedOpen)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    color: '#1e293b',
                    fontWeight: 600,
                  }}
                >
                  <span>
                    {modalData.assignedList && modalData.assignedList.length > 0
                      ? `${modalData.assignedList.length} ${modalData.assignedFieldLabel || 'Assigned'}`
                      : `0 ${modalData.assignedFieldLabel || 'Assigned'}`}
                  </span>
                  <ChevronDown size={14} color="#64748b" style={{ transform: modalAssignedOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                </button>

                {modalAssignedOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '6px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                      maxHeight: '130px',
                      overflowY: 'auto',
                      zIndex: 100,
                      padding: '0.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    {modalData.assignedList && modalData.assignedList.length > 0 ? (
                      modalData.assignedList.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '0.3rem 0.5rem',
                            borderRadius: '4px',
                            background: '#f8fafc',
                            fontSize: '0.78rem',
                            color: '#334155',
                            fontWeight: 500,
                            border: '1px solid #f1f5f9',
                          }}
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '0.4rem', fontSize: '0.76rem', color: '#94a3b8', textAlign: 'center' }}>
                        None Assigned
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Documents Inline Rectangle Boxes */}
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem', display: 'block' }}>
                Uploaded Documents
              </span>
              <div style={{ display: 'flex', gap: '0.6rem', width: '100%', flexWrap: 'wrap' }}>
                {modalData.docs.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (doc.present && doc.fileObj) {
                        openDocInNewTab(doc);
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: '130px',
                      background: doc.present ? '#e0f2fe' : '#f8fafc',
                      border: `1px solid ${doc.present ? '#bae6fd' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '0.55rem 0.65rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      cursor: doc.present && doc.fileObj ? 'pointer' : 'default',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (doc.present && doc.fileObj) {
                        e.currentTarget.style.background = '#dbeafe';
                        e.currentTarget.style.borderColor = '#93c5fd';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (doc.present && doc.fileObj) {
                        e.currentTarget.style.background = '#e0f2fe';
                        e.currentTarget.style.borderColor = '#bae6fd';
                      }
                    }}
                    title={doc.present && doc.fileObj ? 'Click to open in new tab' : undefined}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: doc.present ? '#02658b' : '#64748b', textTransform: 'uppercase' }}>
                        {doc.label}
                      </span>
                      {doc.present && doc.fileObj && <ExternalLink size={12} color="#02658b" />}
                    </div>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: doc.present ? '#1e293b' : '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 600,
                      }}
                      title={doc.name}
                    >
                      {doc.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activation URL Input + Copy & Email Beside Icons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                Activation URL
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={modalData.activationUrl}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    fontSize: '0.8rem',
                    color: '#334155',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  title="Copy URL"
                  onClick={() => {
                    navigator.clipboard.writeText(modalData.activationUrl);
                    setModalCopied(true);
                    setTimeout(() => setModalCopied(false), 2000);
                  }}
                  style={{
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #02658b',
                    background: modalCopied ? '#059669' : '#02658b',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {modalCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  type="button"
                  title="Send via Email"
                  onClick={() => {
                    const subject = `Welcome to Academia Platform - Activate Your Account`;
                    let clickUrl = modalData.activationUrl;
                    if (clickUrl.includes('127.0.0.1:')) {
                      clickUrl = clickUrl.replace('127.0.0.1:', 'localhost:');
                    }
                    const body = `Hello ${modalData.name.trim()},\n\nWelcome to Academia Platform! Your account has been created by the System Administrator.\n\nPlease click the link below to set your password and activate your profile (valid for 24 hours):\n\n${clickUrl}\n\nAccount Role: ${modalData.role}\n\nThank you!\nAcademia Admin Team`;
                    window.location.href = `mailto:${encodeURIComponent(modalData.email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  }}
                  style={{
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    background: '#475569',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Mail size={16} />
                </button>
              </div>
            </div>

            {/* Bottom Footer Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                style={{
                  padding: '0.5rem 1.4rem',
                  borderRadius: '6px',
                  background: '#02658b',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DOCUMENTS & CREDENTIALS UPLOAD / DETAILS DIALOGUE */}
      {showDocsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: (viewingDegree || currentOcrData) ? '1020px' : '540px',
              minHeight: (viewingDegree || currentOcrData) ? '690px' : 'auto',
              maxHeight: '96vh',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              padding: '1.3rem 1.3rem 1.6rem 1.3rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
              position: 'relative',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }}
          >
            {viewingDegree ? (
              /* VIEW MODE: Existing Degree Details + Right Side Document Preview */
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.1rem', alignItems: 'start' }}>
                {/* Left Column: Data Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <GraduationCap size={20} color="#02658b" />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: '#0f172a' }}>
                          {viewingDegree.ocrData?.degreeName || viewingDegree.title || 'Degree Details'}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {viewingDegree.ocrData?.boardName || viewingDegree.fileName || 'Educational Degree / Record'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setViewingDegree(null);
                        setShowDocsModal(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Extracted Document's Details Grid for Viewing Degree */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      background: '#f8fafc',
                      padding: '0.95rem',
                      borderRadius: '8px',
                      border: '1px solid #edf2f7',
                    }}
                  >
                    <EditableOcrField
                      label="Board Name"
                      value={viewingDegree.ocrData?.boardName}
                      fieldKey="view_boardName"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      customColor="#02658b"
                      fontWeight={700}
                      onChange={(val) => updateViewingDegreeField('boardName', val)}
                    />
                    <EditableOcrField
                      label="Degree / Exam"
                      value={viewingDegree.ocrData?.degreeName}
                      fieldKey="view_degreeName"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      onChange={(val) => updateViewingDegreeField('degreeName', val)}
                    />
                    <EditableOcrField
                      label="Candidate / Student Name"
                      value={viewingDegree.ocrData?.fullName || fullName}
                      fieldKey="view_fullName"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      onChange={(val) => updateViewingDegreeField('fullName', val)}
                    />
                    <EditableOcrField
                      label="Father's Name"
                      value={viewingDegree.ocrData?.fatherName}
                      fieldKey="view_fatherName"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      onChange={(val) => updateViewingDegreeField('fatherName', val)}
                    />
                    <EditableOcrField
                      label="Roll Number"
                      value={viewingDegree.ocrData?.rollNo}
                      fieldKey="view_rollNo"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      onChange={(val) => updateViewingDegreeField('rollNo', val)}
                    />
                    <EditableOcrField
                      label="Registration Number"
                      value={viewingDegree.ocrData?.registrationNo}
                      fieldKey="view_registrationNo"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      onChange={(val) => updateViewingDegreeField('registrationNo', val)}
                    />
                    <EditableOcrField
                      label="Exam Session / Month Held"
                      value={viewingDegree.ocrData?.examMonth}
                      fieldKey="view_examMonth"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      onChange={(val) => updateViewingDegreeField('examMonth', val)}
                    />
                    <EditableOcrField
                      label="Marks (Obtained / Total)"
                      value={viewingDegree.ocrData?.marksObtained ? `${viewingDegree.ocrData.marksObtained} / ${viewingDegree.ocrData.totalMarks || '1100'}` : (viewingDegree.ocrData?.marksObtained || '')}
                      fieldKey="view_marksObtained"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      customColor="#16a34a"
                      fontWeight={700}
                      onChange={(val) => updateViewingDegreeField('marksObtained', val)}
                    />
                    <EditableOcrField
                      label="Grade"
                      value={viewingDegree.ocrData?.grade || qualificationGrade}
                      fieldKey="view_grade"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      fontWeight={700}
                      onChange={(val) => updateViewingDegreeField('grade', val)}
                    />
                    <EditableOcrField
                      label="Group"
                      value={viewingDegree.ocrData?.group}
                      fieldKey="view_group"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      onChange={(val) => updateViewingDegreeField('group', val)}
                    />
                    <EditableOcrField
                      label="School / College / Institution"
                      value={viewingDegree.ocrData?.institution}
                      fieldKey="view_institution"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      isFullWidth={true}
                      onChange={(val) => updateViewingDegreeField('institution', val)}
                    />
                    <EditableOcrField
                      label="Date of Birth"
                      value={viewingDegree.ocrData?.dob}
                      fieldKey="view_dob"
                      editingFieldKey={editingFieldKey}
                      setEditingFieldKey={setEditingFieldKey}
                      isFullWidth={true}
                      onChange={(val) => updateViewingDegreeField('dob', val)}
                    />
                  </div>
                </div>

                {/* Right Column: Interactive Document Preview */}
                <div style={{ minWidth: 0, height: '100%' }}>
                  <ScannedDocumentPreview fileObj={viewingDegree.file} fileName={viewingDegree.fileName} />
                </div>
              </div>
            ) : currentOcrData ? (
              /* UPLOAD MODE WITH OCR DATA: 2 Columns (Details on Left + Preview on Right) + Bottom Save Footer */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.1rem', alignItems: 'start' }}>
                {/* Left Column: Upload Controls & Extracted Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
                  {/* Top Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Upload size={18} color="#02658b" />
                      <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: '#0f172a' }}>
                        Upload Documents
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelDocsModal}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* 3 Upload Buttons Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '0.6rem',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* 1. Upload CV Button */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.6rem 0.55rem',
                        minHeight: '40px',
                        borderRadius: '8px',
                        border: cvFile ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                        background: cvFile ? '#f0fdf4' : '#f8fafc',
                        color: cvFile ? '#16a34a' : '#1e293b',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: isCvUploadFunctional ? 'pointer' : 'not-allowed',
                        opacity: isCvUploadFunctional ? 1 : 0.45,
                        pointerEvents: isCvUploadFunctional ? 'auto' : 'none',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,image/*,*"
                        disabled={!isCvUploadFunctional}
                        onChange={(e) => handleFileSelection(e.target.files[0], setCvFile)}
                        style={{ display: 'none' }}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                        title={cvFile ? (cvFile.name || cvFile) : 'Upload CV'}
                      >
                        {cvFile ? (cvFile.name || cvFile) : 'Upload CV'}
                      </span>
                    </label>

                    {/* 2. Upload Recent Degree Button */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.6rem 0.55rem',
                        minHeight: '40px',
                        borderRadius: '8px',
                        border: isScanning ? '1.5px solid #0284c7' : (currentDegreeUpload ? '1.5px solid #16a34a' : '1px solid #cbd5e1'),
                        background: isScanning ? '#f0f9ff' : (currentDegreeUpload ? '#f0fdf4' : '#f8fafc'),
                        color: currentDegreeUpload ? '#16a34a' : (isScanning ? '#0284c7' : '#1e293b'),
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: isScanning ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,image/*,*"
                        onChange={handleOcrDocumentUpload}
                        disabled={isScanning}
                        style={{ display: 'none' }}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                        title={isScanning ? 'Processing Degree...' : (currentDegreeUpload?.name || 'Upload Degree')}
                      >
                        {isScanning ? 'Scanning...' : (currentDegreeUpload?.name || 'Upload Degree')}
                      </span>
                    </label>

                    {/* 3. Upload Certificates Button */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.6rem 0.55rem',
                        minHeight: '40px',
                        borderRadius: '8px',
                        border: certificateFile ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                        background: certificateFile ? '#f0fdf4' : '#f8fafc',
                        color: certificateFile ? '#16a34a' : '#1e293b',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,image/*,*"
                        onChange={(e) => handleFileSelection(e.target.files[0], setCertificateFile)}
                        style={{ display: 'none' }}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                        title={certificateFile ? (certificateFile.name || certificateFile) : 'Upload Certificates'}
                      >
                        {certificateFile ? (certificateFile.name || certificateFile) : 'Upload Certificates'}
                      </span>
                    </label>
                  </div>

                  {scanMessage && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: scanMessage.includes('failed') ? '#ef4444' : '#02658b',
                        background: scanMessage.includes('failed') ? '#fef2f2' : '#f0f9ff',
                        border: `1px solid ${scanMessage.includes('failed') ? '#fca5a5' : '#bae6fd'}`,
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        textAlign: 'center',
                      }}
                    >
                      {scanMessage}
                    </div>
                  )}

                  {/* Extracted Document's Details Section */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <GraduationCap size={17} color="#02658b" />
                        Document's Details
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {currentOcrData.boardName || 'BISE Board'} • {currentOcrData.degreeName || 'Degree / Result Card'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem',
                        background: '#f8fafc',
                        padding: '0.95rem',
                        borderRadius: '8px',
                        border: '1px solid #edf2f7',
                      }}
                    >
                      <EditableOcrField
                        label="Board Name"
                        value={currentOcrData.boardName}
                        fieldKey="curr_boardName"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        customColor="#02658b"
                        fontWeight={700}
                        onChange={(val) => updateCurrentOcrField('boardName', val)}
                      />
                      <EditableOcrField
                        label="Degree / Exam"
                        value={currentOcrData.degreeName}
                        fieldKey="curr_degreeName"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        onChange={(val) => updateCurrentOcrField('degreeName', val)}
                      />
                      <EditableOcrField
                        label="Candidate / Student Name"
                        value={currentOcrData.fullName || fullName}
                        fieldKey="curr_fullName"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        onChange={(val) => updateCurrentOcrField('fullName', val)}
                      />
                      <EditableOcrField
                        label="Father's Name"
                        value={currentOcrData.fatherName}
                        fieldKey="curr_fatherName"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        onChange={(val) => updateCurrentOcrField('fatherName', val)}
                      />
                      <EditableOcrField
                        label="Roll Number"
                        value={currentOcrData.rollNo}
                        fieldKey="curr_rollNo"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        onChange={(val) => updateCurrentOcrField('rollNo', val)}
                      />
                      <EditableOcrField
                        label="Registration Number"
                        value={currentOcrData.registrationNo}
                        fieldKey="curr_registrationNo"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        onChange={(val) => updateCurrentOcrField('registrationNo', val)}
                      />
                      <EditableOcrField
                        label="Exam Session / Month Held"
                        value={currentOcrData.examMonth}
                        fieldKey="curr_examMonth"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        onChange={(val) => updateCurrentOcrField('examMonth', val)}
                      />
                      <EditableOcrField
                        label="Marks (Obtained / Total)"
                        value={currentOcrData.marksObtained ? `${currentOcrData.marksObtained} / ${currentOcrData.totalMarks || '1100'}` : (currentOcrData.marksObtained || '')}
                        fieldKey="curr_marksObtained"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        customColor="#16a34a"
                        fontWeight={700}
                        onChange={(val) => updateCurrentOcrField('marksObtained', val)}
                      />
                      <EditableOcrField
                        label="Grade"
                        value={currentOcrData.grade || qualificationGrade}
                        fieldKey="curr_grade"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        fontWeight={700}
                        onChange={(val) => updateCurrentOcrField('grade', val)}
                      />
                      <EditableOcrField
                        label="Group"
                        value={currentOcrData.group}
                        fieldKey="curr_group"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        onChange={(val) => updateCurrentOcrField('group', val)}
                      />
                      <EditableOcrField
                        label="School / College / Institution"
                        value={currentOcrData.institution}
                        fieldKey="curr_institution"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        isFullWidth={true}
                        onChange={(val) => updateCurrentOcrField('institution', val)}
                      />
                      <EditableOcrField
                        label="Date of Birth"
                        value={currentOcrData.dob}
                        fieldKey="curr_dob"
                        editingFieldKey={editingFieldKey}
                        setEditingFieldKey={setEditingFieldKey}
                        isFullWidth={true}
                        onChange={(val) => updateCurrentOcrField('dob', val)}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Interactive Document Preview */}
                <div style={{ minWidth: 0, height: '100%' }}>
                  <ScannedDocumentPreview fileObj={currentDegreeUpload} fileName={currentDegreeUpload?.name} />
                </div>
              </div>

              {/* Bottom Dialogue Footer Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={handleSaveDegreeModal}
                  style={{
                    padding: '0.52rem 1.75rem',
                    borderRadius: '6px',
                    background: '#02658b',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  Save
                </button>
              </div>
            </>
          ) : (
              /* UPLOAD MODE INITIAL: Compact 1 Column */
              <>
                {/* Top Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={18} color="#02658b" />
                    <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: '#0f172a' }}>
                      Upload Documents
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelDocsModal}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* 3 Upload Buttons Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '0.6rem',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* 1. Upload CV Button */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.6rem 0.55rem',
                      minHeight: '40px',
                      borderRadius: '8px',
                      border: cvFile ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                      background: cvFile ? '#f0fdf4' : '#f8fafc',
                      color: cvFile ? '#16a34a' : '#1e293b',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: isCvUploadFunctional ? 'pointer' : 'not-allowed',
                      opacity: isCvUploadFunctional ? 1 : 0.45,
                      pointerEvents: isCvUploadFunctional ? 'auto' : 'none',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      minWidth: 0,
                      boxSizing: 'border-box',
                    }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,image/*,*"
                      disabled={!isCvUploadFunctional}
                      onChange={(e) => handleFileSelection(e.target.files[0], setCvFile)}
                      style={{ display: 'none' }}
                    />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                      title={cvFile ? (cvFile.name || cvFile) : 'Upload CV'}
                    >
                      {cvFile ? (cvFile.name || cvFile) : 'Upload CV'}
                    </span>
                  </label>

                  {/* 2. Upload Recent Degree Button */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.6rem 0.55rem',
                      minHeight: '40px',
                      borderRadius: '8px',
                      border: isScanning ? '1.5px solid #0284c7' : (currentDegreeUpload ? '1.5px solid #16a34a' : '1px solid #cbd5e1'),
                      background: isScanning ? '#f0f9ff' : (currentDegreeUpload ? '#f0fdf4' : '#f8fafc'),
                      color: currentDegreeUpload ? '#16a34a' : (isScanning ? '#0284c7' : '#1e293b'),
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: isScanning ? 'not-allowed' : 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      minWidth: 0,
                      boxSizing: 'border-box',
                    }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,image/*,*"
                      onChange={handleOcrDocumentUpload}
                      disabled={isScanning}
                      style={{ display: 'none' }}
                    />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                      title={isScanning ? 'Processing Degree...' : (currentDegreeUpload?.name || 'Upload Degree')}
                    >
                      {isScanning ? 'Scanning...' : (currentDegreeUpload?.name || 'Upload Degree')}
                    </span>
                  </label>

                  {/* 3. Upload Certificates Button */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.6rem 0.55rem',
                      minHeight: '40px',
                      borderRadius: '8px',
                      border: certificateFile ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                      background: certificateFile ? '#f0fdf4' : '#f8fafc',
                      color: certificateFile ? '#16a34a' : '#1e293b',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      minWidth: 0,
                      boxSizing: 'border-box',
                    }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,image/*,*"
                      onChange={(e) => handleFileSelection(e.target.files[0], setCertificateFile)}
                      style={{ display: 'none' }}
                    />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                      title={certificateFile ? (certificateFile.name || certificateFile) : 'Upload Certificates'}
                    >
                      {certificateFile ? (certificateFile.name || certificateFile) : 'Upload Certificates'}
                    </span>
                  </label>
                </div>

                {scanMessage && (
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: scanMessage.includes('failed') ? '#ef4444' : '#02658b',
                      background: scanMessage.includes('failed') ? '#fef2f2' : '#f0f9ff',
                      border: `1px solid ${scanMessage.includes('failed') ? '#fca5a5' : '#bae6fd'}`,
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      textAlign: 'center',
                    }}
                  >
                    {scanMessage}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
