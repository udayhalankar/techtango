const { parseExcelBuffer } = require('../utils/excelParser');
const pool = require('../db');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const crypto = require('crypto');
require('dotenv').config();

// === Reuse your encryption shape (aes-256-cbc) ===
const algorithm = 'aes-256-cbc';
const key = Buffer.from((process.env.FILE_ENCRYPT_KEY || '').trim(), 'hex'); // 32 bytes hex
// validate key
if (!key || key.length !== 32) {
  console.error(
    '[upload] FILE_ENCRYPT_KEY must be 64 hex chars (32 bytes). ' +
    'Got length:', key ? key.length : 'missing'
  );
}
const ivLength = 16;

// Coerce possibly-array body fields coming from multipart forms
function first(v) {
  return Array.isArray(v) ? v[0] : v;
}
function asString(v, def = '') {
  const x = first(v);
  if (x === undefined || x === null) return def;
  return String(x);
}
function asNumberOrNull(v) {
  const x = first(v);
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

// Small helper to write buffer -> temp file
async function writeTemp(buffer, suffix = '.bin') {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'up-'));
  const p = path.join(dir, `buf${suffix}`);
  await fs.promises.writeFile(p, buffer);
  return p;
}
 

// Utility: fetch column names from the table

async function encryptFileFromPath(sourcePath, destPath, iv) {
  return new Promise((resolve, reject) => {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const input = fs.createReadStream(sourcePath);
    const output = fs.createWriteStream(destPath);
    input.pipe(cipher).pipe(output).on('finish', resolve).on('error', reject);
  });
}

async function ensureUploadsDir() {
  const dir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const getTableColumns = async (table) => {
  const result = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [table]);
  return result.rows.map(r => r.column_name);
};

 

exports.handleUpload = async (req, res) => {
  const table = req.params.tableName;
  const fileBuffer = req.file?.buffer;
  if (!fileBuffer) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const { headers, rows } = await parseExcelBuffer(fileBuffer);
    if (!headers || rows.length < 2) {
      return res.status(400).json({ error: 'Excel must contain header, datatype, and data rows.' });
    }

    // Remove Row 2 (data types)
    const dataRows = rows.slice(1);
    // Fetch actual table columns from DB
    const validColumns = await getTableColumns(table);
    // Ensure all headers are valid columns
    const invalidCols = headers.filter(col => !validColumns.includes(col));
    if (invalidCols.length > 0) {
      return res.status(400).json({
        error: 'Invalid columns in Excel',
        invalidColumns: invalidCols,
      });
    }

 

    // Prepare INSERT query
    const placeholders = headers.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `INSERT INTO ${table} (${headers.join(',')}) VALUES (${placeholders})`;

    let insertedCount = 0;

    for (const row of dataRows) {
      // Skip completely empty rows
      if (row.every(cell => cell === undefined || cell === null || cell === '')) continue;
      await pool.query(insertQuery, row);
      insertedCount++;
    }

    res.json({ success: true, inserted: insertedCount });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Upload failed', message: err.message });
  }
};

/**
 * NEW: Smart attachment endpoint (no :tableName)
 * Behavior:
 *  - If the incoming file looks like Excel (.xlsx/.xls), reject here (we keep Excel flow on /:tableName)
 *  - Otherwise treat as encrypted attachment -> approval_files
 * Request (multipart/form-data):
 *  - files[] or file (any name; multer.any())
 *  - ref_table (required)
 *  - ref_table_id (optional)
 */
exports.smartUpload = async (req, res) => {
  console.log('[upload] files:', Array.isArray(req.files) ? req.files.map(f => f.originalname) : null);
console.log('[upload] body:', req.body);

 
      if (!key || key.length !== 32) {
        return res.status(500).json({
          error: "Server misconfiguration",
          message: "FILE_ENCRYPT_KEY invalid or missing (needs 64 hex chars)."
        });
      }

  try {

    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    if (!files.length) return res.status(400).json({ error: 'No file uploaded' });

    // If someone tries to push Excel here, nudge to the existing endpoint
    const excelish = (name) => /\.(xlsx|xls)$/i.test(String(name || ''));
    if (excelish(files[0]?.originalname)) {
      return res.status(400).json({
        error: 'Excel uploads must use /api/upload/:tableName',
        hint: 'POST /api/upload/<your_table> with a single xlsx file'
      });
    }

    // const uploadedBy = req.user?.userId || null;
    // const refTable = (req.body?.ref_table || '').trim();
    // const refTableId = req.body?.ref_table_id ? Number(req.body.ref_table_id) : null;

    const uploadedBy = req.user?.userId || null;
    // tolerate arrays/strings
    const refTableRaw = asString(req.body?.ref_table).trim();
    const refTableId  = asNumberOrNull(req.body?.ref_table_id);
      // ? Number(req.body.ref_table_id)
      // : null;
    // Accept several aliases for the workflow instance id
    const approvalId =
      asNumberOrNull(req.body?.instance_id) ??
      asNumberOrNull(req.body?.approval_id) ??
      asNumberOrNull(req.body?.workflow_id) ??
      null;
    

    const effectiveRefTable = refTableRaw || 'unlinked';

    const dir = await ensureUploadsDir();
    const saved = [];

    // Encrypt each buffer to uploads/*.enc and insert into approval_files
    for (const f of files) {
      // const originalname = (f.originalname || 'file').slice(0, 255);
      // const base = originalname.replace(/[^\w.\-]+/g, '_') || 'file';
      // const stamp = Date.now().toString(36);
      // const rand  = crypto.randomBytes(6).toString('hex');
      // const dest  = path.join(dir, `${stamp}_${rand}_${base}.enc`);

      const originalname = (f.originalname || 'file').slice(0, 255);
      // opaque, does not reveal original name
      const stamp  = Date.now().toString(36);
      const rand   = crypto.randomBytes(8).toString('hex');
      const fname  = `${stamp}_${rand}.enc`;
      const dir    = await ensureUploadsDir();
      const destFS = path.join(dir, fname);                 // absolute for writing
      const dbPath = path.posix.join('uploads', fname);     // store forward slashes

      // temp write -> encrypt -> remove temp
      //const tmpPath = await writeTemp(f.buffer, path.extname(base) || '.bin');
      const tmpPath = await writeTemp(f.buffer, '.bin');
      const iv      = crypto.randomBytes(ivLength);
      await encryptFileFromPath(tmpPath, destFS, iv);
      try { await fs.promises.unlink(tmpPath); } catch (_) {}

      const { rows } = await pool.query(
        `INSERT INTO approval_files
          (approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv, ref_table, ref_table_id)
        VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7)
        RETURNING id, approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv, ref_table, ref_table_id`,
        [
          approvalId,                         // may be null when uploading from pure view
          originalname,
          dbPath,                             // relative path only
          uploadedBy,
          iv.toString('hex'),
          effectiveRefTable,                  // 'unlinked' if not provided
          refTableId                          // may be null
        ]
      );
      saved.push(rows[0]);
    }

    // Return in a shape your UI code already tolerates
    return res.json({ files: saved, file: saved[0] || null });
  } catch (err) {
    console.error('smartUpload failed:', err);
    return res.status(500).json({ error: 'Upload failed', message: err.message });
  }
};
