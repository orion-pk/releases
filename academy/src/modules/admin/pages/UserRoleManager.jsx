import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandConfig } from '../../../config/BrandConfig';
import { Pagination } from '../../../components/Pagination';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { MultiSelectDropdown } from '../../../components/MultiSelectDropdown';
import { handleCnicChange } from '../../../utils/helpers';
import {
  fetchUsersApi,
  registerApi,
  assignDirectPermissionApi,
  updateUserApi,
  deleteUserApi,
  generateInvitationApi,
} from '../../../api';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Download,
  X,
  User,
  Lock,
  Mail,
  Copy,
  Phone,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  CreditCard,
  Check,
  FileText,
  ExternalLink,
  Upload,
  GraduationCap,
} from 'lucide-react';

export const UserRoleManager = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleColumnSort = (field) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortableHeader = (label, field, width = null) => {
    const isSorted = sortField === field;
    return (
      <th
        key={field + label}
        onClick={() => handleColumnSort(field)}
        style={{
          padding: '0.85rem 1rem',
          width: width || 'auto',
          borderRight: '1px solid #cbd5e1',
          cursor: 'pointer',
          userSelect: 'none',
          background: '#e5f3f7',
          transition: 'background 0.15s ease',
          fontSize: '0.94rem',
          fontWeight: 700,
        }}
        title={`Click to sort by ${label}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
          <span>{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp size={14} color="#0f172a" strokeWidth={2.8} />
            ) : (
              <ArrowDown size={14} color="#0f172a" strokeWidth={2.8} />
            )
          ) : (
            <ArrowUpDown size={13} color="#94a3b8" style={{ opacity: 0.4 }} />
          )}
        </div>
      </th>
    );
  };

  // Ref for click outside to close filter dropdown and export tooltip
  const filterDropdownRef = useRef(null);
  const exportTooltipRef = useRef(null);
  const [showExportComingSoon, setShowExportComingSoon] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
      if (exportTooltipRef.current && !exportTooltipRef.current.contains(event.target)) {
        setShowExportComingSoon(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Pagination State (Max rows per page: 10, 20, 30, 50)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // User Detail Dialogue Modal State
  const [selectedUserDetailModal, setSelectedUserDetailModal] = useState(null);
  const [detailModalCopied, setDetailModalCopied] = useState(false);
  const [detailModalAssignedOpen, setDetailModalAssignedOpen] = useState(false);
  const detailModalAssignedDropdownRef = useRef(null);

  useEffect(() => {
    if (!detailModalAssignedOpen) return;
    const handleClickOutside = (e) => {
      if (detailModalAssignedDropdownRef.current && !detailModalAssignedDropdownRef.current.contains(e.target)) {
        setDetailModalAssignedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [detailModalAssignedOpen]);

  const handleOpenUserDetailModal = async (user) => {
    const roleName = getPrimaryRole(user.roles);
    const userEmail = user.email || `${user.username.replaceAll(' ', '').toLowerCase()}@gmail.com`;
    const phoneNum = user.phoneNumber && user.phoneNumber !== 'N/A' ? user.phoneNumber : `12345678${(user.id % 90) + 10}`;
    const cnicVal = getUserCnic(user);

    let fullUrl = '';
    try {
      const invRes = await generateInvitationApi(user.id);
      if (invRes.invitationUrl) {
        fullUrl = `${window.location.origin}${invRes.invitationUrl}`;
      }
    } catch {
      fullUrl = `${window.location.origin}/onboard/activate?token=user_${user.id}_token`;
    }

    const getDocLabel = (val) => {
      if (!val) return 'Not Uploaded';
      if (typeof val === 'object' && val.name) return val.name;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[')) {
          try {
            const arr = JSON.parse(trimmed);
            if (Array.isArray(arr) && arr.length > 0) {
              return arr.length === 1 ? (arr[0].name || '1 Degree Uploaded') : `${arr.length} Degrees Uploaded`;
            }
          } catch {
            // Ignored
          }
        }
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.name) return parsed.name;
            if (parsed.fileName) return parsed.fileName;
          } catch {
            // Ignored
          }
        }
        return trimmed;
      }
      return 'Uploaded Document';
    };

    const degreeList = parseDocumentList(user.degreeFile, 'Degree');

    const docs = [];
    if (roleName === 'Teacher') {
      docs.push({ label: 'CV Document', type: 'cv', name: getDocLabel(user.cvFile), present: !!user.cvFile });
      if (degreeList.length > 1) {
        degreeList.forEach((d, i) => {
          docs.push({ label: `Degree #${i + 1}`, type: 'degree', degreeIndex: i, name: d.name, present: true, docObj: d });
        });
      } else {
        docs.push({ label: 'Degree Document', type: 'degree', degreeIndex: 0, name: getDocLabel(user.degreeFile), present: !!user.degreeFile });
      }
      docs.push({ label: 'Certificate', type: 'certificate', name: getDocLabel(user.certificateFile), present: !!user.certificateFile });
    } else if (roleName === 'Student') {
      if (degreeList.length > 1) {
        degreeList.forEach((d, i) => {
          docs.push({ label: `Degree #${i + 1}`, type: 'degree', degreeIndex: i, name: d.name, present: true, docObj: d });
        });
      } else {
        docs.push({ label: 'Degree / Record', type: 'degree', degreeIndex: 0, name: getDocLabel(user.degreeFile), present: !!user.degreeFile });
      }
      docs.push({ label: 'Certificate', type: 'certificate', name: getDocLabel(user.certificateFile), present: !!user.certificateFile });
    } else {
      docs.push({ label: 'Document 1', type: 'cv', name: getDocLabel(user.cvFile || user.degreeFile), present: !!(user.cvFile || user.degreeFile) });
      docs.push({ label: 'Document 2', type: 'certificate', name: getDocLabel(user.certificateFile), present: !!user.certificateFile });
    }

    let permObj = {};
    if (user.permissionsJson) {
      try {
        permObj = typeof user.permissionsJson === 'string' ? JSON.parse(user.permissionsJson) : user.permissionsJson;
      } catch {
        // Ignored
      }
    }

    let assignedFieldLabel = 'Assigned';
    let assignedList = [];

    if (roleName === 'Teacher') {
      assignedFieldLabel = 'Assigned Student(s)';
      const stIds = permObj.linkedStudentIds || (permObj.linkedStudentId ? String(permObj.linkedStudentId).split(',').filter(Boolean) : []);
      assignedList = stIds.map((id) => {
        const found = users.find((u) => String(u.id) === String(id));
        return found ? `${found.username} (ID: ${found.id})` : `Student #${id}`;
      });
    } else if (roleName === 'Parent') {
      assignedFieldLabel = 'Linked Child(ren)';
      const stIds = permObj.linkedStudentIds || (permObj.linkedStudentId ? String(permObj.linkedStudentId).split(',').filter(Boolean) : []);
      assignedList = stIds.map((id) => {
        const found = users.find((u) => String(u.id) === String(id));
        return found ? `${found.username} (ID: ${found.id})` : `Child #${id}`;
      });
    } else if (roleName === 'Student') {
      assignedFieldLabel = 'Assigned Teacher(s)';
      const tcIds = permObj.linkedTeacherIds || (permObj.linkedTeacherId ? String(permObj.linkedTeacherId).split(',').filter(Boolean) : []);
      assignedList = tcIds.map((id) => {
        const found = users.find((u) => String(u.id) === String(id));
        return found ? `${found.username} (ID: ${found.id})` : `Teacher #${id}`;
      });
    }

    setDetailModalAssignedOpen(false);
    setSelectedUserDetailModal({
      rawUser: user,
      name: user.username,
      role: roleName,
      email: userEmail,
      contact: phoneNum,
      cnic: cnicVal,
      activationUrl: fullUrl,
      docs: docs,
      assignedFieldLabel: assignedFieldLabel,
      assignedList: assignedList,
    });
  };

  // Modal State for "Add / Edit User"
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newCnic, setNewCnic] = useState('');
  const [newRole, setNewRole] = useState('1'); // Default Admin
  const [newPermission, setNewPermission] = useState('2'); // Default manage:users permission
  const [newStatus, setNewStatus] = useState('registered');
  const [newLinkedStudentIds, setNewLinkedStudentIds] = useState([]);
  const [newLinkedTeacherIds, setNewLinkedTeacherIds] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Document Viewing Dialogue Modal State
  const [docsUser, setDocsUser] = useState(null);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [docsUploadingType, setDocsUploadingType] = useState(null);
  const [docsSuccessMsg, setDocsSuccessMsg] = useState(null);
  const [docsErrorMsg, setDocsErrorMsg] = useState(null);

  const getMimeType = (filename = '') => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'svg': return 'image/svg+xml';
      case 'bmp': return 'image/bmp';
      case 'ico': return 'image/x-icon';
      case 'tiff':
      case 'tif': return 'image/tiff';
      case 'avif': return 'image/avif';
      case 'heic': return 'image/heic';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'ppt': return 'application/vnd.ms-powerpoint';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'odt': return 'application/vnd.oasis.opendocument.text';
      case 'ods': return 'application/vnd.oasis.opendocument.spreadsheet';
      case 'odp': return 'application/vnd.oasis.opendocument.presentation';
      case 'txt': return 'text/plain';
      case 'csv': return 'text/csv';
      case 'rtf': return 'application/rtf';
      case 'zip': return 'application/zip';
      case 'rar': return 'application/vnd.rar';
      case '7z': return 'application/x-7z-compressed';
      default: return 'application/octet-stream';
    }
  };

  const parseDocumentObj = (rawVal, defaultName = 'Document') => {
    if (!rawVal || typeof rawVal !== 'string' || !rawVal.trim()) return null;
    const trimmed = rawVal.trim();
    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr) && arr.length > 0) {
          const first = arr[0];
          let name = first.name || first.fileName || defaultName;
          if (name.startsWith('data:') || name.includes('base64,')) {
            const ext = (first.type || 'image/jpeg').split('/')[1]?.replaceAll('jpeg', 'jpg') || 'jpg';
            name = `${defaultName}.${ext}`;
          }
          return {
            name: name,
            type: first.type || getMimeType(name),
            size: first.size || null,
            data: first.data || (first.file && first.file.data ? first.file.data : null),
            ocrData: first.ocrData || null,
          };
        }
      } catch {
        // Ignored
      }
    }
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          let name = parsed.name || defaultName;
          if (name.startsWith('data:') || name.includes('base64,')) {
            const ext = (parsed.type || 'image/jpeg').split('/')[1]?.replaceAll('jpeg', 'jpg') || 'jpg';
            name = `${defaultName}.${ext}`;
          }
          return {
            name: name,
            type: parsed.type || getMimeType(name),
            size: parsed.size || null,
            data: parsed.data || null,
            ocrData: parsed.ocrData || null,
          };
        }
      } catch {
        // Ignored
      }
    }
    if (trimmed.startsWith('data:')) {
      const mimeMatch = trimmed.match(/^data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      let ext = mimeType.split('/')[1] || 'jpg';
      if (ext === 'jpeg') ext = 'jpg';
      return {
        name: `${defaultName}.${ext}`,
        type: mimeType,
        size: null,
        data: trimmed,
        ocrData: null,
      };
    }
    let name = rawVal;
    if (name.startsWith('data:') || name.includes('base64,')) {
      name = `${defaultName}.jpg`;
    }
    return {
      name: name,
      type: getMimeType(name),
      size: null,
      data: null,
      ocrData: null,
    };
  };

  const parseDocumentList = (rawVal, defaultName = 'Document') => {
    if (!rawVal || typeof rawVal !== 'string' || !rawVal.trim()) return [];
    const trimmed = rawVal.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsedList = JSON.parse(trimmed);
        if (Array.isArray(parsedList) && parsedList.length > 0) {
          return parsedList.map((item, idx) => {
            if (item && typeof item === 'object') {
              let name = item.name || item.fileName || `${defaultName} #${idx + 1}`;
              if (name.startsWith('data:') || name.includes('base64,')) {
                const ext = (item.type || 'image/jpeg').split('/')[1]?.replaceAll('jpeg', 'jpg') || 'jpg';
                name = `${defaultName}_${idx + 1}.${ext}`;
              }
              const dataStr = item.data || (item.file && typeof item.file === 'object' ? item.file.data : null);
              return {
                name: name,
                type: item.type || (item.file && typeof item.file === 'object' ? item.file.type : null) || getMimeType(name),
                size: item.size || (item.file && typeof item.file === 'object' ? item.file.size : null) || null,
                data: dataStr || null,
                ocrData: item.ocrData || null,
              };
            }
            return {
              name: String(item),
              type: getMimeType(String(item)),
              size: null,
              data: null,
              ocrData: null,
            };
          });
        }
      } catch {
        // Ignored
      }
    }
    const singleObj = parseDocumentObj(rawVal, defaultName);
    return singleObj ? [singleObj] : [];
  };

  const hasUploadedDocuments = (u) => {
    if (!u) return false;
    const role = getPrimaryRole(u.roles);
    const degree = u.degreeFile && typeof u.degreeFile === 'string' && u.degreeFile.trim().length > 0;
    const cert = u.certificateFile && typeof u.certificateFile === 'string' && u.certificateFile.trim().length > 0;
    if (role === 'Student') {
      return degree || cert;
    }
    const cv = u.cvFile && typeof u.cvFile === 'string' && u.cvFile.trim().length > 0;
    return cv || degree || cert;
  };

  const handleOpenDocsModal = (user) => {
    setDocsUser(user);
    setDocsSuccessMsg(null);
    setDocsErrorMsg(null);
    setIsDocsModalOpen(true);
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

  const handleOpenInNewTab = (user, docType, docObj, index = 0) => {
    if (docObj && docObj.data && docObj.data.startsWith('data:')) {
      const blob = dataURLtoBlob(docObj.data);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } else {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8085/api';
      const serverUrl = `${apiBase}/document-file?userId=${user.id}&type=${docType}&index=${index}`;
      window.open(serverUrl, '_blank');
    }
  };

  const handleDownloadDocument = (user, docType, docObj, index = 0) => {
    let cleanName = docObj?.name || `${docType}_${user.username}`;
    if (cleanName.startsWith('data:') || cleanName.includes('base64,')) {
      const ext = (docObj?.type || 'image/jpeg').split('/')[1]?.replaceAll('jpeg', 'jpg') || 'jpg';
      cleanName = `${docType}_${user.username}.${ext}`;
    }

    if (docObj && docObj.data && docObj.data.startsWith('data:')) {
      const blob = dataURLtoBlob(docObj.data);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } else {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8085/api';
      const serverUrl = `${apiBase}/document-file?userId=${user.id}&type=${docType}&index=${index}&download=1`;
      const a = document.createElement('a');
      a.href = serverUrl;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleUploadDocInModal = async (type, file) => {
    if (!file || !docsUser) return;
    setDocsUploadingType(type);
    setDocsSuccessMsg(null);
    setDocsErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const docObj = {
          name: file.name,
          type: file.type || getMimeType(file.name),
          size: file.size,
          data: e.target.result,
        };

        let jsonStr;
        if (type === 'degree') {
          const existingList = parseDocumentList(docsUser.degreeFile, `degree_${docsUser.username}`);
          const newList = [...existingList, docObj];
          jsonStr = JSON.stringify(newList);
        } else {
          jsonStr = JSON.stringify(docObj);
        }

        const payload = { userId: docsUser.id };
        if (type === 'cv') payload.cvFile = jsonStr;
        else if (type === 'degree') payload.degreeFile = jsonStr;
        else if (type === 'certificate') payload.certificateFile = jsonStr;

        const res = await updateUserApi(payload);
        if (res.success) {
          setDocsSuccessMsg(`${type.toUpperCase()} document updated successfully!`);
          setDocsUser((prev) => ({
            ...prev,
            [`${type}File`]: jsonStr,
          }));
          await loadData();
        } else {
          setDocsErrorMsg(res.error || res.message || `Failed to update ${type} document`);
        }
      } catch (err) {
        setDocsErrorMsg(err.message || `Error uploading ${type} document`);
      } finally {
        setDocsUploadingType(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderDocumentSection = (type, title, rawFileVal, user) => {
    const docList = parseDocumentList(rawFileVal, `${title}_${user.username}`);
    const isUploading = docsUploadingType === type;

    return (
      <div
        key={type}
        style={{
          border: '1.5px solid #cbd5e1',
          borderRadius: '10px',
          background: '#FFFFFF',
          padding: '0.85rem 1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
              {title} {docList.length > 1 ? `(${docList.length})` : ''}
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.2rem 0.45rem',
                borderRadius: '5px',
                background: '#e0f2fe',
                color: '#02658b',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: isUploading ? 'not-allowed' : 'pointer',
                border: '1px solid #bae6fd',
                transition: 'all 0.15s ease',
              }}
            >
              <Upload size={12} />
              <span>{isUploading ? 'Uploading...' : docList.length > 0 ? (type === 'degree' ? 'Upload More' : 'Replace') : 'Upload'}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,image/*,*"
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files[0]) {
                    handleUploadDocInModal(type, e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {docList.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: docList.length > 1 ? 'repeat(auto-fill, minmax(220px, 1fr))' : '1fr',
              gap: '0.55rem',
            }}
          >
            {docList.map((docObj, idx) => (
              <div
                key={idx}
                onClick={() => handleOpenInNewTab(user, type, docObj, idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0f9ff';
                  e.currentTarget.style.borderColor = '#bae6fd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
                title="Click to open document in a new tab"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '5px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {type === 'degree' ? <GraduationCap size={15} color="#02658b" /> : <FileText size={15} color="#02658b" />}
                  </div>
                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={docObj.name}>
                      {docObj.ocrData?.degreeName || docObj.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {docObj.ocrData?.boardName ? `${docObj.ocrData.boardName} • ` : ''}{docObj.type || 'Document'} {docObj.size ? `(${Math.round(docObj.size / 1024)} KB)` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, marginLeft: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadDocument(user, type, docObj, idx);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Download"
                  >
                    <Download size={13} />
                  </button>
                  <ExternalLink size={13} color="#02658b" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
            No document uploaded yet. Click "Upload" to add one.
          </div>
        )}
      </div>
    );
  };

  const handleToggleLinkedTeacherId = async (tcId) => {
    const idStr = String(tcId);
    const updatedTeacherIds = newLinkedTeacherIds.includes(idStr)
      ? newLinkedTeacherIds.filter((id) => id !== idStr)
      : [...newLinkedTeacherIds, idStr];

    setNewLinkedTeacherIds(updatedTeacherIds);

    if (editingUser) {
      try {
        let existingPermissionsObj = {};
        try {
          if (editingUser.permissionsJson) {
            existingPermissionsObj = JSON.parse(editingUser.permissionsJson);
          }
        } catch {
          // Ignored
        }

        const updatedPermissionsJson = JSON.stringify({
          ...existingPermissionsObj,
          linkedTeacherId: updatedTeacherIds.join(','),
          linkedTeacherIds: updatedTeacherIds,
        });

        await updateUserApi({
          userId: editingUser.id,
          permissionsJson: updatedPermissionsJson,
        });

        setEditingUser((prev) => (prev ? { ...prev, permissionsJson: updatedPermissionsJson } : prev));
        await loadData();
      } catch {
        // Ignored - sync retry
      }
    }
  };

  const handleToggleLinkedStudentId = async (stId) => {
    const idStr = String(stId);
    const updatedStudentIds = newLinkedStudentIds.includes(idStr)
      ? newLinkedStudentIds.filter((id) => id !== idStr)
      : [...newLinkedStudentIds, idStr];

    setNewLinkedStudentIds(updatedStudentIds);

    // Perform immediate live DB sync if editing an existing user
    if (editingUser) {
      try {
        let existingPermissionsObj = {};
        try {
          if (editingUser.permissionsJson) {
            existingPermissionsObj = JSON.parse(editingUser.permissionsJson);
          }
        } catch {
          // Ignored
        }

        const updatedPermissionsJson = JSON.stringify({
          ...existingPermissionsObj,
          linkedStudentId: updatedStudentIds.join(','),
          linkedStudentIds: updatedStudentIds,
          linkedTeacherId: newLinkedTeacherIds.join(','),
          linkedTeacherIds: newLinkedTeacherIds,
        });

        await updateUserApi({
          userId: editingUser.id,
          permissionsJson: updatedPermissionsJson,
        });

        setEditingUser((prev) => (prev ? { ...prev, permissionsJson: updatedPermissionsJson } : prev));
        await loadData();
      } catch {
        // Ignored - sync retry
      }
    }
  };

  // State for Custom Delete Confirmation Modal
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleCnicChangeModal = (e) => {
    handleCnicChange(e, setNewCnic);
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const usersRes = await fetchUsersApi();

      if (usersRes.success) {
        setUsers(usersRes.users || []);
      } else if (!silent) {
        setError(usersRes.error || 'Failed to fetch directory users');
      }
    } catch (err) {
      if (!silent) setError(err.response?.data?.error || err.message || 'Error loading user directory');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadUsers = () => loadData(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadUsers();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenEditModal = (targetUser) => {
    setEditingUser(targetUser);
    setNewUsername(targetUser.username || '');
    setNewPassword('');
    setNewEmail(targetUser.email || '');
    setNewPhoneNumber(targetUser.phoneNumber || '');
    setNewCnic(targetUser.cnic || '');
    
    // Map role name to role ID string
    const roles = targetUser.roles || [];
    const hasRole = (roleName, roleId) =>
      roles.some(
        (r) =>
          r === roleName ||
          r === String(roleId) ||
          r?.roleName === roleName ||
          r?.id === roleId ||
          String(r?.id) === String(roleId)
      );

    let roleIdStr = '4'; // Default Parent
    if (hasRole('Super Admin', 1)) roleIdStr = '1';
    else if (hasRole('Teacher', 2)) roleIdStr = '2';
    else if (hasRole('Student', 3)) roleIdStr = '3';
    else if (hasRole('Parent', 4)) roleIdStr = '4';
    
    setNewRole(roleIdStr);
    setNewPermission(roleIdStr === '1' ? '2' : '');
    setNewStatus(targetUser.status || 'registered');

    let parsed = {};
    let studentIdsArray = [];
    let teacherIdsArray = [];
    try {
      if (targetUser.permissionsJson) {
        parsed = JSON.parse(targetUser.permissionsJson);
        if (Array.isArray(parsed.linkedStudentIds)) {
          studentIdsArray = parsed.linkedStudentIds.map(String).filter(Boolean);
        } else if (parsed.linkedStudentId) {
          studentIdsArray = String(parsed.linkedStudentId).split(',').map((s) => s.trim()).filter(Boolean);
        }

        if (Array.isArray(parsed.linkedTeacherIds)) {
          teacherIdsArray = parsed.linkedTeacherIds.map(String).filter(Boolean);
        } else if (parsed.linkedTeacherId) {
          teacherIdsArray = String(parsed.linkedTeacherId).split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
    } catch {
      // Ignored
    }
    setNewLinkedStudentIds(studentIdsArray);
    setNewLinkedTeacherIds(teacherIdsArray);

    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleDeleteUser = (targetUser) => {
    setDeleteError(null);
    setUserToDelete(targetUser);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await deleteUserApi(userToDelete.id);
      if (res.success) {
        setUserToDelete(null);
        await loadData();
      } else {
        setDeleteError(res.error || res.message || 'Failed to delete user');
      }
    } catch (err) {
      setDeleteError(err.response?.data?.error || err.message || 'Error deleting user');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Add or Edit User with Role & Permission Assignment inside Modal
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);

    let existingPermissionsObj = {};
    try {
      if (editingUser?.permissionsJson) {
        existingPermissionsObj = JSON.parse(editingUser.permissionsJson);
      }
    } catch {
      // Ignored
    }

    const payloadPermissions = JSON.stringify({
      ...existingPermissionsObj,
      linkedStudentId: newLinkedStudentIds.join(','),
      linkedStudentIds: newLinkedStudentIds,
      linkedTeacherId: newLinkedTeacherIds.join(','),
      linkedTeacherIds: newLinkedTeacherIds,
    });

    try {
      if (editingUser) {
        // UPDATE EXISTING USER
        const res = await updateUserApi({
          userId: editingUser.id,
          username: newUsername,
          password: newPassword.trim() !== '' ? newPassword : undefined,
          email: newEmail,
          phoneNumber: newPhoneNumber,
          status: newStatus,
          roleId: parseInt(newRole),
          cnic: newCnic,
          permissionsJson: payloadPermissions,
        });

        if (!res.success) {
          setFormError(res.error || res.message || 'Update failed');
          setFormLoading(false);
          return;
        }

        if (newPermission) {
          await assignDirectPermissionApi(editingUser.id, parseInt(newPermission));
        }

        setFormSuccess(`User "${newUsername}" updated successfully!`);
      } else {
        // CREATE NEW USER
        const res = await registerApi({
          username: newUsername,
          password: newPassword,
          email: newEmail,
          phoneNumber: newPhoneNumber,
          status: newStatus,
          roleId: parseInt(newRole),
          cnic: newCnic,
          permissionsJson: payloadPermissions,
        });

        if (!res.success) {
          setFormError(res.error || res.message || 'Registration failed');
          setFormLoading(false);
          return;
        }

        if (res.userId && newPermission) {
          await assignDirectPermissionApi(res.userId, parseInt(newPermission));
        }

        setFormSuccess(`User "${newUsername}" created successfully!`);
      }

      await loadData();
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
      }, 1200);
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Error saving user');
    } finally {
      setFormLoading(false);
    }
  };


  // Display ID formatting matching reference (e.g. ADM-29167, STU-2345, STF-3624)
  const formatDisplayId = (user) => {
    const roles = user.roles || [];
    let prefix = 'STU';
    if (roles.includes('Super Admin')) prefix = 'ADM';
    else if (roles.includes('Teacher')) prefix = 'STF';
    else if (roles.includes('Parent')) prefix = 'PAR';

    const numPart = (user.id * 2345 + 1000) % 90000 + 10000;
    return `${prefix}-${numPart}`;
  };

  // Primary Role display
  const getPrimaryRole = (roles = []) => {
    if (roles.includes('Super Admin')) return 'Admin';
    if (roles.includes('Teacher')) return 'Teacher';
    if (roles.includes('Student')) return 'Student';
    if (roles.includes('Parent')) return 'Parent';
    return 'User';
  };

  // Helper to format CNIC
  const getUserCnic = (u) => {
    if (u && u.cnic && typeof u.cnic === 'string' && u.cnic.trim().length > 0) {
      return u.cnic.trim();
    }
    return 'N/A';
  };

  // Filter & Sort Math
  const filteredUsers = users.filter((u) => {
    const cnicVal = getUserCnic(u);
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      formatDisplayId(u).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cnicVal !== 'N/A' && cnicVal.toLowerCase().includes(searchQuery.toLowerCase()));

    const role = getPrimaryRole(u.roles);
    const matchesRole = roleFilter === 'All' || role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;
    let valA = '';
    let valB = '';

    if (sortField === 'id') {
      valA = a.id;
      valB = b.id;
    } else if (sortField === 'username') {
      valA = (a.username || '').toLowerCase();
      valB = (b.username || '').toLowerCase();
    } else if (sortField === 'cnic') {
      valA = getUserCnic(a).toLowerCase();
      valB = getUserCnic(b).toLowerCase();
    } else if (sortField === 'role') {
      valA = getPrimaryRole(a.roles).toLowerCase();
      valB = getPrimaryRole(b.roles).toLowerCase();
    } else if (sortField === 'email') {
      valA = (a.email || `${a.username}@gmail.com`).toLowerCase();
      valB = (b.email || `${b.username}@gmail.com`).toLowerCase();
    } else if (sortField === 'phoneNumber') {
      valA = (a.phoneNumber || '1234567890').toLowerCase();
      valB = (b.phoneNumber || '1234567890').toLowerCase();
    } else if (sortField === 'status') {
      valA = a.status === 'registered' ? 'registered' : 'not registered';
      valB = b.status === 'registered' ? 'registered' : 'not registered';
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Math
  const totalUsersCount = sortedUsers.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: 'calc(100vh - 6.5rem)', minHeight: 0, overflow: 'hidden', fontFamily: BrandConfig.fontFamily }}>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>
            <X size={16} />
          </button>
        </div>
      )}
      
      {/* Search Bar & Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.85rem', flexShrink: 0, marginTop: '0.75rem' }}>
        
        {/* Right Side: Search Input Box + Add User Action Button & Export Link Underneath */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Search Input Box */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '320px', maxWidth: '500px', height: '42px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  height: '42px',
                  background: '#FFFFFF',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '9px',
                  padding: '0 0.85rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <Search size={18} color="#64748b" style={{ marginRight: '0.5rem', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search by ID or name"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: '0.88rem',
                    color: '#0f172a',
                    fontFamily: BrandConfig.fontFamily,
                  }}
                />

                {/* Embedded Filter Pill Button */}
                <div ref={filterDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <SlidersHorizontal size={13} color="#475569" />
                    <span>{roleFilter !== 'All' ? roleFilter : 'Filter'}</span>
                    {roleFilter !== 'All' && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoleFilter('All');
                          setCurrentPage(1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            setRoleFilter('All');
                            setCurrentPage(1);
                          }
                        }}
                        title="Clear filter"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: '0.2rem',
                          padding: '2px',
                          borderRadius: '50%',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={12} color="#ef4444" />
                      </span>
                    )}
                  </button>

                  {/* Filter Dropdown Popup */}
                  {showFilterDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '2.5rem',
                        background: '#FFFFFF',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        padding: '0.5rem',
                        zIndex: 50,
                        minWidth: '150px',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', padding: '0.3rem 0.5rem' }}>FILTER BY ROLE</div>
                      {['All', 'Admin', 'Teacher', 'Student', 'Parent'].map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setRoleFilter(r);
                            setShowFilterDropdown(false);
                            setCurrentPage(1);
                          }}
                          onMouseEnter={(e) => {
                            if (roleFilter !== r) e.currentTarget.style.background = '#f1f5f9';
                          }}
                          onMouseLeave={(e) => {
                            if (roleFilter !== r) e.currentTarget.style.background = 'transparent';
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.4rem 0.6rem',
                            fontSize: '0.85rem',
                            background: roleFilter === r ? '#000000' : 'transparent',
                            color: roleFilter === r ? '#FFFFFF' : '#0f172a',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: roleFilter === r ? 600 : 400,
                            marginBottom: '2px',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add New User Action Button */}
            <button
              onClick={() => navigate('/admin/add-user')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                height: '42px',
                borderRadius: '9px',
                background: '#02658b',
                color: '#FFFFFF',
                border: 'none',
                padding: '0 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'background 0.2s',
              }}
            >
              <Plus size={18} />
              <span>Add New User</span>
            </button>
          </div>

          {/* Export Action Button with Zero-Flicker Coming Soon Tag */}
          <div ref={exportTooltipRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginTop: '0.35rem' }}>
            {showExportComingSoon && (
              <div
                style={{
                  position: 'absolute',
                  right: 'calc(100% + 8px)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#e0f2fe',
                  color: '#02658b',
                  border: '1.5px solid #bae6fd',
                  padding: '0.22rem 0.65rem',
                  borderRadius: '5px',
                  boxShadow: '0 2px 8px -1px rgba(2, 101, 139, 0.15)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 50,
                }}
              >
                Coming Soon
                {/* Right-pointing Arrow Caret */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '100%',
                    transform: 'translateY(-50%)',
                    width: 0,
                    height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderLeft: '5px solid #e0f2fe',
                  }}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowExportComingSoon((prev) => !prev);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: showExportComingSoon ? '#e2e8f0' : 'none',
                border: 'none',
                color: showExportComingSoon ? '#02658b' : '#64748b',
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: '0.2rem 0.45rem',
                fontWeight: 600,
                borderRadius: '5px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#02658b';
                e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                if (!showExportComingSoon) {
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Data Grid Table Container */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1.5px solid #cbd5e1',
          overflow: 'hidden',
          flex: 1,
          maxHeight: 'calc(100vh - 18rem)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: '#e5f3f7', borderBottom: '1.5px solid #cbd5e1', color: '#0f172a', fontWeight: 700, fontSize: '0.86rem' }}>
                {renderSortableHeader('#', 'id', '60px')}
                {renderSortableHeader('ID', 'id')}
                {renderSortableHeader('Name', 'username')}
                {renderSortableHeader('CNIC', 'cnic')}
                {renderSortableHeader('Role', 'role')}
                {renderSortableHeader('Email', 'email')}
                {renderSortableHeader('Ph#', 'phoneNumber')}
                {renderSortableHeader('Status', 'status')}
                <th style={{ padding: '0.85rem 0.8rem', textAlign: 'center', width: '120px', fontSize: '0.94rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.98rem' }}>
                    Loading user records...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.98rem' }}>
                    No users match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, idx) => {
                  const globalRowNumber = startIndex + idx + 1;
                  const displayId = formatDisplayId(user);
                  const roleName = getPrimaryRole(user.roles);
                  const userEmail = user.email || `${user.username.replaceAll(' ', '').toLowerCase()}@gmail.com`;
                  const phoneNum = user.phoneNumber && user.phoneNumber !== 'N/A' ? user.phoneNumber : `12345678${(user.id % 90) + 10}`;
                  const cnicVal = getUserCnic(user);

                  return (
                    <tr
                      key={user.id}
                      onClick={() => handleOpenUserDetailModal(user)}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: '#FFFFFF',
                        transition: 'background 0.15s',
                        cursor: 'pointer',
                      }}
                    >
                      {/* # Row Index */}
                      <td style={{ padding: '1.05rem 1rem', fontWeight: 700, color: '#0f172a', fontSize: '1.02rem', borderRight: '1px solid #e2e8f0' }}>
                        {globalRowNumber}
                      </td>

                      {/* ID */}
                      <td style={{ padding: '1.05rem 1rem', color: '#475569', fontSize: '0.98rem', borderRight: '1px solid #e2e8f0' }}>
                        {displayId}
                      </td>

                      {/* Name */}
                      <td style={{ padding: '1.05rem 1rem', fontWeight: 600, color: '#0f172a', fontSize: '1.02rem', borderRight: '1px solid #e2e8f0' }}>
                        {user.username}
                      </td>

                      {/* CNIC */}
                      <td style={{ padding: '1.05rem 1rem', color: cnicVal === 'N/A' ? '#94a3b8' : '#475569', fontSize: '0.96rem', fontFamily: cnicVal === 'N/A' ? 'inherit' : 'monospace', fontWeight: cnicVal === 'N/A' ? 400 : 600, borderRight: '1px solid #e2e8f0' }}>
                        {cnicVal}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '1.05rem 1rem', color: '#475569', fontSize: '0.98rem', borderRight: '1px solid #e2e8f0' }}>
                        {roleName}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '1.05rem 1rem', color: '#64748b', fontSize: '0.96rem', borderRight: '1px solid #e2e8f0' }}>
                        {userEmail}
                      </td>

                      {/* Ph# */}
                      <td style={{ padding: '1.05rem 1rem', color: '#475569', fontSize: '0.98rem', borderRight: '1px solid #e2e8f0' }}>
                        {phoneNum}
                      </td>

                      {/* Status (Tag Pill Only) */}
                      <td style={{ padding: '1.05rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                        {(() => {
                          const isReg = user.status === 'registered' || user.is_registered === true || user.status === 'active';
                          const isPend = user.status === 'pending' || user.status === 'pending_activation';
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.86rem',
                                fontWeight: 600,
                                background: isReg ? '#d1fae5' : isPend ? '#e0f2fe' : '#ffe4e6',
                                color: isReg ? '#065f46' : isPend ? '#075985' : '#9f1239',
                                border: `1px solid ${isReg ? '#a7f3d0' : isPend ? '#bae6fd' : '#fecdd3'}`,
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: isReg ? '#10b981' : isPend ? '#0284c7' : '#f43f5e',
                                }}
                              />
                              {isReg ? 'Registered' : isPend ? 'Pending Activation' : 'Not Registered'}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions (View Docs / Edit / Delete) */}
                      <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center', width: '120px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          {hasUploadedDocuments(user) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDocsModal(user);
                              }}
                              title="View User Documents (CV, Degree, Certificates)"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.color = '#02658b';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '0.14';
                                e.currentTarget.style.color = '#64748b';
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '0.25rem',
                                color: '#64748b',
                                opacity: 0.14,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <FileText size={16} />
                            </button>
                          )}


                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(user);
                            }}
                            title="Edit User"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.color = '#02658b';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.14';
                              e.currentTarget.style.color = '#64748b';
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '0.25rem',
                              color: '#64748b',
                              opacity: 0.14,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(user);
                            }}
                            title="Delete User Forever"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.color = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.14';
                              e.currentTarget.style.color = '#64748b';
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '0.25rem',
                              color: '#64748b',
                              opacity: 0.14,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Reusable Pagination Component */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalUsersCount}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        pageSizeOptions={[10, 20, 30, 50]}
      />

      {/* Add New User Modal Dialog (Includes Role & Permission Selection) */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '0.75rem',
              border: '1.5px solid #cbd5e1',
              width: '100%',
              maxWidth: '540px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {editingUser ? 'Edit User & Assign Permissions' : 'Add New User & Assign Permissions'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#ffe4e6', border: '1px solid #fecdd3', color: '#9f1239', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} color="#9f1239" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} color="#065f46" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Full Name / Username
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sania Ali"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.6rem 0.5rem 2.2rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', background: '#FAFAFA', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Password {editingUser && '(Optional)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to keep unchanged' : 'Enter password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.6rem 0.5rem 2.2rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', background: '#FAFAFA', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  CNIC Number
                </label>
                <div style={{ position: 'relative' }}>
                  <CreditCard size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="12345-6789012-3"
                    value={newCnic}
                    onChange={handleCnicChangeModal}
                    maxLength={15}
                    style={{ width: '100%', padding: '0.5rem 0.6rem 0.5rem 2.2rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', background: '#FAFAFA', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      placeholder="sa6484@gmail.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.6rem 0.5rem 2.2rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', background: '#FAFAFA', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="1223445566"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.6rem 0.5rem 2.2rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', background: '#FAFAFA', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    System Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      const selectedRole = e.target.value;
                      setNewRole(selectedRole);
                      if (selectedRole === '1') setNewPermission('2');
                      else if (selectedRole === '2') setNewPermission('3');
                      else if (selectedRole === '3') setNewPermission('5');
                      else if (selectedRole === '4') setNewPermission('6');
                    }}
                    style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', background: '#FAFAFA', outline: 'none' }}
                  >
                    <option value="1">Admin</option>
                    <option value="2">Teacher</option>
                    <option value="3">Student</option>
                    <option value="4">Parent</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    Registration Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', background: '#FAFAFA', outline: 'none' }}
                  >
                    <option value="registered">Registered</option>
                    <option value="unregistered">Not Registered</option>
                  </select>
                </div>
              </div>

              {/* MultiSelectDropdown for Teacher or Parent linking Students */}
              {(newRole === '4' || newRole === '2') && (
                <MultiSelectDropdown
                  label={newRole === '4' ? 'Link Student Children' : 'Assign Students'}
                  placeholder={newRole === '4' ? '-- Select Student Children --' : '-- Select Students to Assign --'}
                  options={users
                    .filter((u) => u.roles && (u.roles.includes('Student') || u.roles.some?.((r) => r.roleName === 'Student' || r.id === 3)))
                    .map((st) => ({ id: st.id, name: `${st.username} (ID: ${st.id})` }))}
                  selectedIds={newLinkedStudentIds}
                  onToggle={handleToggleLinkedStudentId}
                />
              )}

              {/* MultiSelectDropdown for Student linking Teachers */}
              {newRole === '3' && (
                <MultiSelectDropdown
                  label="Assign Teacher(s)"
                  placeholder="-- Select Teacher(s) to Assign --"
                  options={users
                    .filter((u) => u.roles && (u.roles.includes('Teacher') || u.roles.some?.((r) => r.roleName === 'Teacher' || r.id === 2)))
                    .map((tc) => ({ id: tc.id, name: `${tc.username} (ID: ${tc.id})` }))}
                  selectedIds={newLinkedTeacherIds}
                  onToggle={handleToggleLinkedTeacherId}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: '#f1f5f9', border: '1.5px solid #cbd5e1', color: '#475569', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={{ background: '#02658b', border: 'none', color: '#FFFFFF', padding: '0.5rem 1.25rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  {formLoading ? 'Saving...' : editingUser ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Reusable Confirm Modal for Delete Action */}
      <ConfirmModal
        isOpen={!!userToDelete}
        title="Delete User Account"
        subtitle="Permanent Action"
        message={
          userToDelete ? (
            <p style={{ margin: 0 }}>
              Are you sure you want to delete user <strong style={{ color: '#0f172a' }}>"{userToDelete.username}"</strong> from the database forever?
            </p>
          ) : null
        }
        confirmText="Delete User"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={deleteLoading}
        error={deleteError}
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />



      {/* User Documents Dialogue Modal */}
      {isDocsModalOpen && docsUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              width: '100%',
              maxWidth: '740px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              fontFamily: BrandConfig.fontFamily,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.4rem',
                borderBottom: '1.5px solid #cbd5e1',
                background: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  User Documents – {docsUser.username}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                  ID: {formatDisplayId(docsUser)} | Role: {getPrimaryRole(docsUser.roles)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDocsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Alert Messages */}
            {docsErrorMsg && (
              <div style={{ padding: '0.65rem 1.4rem', background: '#ffe4e6', color: '#9f1239', fontSize: '0.82rem', fontWeight: 500, borderBottom: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{docsErrorMsg}</span>
              </div>
            )}
            {docsSuccessMsg && (
              <div style={{ padding: '0.65rem 1.4rem', background: '#d1fae5', color: '#065f46', fontSize: '0.82rem', fontWeight: 500, borderBottom: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} />
                <span>{docsSuccessMsg}</span>
              </div>
            )}

            {/* Modal Body - Role Based Document Sections */}
            <div style={{ padding: '1.25rem 1.4rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
              {/* Section 1: CV (Only for Teachers) */}
              {getPrimaryRole(docsUser.roles) === 'Teacher' && (
                renderDocumentSection('cv', 'CV / Resume', docsUser.cvFile, docsUser)
              )}

              {/* Section 2: Educational Degree / Record */}
              {renderDocumentSection('degree', getPrimaryRole(docsUser.roles) === 'Student' ? 'Educational Record / Degree' : 'Educational Degree', docsUser.degreeFile, docsUser)}

              {/* Section 3: Certificates & Credentials */}
              {renderDocumentSection('certificate', 'Certificates & Credentials', docsUser.certificateFile, docsUser)}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '0.85rem 1.4rem', borderTop: '1.5px solid #cbd5e1', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsDocsModalOpen(false)}
                style={{
                  background: '#02658b',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.45rem 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* USER DETAIL DIALOGUE MODAL */}
      {selectedUserDetailModal && (
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
            {/* Header with Title and Close Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} color="#02658b" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  User Account Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetailModal(null)}
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
                <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>{selectedUserDetailModal.name}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Role</span>
                <span style={{ fontSize: '0.88rem', color: '#02658b', fontWeight: 700 }}>{selectedUserDetailModal.role}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>CNIC</span>
                <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>{selectedUserDetailModal.cnic || 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Contact</span>
                <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>{selectedUserDetailModal.contact || 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Email Address</span>
                <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600, wordBreak: 'break-all' }}>{selectedUserDetailModal.email}</span>
              </div>
              <div ref={detailModalAssignedDropdownRef} style={{ position: 'relative' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                  {selectedUserDetailModal.assignedFieldLabel || 'Assigned'}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailModalAssignedOpen(!detailModalAssignedOpen)}
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
                    {selectedUserDetailModal.assignedList && selectedUserDetailModal.assignedList.length > 0
                      ? `${selectedUserDetailModal.assignedList.length} ${selectedUserDetailModal.assignedFieldLabel || 'Assigned'}`
                      : `0 ${selectedUserDetailModal.assignedFieldLabel || 'Assigned'}`}
                  </span>
                  <ChevronDown size={14} color="#64748b" style={{ transform: detailModalAssignedOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                </button>

                {detailModalAssignedOpen && (
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
                    {selectedUserDetailModal.assignedList && selectedUserDetailModal.assignedList.length > 0 ? (
                      selectedUserDetailModal.assignedList.map((item, i) => (
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
                {selectedUserDetailModal.docs.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (doc.present && selectedUserDetailModal.rawUser) {
                        const type = doc.type || (doc.label.toLowerCase().includes('cv') ? 'cv' : doc.label.toLowerCase().includes('certificate') ? 'certificate' : 'degree');
                        const docObj = doc.docObj || parseDocumentObj(selectedUserDetailModal.rawUser[`${type}File`], doc.name);
                        handleOpenInNewTab(selectedUserDetailModal.rawUser, type, docObj, doc.degreeIndex || 0);
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
                      cursor: doc.present ? 'pointer' : 'default',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (doc.present) {
                        e.currentTarget.style.background = '#dbeafe';
                        e.currentTarget.style.borderColor = '#93c5fd';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (doc.present) {
                        e.currentTarget.style.background = '#e0f2fe';
                        e.currentTarget.style.borderColor = '#bae6fd';
                      }
                    }}
                    title={doc.present ? 'Click to open in new tab' : undefined}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: doc.present ? '#02658b' : '#64748b', textTransform: 'uppercase' }}>
                        {doc.label}
                      </span>
                      {doc.present && <ExternalLink size={12} color="#02658b" />}
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
                  value={selectedUserDetailModal.activationUrl}
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
                    navigator.clipboard.writeText(selectedUserDetailModal.activationUrl);
                    setDetailModalCopied(true);
                    setTimeout(() => setDetailModalCopied(false), 2000);
                  }}
                  style={{
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #02658b',
                    background: detailModalCopied ? '#059669' : '#02658b',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {detailModalCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  type="button"
                  title="Send via Email"
                  onClick={() => {
                    const subject = `Welcome to Academia Platform - Activate Your Account`;
                    let clickUrl = selectedUserDetailModal.activationUrl;
                    if (clickUrl.includes('127.0.0.1:')) {
                      clickUrl = clickUrl.replace('127.0.0.1:', 'localhost:');
                    }
                    const body = `Hello ${selectedUserDetailModal.name.trim()},\n\nWelcome to Academia Platform! Your account has been created by the System Administrator.\n\nPlease click the link below to set your password and activate your profile (valid for 24 hours):\n\n${clickUrl}\n\nAccount Role: ${selectedUserDetailModal.role}\n\nThank you!\nAcademia Admin Team`;
                    window.location.href = `mailto:${encodeURIComponent(selectedUserDetailModal.email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
                onClick={() => setSelectedUserDetailModal(null)}
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

    </div>
  );
};
