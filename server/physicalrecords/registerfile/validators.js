// server/physicalrecords/registerfile/validators.js
exports.parseListQuery = (q = {}) => {
  const text      = String(q.q || q.text || '').trim();
  // still read rm_status, but we'll use it only for filestatus
  const rmStatus  = String(q.rm_status || 'CIRCULATION').trim();
  const page      = Math.max(1, parseInt(q.page || 1, 10));
  const pageSize  = Math.min(200, Math.max(1, parseInt(q.pageSize || 20, 10)));
  const sortBy    = String(q.sortBy || 'date_created');
  const sortDir   = String(q.sortDir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { text, rmStatus, page, pageSize, sortBy, sortDir };
};

exports.parseIdParam = (raw) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

exports.parseUpsertBody = (b = {}) => {
  const id           = b.id != null ? Number(b.id) : null;
  const fileid       = (b.fileid ?? b.record_id ?? '').toString().trim();
  const title        = (b.title ?? '').toString().trim();
  const fileplan_id  = b.fileplan_id != null ? Number(b.fileplan_id) : null;
  const category_id  = b.category_id != null ? Number(b.category_id) : null;

  const metadata = (b.metadata && typeof b.metadata === 'object') ? b.metadata : {};

  if (!id && !fileid) throw new Error('File QR Code (fileid) is required');
  if (!title)         throw new Error('File Name (title) is required');
  return { id, fileid, title, fileplan_id, category_id, metadata };
};
