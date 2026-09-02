import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const MultiSelectDropdown = ({ label, options = [], selectedIds = [], onToggle, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedCount = selectedIds.length;
  const selectedNames = options
    .filter((opt) => selectedIds.includes(String(opt.id)))
    .map((opt) => opt.name)
    .join(', ');

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      {label && (
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          border: '1.5px solid #cbd5e1',
          borderRadius: '0.375rem',
          background: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '38px',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: selectedCount > 0 ? '#0f172a' : '#94a3b8', fontWeight: selectedCount > 0 ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
          {selectedCount > 0 ? `${selectedCount} Selected (${selectedNames})` : placeholder || '-- Select --'}
        </span>
        <ChevronDown size={16} color="#64748b" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '0.375rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '0.25rem 0',
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
              No available records
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = selectedIds.includes(String(opt.id));
              return (
                <div
                  key={opt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(opt.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: isSelected ? '#1e40af' : '#334155',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>{opt.name}</span>
                  {isSelected && <Check size={16} color="#2563eb" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
