import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { BrandConfig } from '../../../config/BrandConfig';
import { Pagination } from '../../../components/Pagination';
import { ConfirmModal } from '../../../components/ConfirmModal';
import {
  fetchUsersApi,
  registerApi,
  assignRoleApi,
  assignDirectPermissionApi,
  updateUserStatusApi,
  updateUserApi,
  deleteUserApi,
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
  Phone,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';

export const UserRoleManager = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Refs for click outside to close dropdowns
  const filterDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setShowSortDropdown(false);
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

  // Modal State for "Add / Edit User"
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newRole, setNewRole] = useState('1'); // Default Admin
  const [newPermission, setNewPermission] = useState('2'); // Default manage:users permission
  const [newStatus, setNewStatus] = useState('registered');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // State for Custom Delete Confirmation Modal
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const usersRes = await fetchUsersApi();

      if (usersRes.success) {
        setUsers(usersRes.users || []);
      } else {
        setError(usersRes.error || 'Failed to fetch directory users');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error loading user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setNewUsername('');
    setNewPassword('');
    setNewEmail('');
    setNewPhoneNumber('');
    setNewRole('1');
    setNewPermission('2');
    setNewStatus('registered');
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (targetUser) => {
    setEditingUser(targetUser);
    setNewUsername(targetUser.username || '');
    setNewPassword('');
    setNewEmail(targetUser.email || '');
    setNewPhoneNumber(targetUser.phoneNumber || '');
    
    // Map role name to role ID string
    const roles = targetUser.roles || [];
    let roleIdStr = '4'; // Default Parent
    if (roles.includes('Super Admin')) roleIdStr = '1';
    else if (roles.includes('Teacher')) roleIdStr = '2';
    else if (roles.includes('Student')) roleIdStr = '3';
    else if (roles.includes('Parent')) roleIdStr = '4';
    
    setNewRole(roleIdStr);
    setNewPermission(roleIdStr === '1' ? '2' : '');
    setNewStatus(targetUser.status || 'registered');
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

  // Sort Options List
  const sortOptions = [
    { id: 'default', label: 'Default', field: null, direction: 'asc' },
    { id: 'id-asc', label: 'ID (Low to High)', field: 'id', direction: 'asc' },
    { id: 'id-desc', label: 'ID (High to Low)', field: 'id', direction: 'desc' },
    { id: 'name-asc', label: 'Name (A - Z)', field: 'username', direction: 'asc' },
    { id: 'name-desc', label: 'Name (Z - A)', field: 'username', direction: 'desc' },
    { id: 'role-asc', label: 'Role (A - Z)', field: 'role', direction: 'asc' },
    { id: 'role-desc', label: 'Role (Z - A)', field: 'role', direction: 'desc' },
    { id: 'email-asc', label: 'Email (A - Z)', field: 'email', direction: 'asc' },
    { id: 'email-desc', label: 'Email (Z - A)', field: 'email', direction: 'desc' },
    { id: 'phone-asc', label: 'Phone (Ascending)', field: 'phoneNumber', direction: 'asc' },
    { id: 'phone-desc', label: 'Phone (Descending)', field: 'phoneNumber', direction: 'desc' },
    { id: 'status-asc', label: 'Status (Registered First)', field: 'status', direction: 'asc' },
    { id: 'status-desc', label: 'Status (Unregistered First)', field: 'status', direction: 'desc' },
  ];

  const currentSortOption =
    sortOptions.find((opt) => opt.field === sortField && opt.direction === sortDirection) ||
    sortOptions[0];

  // Filter & Sort Math
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      formatDisplayId(u).toLowerCase().includes(searchQuery.toLowerCase());

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
  const totalPages = Math.ceil(totalUsersCount / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + pageSize);

  // CSV Export
  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,#,ID,Name,Role,Email,Phone,Status\n' +
      sortedUsers
        .map((u, index) =>
          [
            index + 1,
            formatDisplayId(u),
            `"${u.username}"`,
            getPrimaryRole(u.roles),
            u.email || `${u.username}@gmail.com`,
            u.phoneNumber || '1234567890',
            u.status === 'registered' ? 'Registered' : 'Not Registered',
          ].join(',')
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `User_Role_Directory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: 'calc(100vh - 6.5rem)', minHeight: 0, overflow: 'hidden', fontFamily: BrandConfig.fontFamily }}>
      
      {/* Search Bar + Sort & Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.85rem', flexShrink: 0, marginTop: '0.75rem' }}>
        
        {/* Left Side: Sort Dropdown Button Only */}
        <div ref={sortDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              height: '42px',
              borderRadius: '9px',
              background: '#FFFFFF',
              border: '1.5px solid #cbd5e1',
              padding: '0 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <ArrowUpDown size={15} color="#475569" />
            <span>Sort: {currentSortOption.label}</span>
            <ChevronDown size={14} color="#64748b" />
          </button>

          {/* Sort Options Dropdown Popup */}
          {showSortDropdown && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '2.8rem',
                background: '#FFFFFF',
                border: '1.5px solid #cbd5e1',
                borderRadius: '9px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                padding: '0.5rem',
                zIndex: 50,
                minWidth: '220px',
                maxHeight: '280px',
                overflowY: 'auto',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', padding: '0.3rem 0.5rem', letterSpacing: '0.5px' }}>
                SORT BY
              </div>
              {sortOptions.map((opt) => {
                const isSelected = currentSortOption.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSortField(opt.field);
                      setSortDirection(opt.direction);
                      setShowSortDropdown(false);
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.82rem',
                      background: isSelected ? '#000000' : 'transparent',
                      color: isSelected ? '#FFFFFF' : '#0f172a',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 600 : 400,
                      marginBottom: '2px',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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

          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.78rem',
              cursor: 'pointer',
              padding: '0.1rem 0.3rem',
              marginTop: '0.35rem',
              fontWeight: 500,
            }}
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Data Grid Table Container (Outlined height reduced from bottom) */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1.5px solid #cbd5e1',
          overflow: 'hidden',
          flex: 1,
          maxHeight: 'calc(100vh - 18rem)', // Reduced height from bottom slightly
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: '#e5f3f7', borderBottom: '1.5px solid #cbd5e1', color: '#0f172a', fontWeight: 700 }}>
                <th style={{ padding: '1.05rem 1rem', width: '50px', borderRight: '1px solid #cbd5e1' }}>#</th>
                <th style={{ padding: '1.05rem 1rem', borderRight: '1px solid #cbd5e1' }}>ID</th>
                <th style={{ padding: '1.05rem 1rem', borderRight: '1px solid #cbd5e1' }}>Name</th>
                <th style={{ padding: '1.05rem 1rem', borderRight: '1px solid #cbd5e1' }}>Role</th>
                <th style={{ padding: '1.05rem 1rem', borderRight: '1px solid #cbd5e1' }}>Email</th>
                <th style={{ padding: '1.05rem 1rem', borderRight: '1px solid #cbd5e1' }}>Ph#</th>
                <th style={{ padding: '1.05rem 1rem', borderRight: '1px solid #cbd5e1' }}>Status</th>
                <th style={{ padding: '1.05rem 1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    Loading user records...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
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
                  const isRegistered = user.status === 'registered';

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: '#FFFFFF',
                        transition: 'background 0.15s',
                        cursor: 'pointer',
                      }}
                    >
                      {/* # Row Index */}
                      <td style={{ padding: '1.05rem 1rem', fontWeight: 700, color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                        {globalRowNumber}
                      </td>

                      {/* ID */}
                      <td style={{ padding: '1.05rem 1rem', color: '#475569', fontSize: '0.85rem', borderRight: '1px solid #e2e8f0' }}>
                        {displayId}
                      </td>

                      {/* Name */}
                      <td style={{ padding: '1.05rem 1rem', fontWeight: 600, color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                        {user.username}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '1.05rem 1rem', color: '#475569', borderRight: '1px solid #e2e8f0' }}>
                        {roleName}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '1.05rem 1rem', color: '#64748b', fontSize: '0.82rem', borderRight: '1px solid #e2e8f0' }}>
                        {userEmail}
                      </td>

                      {/* Ph# */}
                      <td style={{ padding: '1.05rem 1rem', color: '#475569', fontSize: '0.85rem', borderRight: '1px solid #e2e8f0' }}>
                        {phoneNum}
                      </td>

                      {/* Status (Tag Pill Only) */}
                      <td style={{ padding: '1.05rem 1rem', borderRight: '1px solid #e2e8f0' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: isRegistered ? '#d1fae5' : '#ffe4e6',
                            color: isRegistered ? '#065f46' : '#9f1239',
                            border: `1px solid ${isRegistered ? '#a7f3d0' : '#fecdd3'}`,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isRegistered ? '#10b981' : '#f43f5e',
                            }}
                          />
                          {isRegistered ? 'Registered' : 'Not Registered'}
                        </span>
                      </td>

                      {/* Actions (Edit / Delete) */}
                      <td style={{ padding: '1.05rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            title="Edit User"
                            style={{
                              background: '#e5f3f7',
                              border: '1px solid #cbd5e1',
                              borderRadius: '0.375rem',
                              padding: '0.35rem 0.5rem',
                              color: '#02658b',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            title="Delete User Forever"
                            style={{
                              background: '#ffe4e6',
                              border: '1px solid #fecdd3',
                              borderRadius: '0.375rem',
                              padding: '0.35rem 0.5rem',
                              color: '#9f1239',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Trash2 size={15} />
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
        totalItems={filteredUsers.length}
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
                    Module Permission
                  </label>
                  <select
                    value={newPermission}
                    onChange={(e) => setNewPermission(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #cbd5e1', borderRadius: '0.375rem', background: '#FAFAFA', outline: 'none' }}
                  >
                    {newRole === '1' && (
                      <>
                        <option value="2">manage:users (User Governance)</option>
                        <option value="1">read:governance (System Read)</option>
                      </>
                    )}
                    {newRole === '2' && (
                      <>
                        <option value="3">read:student_data (Read Student Data)</option>
                        <option value="4">update:student_data (Update Student Data)</option>
                      </>
                    )}
                    {newRole === '3' && (
                      <option value="5">read:own_data (Read Own Academic Data)</option>
                    )}
                    {newRole === '4' && (
                      <option value="6">read:child_data (Read Child Data)</option>
                    )}
                  </select>
                </div>
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
    </div>
  );
};
