/**
 * Common Helper Utilities for Academia Platform Frontend
 */

/**
 * Returns the appropriate MIME Content-Type string for a given filename.
 */
export const getMimeType = (filename = '') => {
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
    case 'txt': return 'text/plain; charset=utf-8';
    case 'csv': return 'text/csv; charset=utf-8';
    case 'rtf': return 'application/rtf';
    case 'zip': return 'application/zip';
    case 'rar': return 'application/vnd.rar';
    case '7z': return 'application/x-7z-compressed';
    default: return 'application/octet-stream';
  }
};

/**
 * Formats a raw numeric CNIC into Pakistani format (XXXXX-XXXXXXX-X).
 */
export const formatCnic = (value = '') => {
  const raw = value.replace(/\D/g, '').slice(0, 13);
  if (raw.length > 12) {
    return `${raw.slice(0, 5)}-${raw.slice(5, 12)}-${raw.slice(12)}`;
  }
  if (raw.length > 5) {
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  }
  return raw;
};

/**
 * Formats a raw contact number into standard mobile format (03XX XXXXXXX).
 */
export const formatContact = (value = '') => {
  const raw = value.replace(/\D/g, '').slice(0, 11);
  if (raw.length > 4) {
    return `${raw.slice(0, 4)} ${raw.slice(4)}`;
  }
  return raw;
};

/**
 * Input event change handler for CNIC fields.
 */
export const handleCnicChange = (e, setter) => {
  setter(formatCnic(e.target.value));
};

/**
 * Input event change handler for Contact / Phone fields.
 */
export const handleContactChange = (e, setter) => {
  setter(formatContact(e.target.value));
};
