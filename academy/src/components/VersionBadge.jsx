import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { checkUpdateApi, startDownloadApi, fetchDownloadProgressApi } from '../api';
import { RefreshCw, Download, CheckCircle2, X, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';

export const VersionBadge = ({ position = 'inline', onUpdateStatusChange }) => {
  const [currentVersion, setCurrentVersion] = useState(() => {
    return localStorage.getItem('academy_app_version') || '0.7.0';
  });
  const [latestVersion, setLatestVersion] = useState(() => {
    return localStorage.getItem('academy_app_version') || '0.7.0';
  });
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [releaseUrl, setReleaseUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // 'idle' | 'downloading' | 'done' | 'error'
  const [downloadError, setDownloadError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const pollIntervalRef = useRef(null);

  const performCheck = React.useCallback(async () => {
    setChecking(true);
    try {
      const res = await checkUpdateApi();
      if (res && res.success) {
        if (res.currentVersion) {
          setCurrentVersion(res.currentVersion);
          try {
            localStorage.setItem('academy_app_version', res.currentVersion);
          } catch {
            // Ignored
          }
        }
        if (res.latestVersion) setLatestVersion(res.latestVersion);
        const avail = !!res.updateAvailable;
        setUpdateAvailable(avail);
        if (onUpdateStatusChange) onUpdateStatusChange(avail);
        if (res.releaseNotes) setReleaseNotes(res.releaseNotes);
        if (res.releaseUrl) setReleaseUrl(res.releaseUrl);
        if (res.downloadUrl) setDownloadUrl(res.downloadUrl);
      }
    } catch {
      // Background check failure handled gracefully
    } finally {
      setChecking(false);
    }
  }, [onUpdateStatusChange]);

  useEffect(() => {
    performCheck();
    const ONE_HOUR = 60 * 60 * 1000;
    const interval = setInterval(() => {
      performCheck();
    }, ONE_HOUR);

    return () => {
      clearInterval(interval);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [performCheck]);

  const startProgressPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetchDownloadProgressApi();
        if (res && res.success) {
          if (res.progress !== undefined) {
            setDownloadProgress(res.progress);
          }
          if (res.status === 'downloading') {
            setDownloadStatus('downloading');
          } else if (res.status === 'done') {
            setDownloadStatus('done');
            setDownloadProgress(100);
            setUpdateMessage('Download complete! Installing update & restarting app...');
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setTimeout(() => {
              try { window.close(); } catch {
                // Ignored
              }
            }, 1800);
          } else if (res.status === 'error') {
            setDownloadStatus('error');
            setDownloadError(res.error || 'Failed to download update file.');
            setUpdating(false);
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch {
        // Polling error retry on next interval
      }
    }, 500);
  };

  const handleUpdateClick = async () => {
    setUpdating(true);
    setDownloadStatus('downloading');
    setDownloadProgress(0);
    setDownloadError('');
    setUpdateMessage('Starting update download...');

    try {
      const res = await startDownloadApi();
      if (res && res.success) {
        startProgressPolling();
      } else {
        if (downloadUrl || releaseUrl) {
          window.open(downloadUrl || releaseUrl, '_blank');
        }
        setDownloadStatus('error');
        setDownloadError(res?.error || 'Could not initiate in-app update.');
        setUpdating(false);
      }
    } catch {
      if (downloadUrl || releaseUrl) {
        window.open(downloadUrl || releaseUrl, '_blank');
      }
      setDownloadStatus('error');
      setDownloadError('In-app download failed. Opening browser download page...');
      setUpdating(false);
    }
  };

  const modalContent = showModal ? (
    <div
      className="version-update-modal-portal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '450px',
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
          color: '#0f172a',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {updateAvailable ? (
              <Download size={22} color="#02658b" />
            ) : (
              <CheckCircle2 size={22} color="#10b981" />
            )}
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              {updateAvailable ? 'Software Update Available' : 'System Up to Date'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '1.25rem' }}>
          {updateAvailable ? (
            <div>
              {/* 2 Version Cards: Current Version & Update Version */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Current Version
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    v{currentVersion}
                  </div>
                </div>

                <div style={{ background: '#e5f3f7', border: '1.5px solid #02658b', borderRadius: '8px', padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#02658b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Update Version
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#02658b' }}>
                    v{latestVersion}
                  </div>
                </div>
              </div>

              {/* Progress Bar & Download Status */}
              {(downloadStatus === 'downloading' || downloadStatus === 'done') && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                    <span>{downloadStatus === 'done' ? 'Update Downloaded!' : 'Downloading Update...'}</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                    <div
                      style={{
                        width: `${downloadProgress}%`,
                        height: '100%',
                        background: downloadStatus === 'done' ? '#10b981' : '#02658b',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {downloadStatus === 'done'
                      ? 'Installing update in background & restarting app...'
                      : 'Please keep the application open during download.'}
                  </div>
                </div>
              )}

              {downloadStatus === 'error' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Download Failed:</strong> {downloadError}
                  </div>
                </div>
              )}

              {releaseNotes && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.65rem 0.8rem', fontSize: '0.8rem', color: '#475569', marginBottom: '0.75rem', maxHeight: '90px', overflowY: 'auto' }}>
                  <strong>What's new:</strong> {releaseNotes}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#065f46', background: '#d1fae5', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                <ShieldCheck size={16} />
                <span>Your database (academy.db) & user data remain safe during update.</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: 1.6 }}>
                You are using the latest version: <br />
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '0.6rem',
                    padding: '0.4rem 0.9rem',
                    background: '#f8fafc',
                    color: '#02658b',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                  }}
                >
                  v{currentVersion}
                </span>
              </p>
            </div>
          )}

          {updateMessage && downloadStatus !== 'downloading' && (
            <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.65rem', borderRadius: '8px', fontSize: '0.8rem', marginTop: '0.75rem' }}>
              {updateMessage}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={performCheck}
            disabled={checking || updating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#0f172a',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: (checking || updating) ? 'not-allowed' : 'pointer',
              opacity: (checking || updating) ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} className={checking ? 'spin' : ''} />
            <span>{checking ? 'Checking...' : 'Check Again'}</span>
          </button>

          {updateAvailable && (
            <button
              type="button"
              onClick={handleUpdateClick}
              disabled={updating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1.1rem',
                borderRadius: '6px',
                background: updating ? '#64748b' : '#02658b',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: updating ? 'not-allowed' : 'pointer',
              }}
            >
              {updating ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
              <span>
                {downloadStatus === 'downloading'
                  ? `Downloading (${downloadProgress}%)`
                  : downloadStatus === 'done'
                  ? 'Restarting App...'
                  : 'Update Now'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;

  if (position === 'top-left') {
    return (
      <>
        <div style={{ position: 'fixed', top: '1.25rem', left: '1.25rem', zIndex: 999 }}>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.9rem',
              background: '#ffffff',
              color: '#0f172a',
              border: '1.5px solid #cbd5e1',
              borderRadius: '24px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.2s ease',
            }}
            title="Click to check for updates"
          >
            <span style={{ color: '#02658b', fontWeight: 700 }}>v{currentVersion}</span>
            {updateAvailable && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px #ef4444',
                }}
              />
            )}
          </button>
        </div>
        {modalContent && createPortal(modalContent, document.body)}
      </>
    );
  }

  return (
    <>
      {/* INLINE DROPDOWN BADGE */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '0.35rem 0.55rem',
          background: '#f8fafc',
          color: '#0f172a',
          border: '1px solid #cbd5e1',
          borderRadius: '0.375rem',
          fontSize: '0.72rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Click to check for updates"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.64rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Version</span>
          <span style={{ color: '#02658b', fontWeight: 700, fontSize: '0.72rem' }}>v{currentVersion}</span>
        </div>

        {updateAvailable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', position: 'absolute', right: '0.55rem' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                display: 'inline-block',
                boxShadow: '0 0 4px #ef4444',
              }}
            />
            <span style={{ fontSize: '0.64rem', color: '#ef4444', fontWeight: 700 }}>Update!</span>
          </div>
        )}
      </button>

      {/* PORTAL MODAL DIALOGUE AT ROOT LEVEL */}
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
};
