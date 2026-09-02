import React from 'react';

export const Pagination = ({
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50],
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const handlePageSizeChange = (newSize) => {
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    }
  };

  const handlePageChange = (newPage) => {
    if (onPageChange && newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        width: 'fit-content',
        padding: '0.4rem 0.85rem',
        background: '#FFFFFF',
        borderRadius: '8px',
        border: '1.5px solid #cbd5e1',
        fontSize: '0.85rem',
        color: '#475569',
        flexShrink: 0,
      }}
    >
      {/* Left Controls: Previous, Page Pills, Next */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #cbd5e1',
            borderRadius: '0.375rem',
            padding: '0.25rem 0.65rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: currentPage === 1 ? '#94a3b8' : '#0f172a',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          Previous
        </button>

        {/* Page 1 Pill */}
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          style={{
            background: currentPage === 1 ? '#f1f5f9' : '#FFFFFF',
            border: '1.5px solid #cbd5e1',
            borderRadius: '0.375rem',
            padding: '0.25rem 0.55rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#0f172a',
            cursor: 'pointer',
          }}
        >
          1
        </button>

        {totalPages > 2 && <span style={{ color: '#94a3b8' }}>...</span>}

        {totalPages > 1 && (
          <button
            type="button"
            onClick={() => handlePageChange(totalPages)}
            style={{
              background: currentPage === totalPages ? '#f1f5f9' : '#FFFFFF',
              border: '1.5px solid #cbd5e1',
              borderRadius: '0.375rem',
              padding: '0.25rem 0.55rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            {totalPages}
          </button>
        )}

        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            background: '#02658b',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '0.375rem',
            padding: '0.25rem 0.75rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.5 : 1,
          }}
        >
          Next
        </button>
      </div>

      {/* Right Selectors: Rows 10 ▾ & Page # 01 ▾ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #cbd5e1',
              borderRadius: '0.375rem',
              padding: '0.2rem 0.45rem',
              fontSize: '0.82rem',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} ▾
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>Page #</span>
          <select
            value={currentPage}
            onChange={(e) => handlePageChange(Number(e.target.value))}
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #cbd5e1',
              borderRadius: '0.375rem',
              padding: '0.2rem 0.45rem',
              fontSize: '0.82rem',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                {p < 10 ? `0${p}` : p} ▾
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
