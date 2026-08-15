const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../db');
require('dotenv').config();

const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.FILE_ENCRYPT_KEY.trim(), 'hex');
const ivLength = 16;

function encryptFile(sourcePath, destPath, iv) {
  return new Promise((resolve, reject) => {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const input = fs.createReadStream(sourcePath);
    const output = fs.createWriteStream(destPath);
    input.pipe(cipher).pipe(output).on('finish', resolve).on('error', reject);
  });
}

function decryptFile(encryptedPath, decryptedPath, ivHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const input = fs.createReadStream(encryptedPath);
  const output = fs.createWriteStream(decryptedPath);
  return new Promise((resolve, reject) => {
    input.pipe(decipher).pipe(output).on('finish', resolve).on('error', reject);
  });
}

/**
 * Reusable file upload logic
 * @param {number} parentId - approval_id or enquiry_id depending on context
 * @param {number} userId - uploader ID
 * @param {array} files - array of files from multer
 */
async function uploadEncryptedFiles(parentId, userId, files) {
  for (const file of files) {
    const iv = crypto.randomBytes(ivLength);
    const encryptedPath = `${file.path}.enc`;
    await encryptFile(file.path, encryptedPath, iv);
    fs.unlinkSync(file.path);

    await pool.query(
      `INSERT INTO approval_files (
         approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv
       ) VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [parentId, file.originalname, encryptedPath, userId, iv.toString('hex')]
    );
  }
}

async function uploadEnquiryFiles(enquiryId, userId, files = []) {
  const saved = [];
  for (const file of files) {
    const iv = crypto.randomBytes(ivLength);
    const encryptedPath = `${file.path}.enc`;
    await encryptFile(file.path, encryptedPath, iv);
    fs.unlinkSync(file.path);

    const { rows } = await pool.query(
      `INSERT INTO enquiry_files
         (enquiry_id, original_name, stored_path, uploaded_by, created_at, iv_hex)
       VALUES ($1, $2, $3, $4, NOW(), $5)
       RETURNING id, enquiry_id, original_name, stored_path, uploaded_by, created_at, iv_hex`,
      [enquiryId, file.originalname, encryptedPath, userId || null, iv.toString('hex')]
    );
    saved.push(rows[0]);
  }
  return saved;
}


module.exports = {
  uploadEncryptedFiles,      // existing (writes to approval_files)
  uploadEnquiryFiles,        // new (writes to enquiry_files)
  encryptFile,
  decryptFile
};
