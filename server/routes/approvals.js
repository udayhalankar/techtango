const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { verifyToken } = require('../middleware/authMiddleware');
require('dotenv').config();
const sendTaskEmail = require('../utils/sendEmail');

// server/routes/approvals.js (example mutation)
const { validate } = require('../middleware/validation');
const { logAudit } = require('../middleware/audit');
// server/routes/approvals.js (example mutation)

const upload = multer({ dest: 'uploads/' });

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

router.post('/', verifyToken, upload.array('files'), async (req, res) => {
  const { title, assignee, details, dueDate } = req.body;
  const userId = req.user.userId;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const approvalRes = await client.query(
      `INSERT INTO approvals (title, assignee, details, due_date, assigned_by, created_at, status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'New') RETURNING id`,
      [title, assignee, details, dueDate, userId]
    );
    const approvalId = approvalRes.rows[0].id;

    for (const file of req.files) {
      const iv = crypto.randomBytes(ivLength);
      const encryptedPath = `${file.path}.enc`;
      await encryptFile(file.path, encryptedPath, iv);
      fs.unlinkSync(file.path);

      await client.query(
        `INSERT INTO approval_files (approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [approvalId, file.originalname, encryptedPath, userId, iv.toString('hex')]
      );
    }

    const assigneeRes = await pool.query(
      'SELECT firstname, email FROM users WHERE id = $1',
      [assignee]
    );
    const assigneeUser = assigneeRes.rows[0];
    await sendTaskEmail({
      to: assigneeUser.email,
      recipientName: assigneeUser.firstname,
      message: "You have been assigned a new task item.",
      link: "http://localhost:3000/approvals?tab=inbox"
    });

    await client.query('COMMIT');
    res.status(201).json({ message: 'Approval created' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating approval:', err);
    res.status(500).json({ error: 'Failed to create approval' });
  } finally {
    client.release();
  }
});

router.get('/inbox', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT a.*, ab.firstname AS assigned_by_firstname, au.firstname AS assignee_firstname,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', f.id, 'original_filename', f.original_filename,
          'uploaded_by_name', u.firstname, 'uploaded_at', f.uploaded_at
        )) FILTER (WHERE f.id IS NOT NULL), '[]') AS files
       FROM approvals a
       JOIN users ab ON ab.id = a.assigned_by
       JOIN users au ON au.id = a.assignee
       LEFT JOIN approval_files f ON f.approval_id = a.id
       LEFT JOIN users u ON u.id = f.uploaded_by
       WHERE a.assignee = $1
       GROUP BY a.id, ab.firstname, au.firstname`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Failed to fetch inbox approvals:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/outbox', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT a.*, ab.firstname AS assigned_by_firstname, au.firstname AS assignee_firstname,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', f.id, 'original_filename', f.original_filename,
          'uploaded_by_name', u.firstname, 'uploaded_at', f.uploaded_at
        )) FILTER (WHERE f.id IS NOT NULL), '[]') AS files
       FROM approvals a
       JOIN users ab ON ab.id = a.assigned_by
       JOIN users au ON au.id = a.assignee
       LEFT JOIN approval_files f ON f.approval_id = a.id
       LEFT JOIN users u ON u.id = f.uploaded_by
       WHERE a.assigned_by = $1
       GROUP BY a.id, ab.firstname, au.firstname`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Failed to fetch outbox approvals:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/download/:id', verifyToken, async (req, res) => {
  const fileId = req.params.id;
  try {
    const fileRes = await pool.query(
      `SELECT original_filename, encrypted_path, iv FROM approval_files WHERE id = $1`,
      [fileId]
    );
    if (fileRes.rows.length === 0) return res.status(404).json({ message: 'File not found' });
    const { original_filename, encrypted_path, iv } = fileRes.rows[0];

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const decryptedPath = path.join(tempDir, original_filename);

    await decryptFile(encrypted_path, decryptedPath, iv);
    res.download(decryptedPath, original_filename, (err) => {
      fs.unlink(decryptedPath, () => {});
      if (err) console.error('Download error:', err);
    });
  } catch (err) {
    console.error('❌ File download failed:', err);
    res.status(500).json({ error: 'File download error' });
  }
});


router.get('/test', (req, res) => {
  res.send("✅ Approvals routes are working");
});


// 📜 Get audit logs for a specific approval
router.get('/:id/audit', async (req, res) => {
  const approvalId = req.params.id;
  console.log("✅ Reached /approvals/:id/audit with id =", approvalId);
  try {
    const result = await pool.query(
      `SELECT 
        a.record_id,
        a.modified_at,
        CASE WHEN a.action = 'Insert' THEN 'Created' ELSE 'Modified' END AS action,
        CONCAT(u.firstname, ' ', u.lastname) AS modified_by_name,
        a.details,
        COALESCE(a.changed_data->>'status', '-') AS status,
        COALESCE(a.changed_data->>'assignee_comments', '-') AS comments
      FROM audit_log a
      JOIN users u ON a.modified_by = u.id
      WHERE table_name = 'approvals' AND a.record_id = $1
      ORDER BY a.modified_at DESC`,
      [approvalId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Failed to fetch audit logs:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});






router.patch('/:id/update-by-assignee', verifyToken, upload.array('files'), async (req, res) => {
  const approvalId = req.params.id;
  const userId = req.user.userId;
  const { status, assignee_comments } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const approvalCheck = await client.query('SELECT * FROM approvals WHERE id = $1 AND assignee = $2', [approvalId, userId]);
    if (approvalCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Unauthorized: Not the assignee' });
    }

    await client.query(
      `UPDATE approvals SET status = $1, assignee_comments = $2, modified_by = $3, modified_date = NOW() WHERE id = $4`,
      [status, assignee_comments, userId, approvalId]
    );

    for (const file of req.files) {
      const iv = crypto.randomBytes(ivLength);
      const encryptedPath = `${file.path}.enc`;
      await encryptFile(file.path, encryptedPath, iv);
      fs.unlinkSync(file.path);
      await client.query(
        `INSERT INTO approval_files (approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [approvalId, file.originalname, encryptedPath, userId, iv.toString('hex')]
      );
    }

    const assignorRes = await pool.query(
      `SELECT u.firstname, u.email FROM users u JOIN approvals a ON a.assigned_by = u.id WHERE a.id = $1`,
      [approvalId]
    );
    const assignor = assignorRes.rows[0];
    await sendTaskEmail({
      to: assignor.email,
      recipientName: assignor.firstname,
      message: "The status of your assigned task has been updated.",
      link: "http://localhost:3000/approvals?tab=outbox"
    });

    await client.query('COMMIT');
    res.json({ message: 'Approval updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Assignee update failed:', err);
    res.status(500).json({ error: 'Update failed' });
  } finally {
    client.release();
  }
});

module.exports = router;



// const express = require('express');
// const router = express.Router();
// const pool = require('../db');
// const multer = require('multer');
// const fs = require('fs');
// const crypto = require('crypto');
// const path = require('path');
// const { verifyToken } = require('../middleware/authMiddleware');
// require('dotenv').config();
// const sendTaskEmail = require('../utils/sendTaskEmail');


// const upload = multer({ dest: 'uploads/' });

// const algorithm = 'aes-256-cbc';
// const key = Buffer.from(process.env.FILE_ENCRYPT_KEY.trim(), 'hex'); // Must be 64 hex chars (32 bytes)
// const ivLength = 16;

// // 🔒 Encrypt file
// function encryptFile(sourcePath, destPath, iv) {
//   return new Promise((resolve, reject) => {
//     const cipher = crypto.createCipheriv(algorithm, key, iv);
//     const input = fs.createReadStream(sourcePath);
//     const output = fs.createWriteStream(destPath);

//     input.pipe(cipher).pipe(output)
//       .on('finish', resolve)
//       .on('error', reject);
//   });
// }


// // 🔓 Decrypt file
// function decryptFile(encryptedPath, decryptedPath, ivHex) {
//   const iv = Buffer.from(ivHex, 'hex');
//   const decipher = crypto.createDecipheriv(algorithm, key, iv);
//   const input = fs.createReadStream(encryptedPath);
//   const output = fs.createWriteStream(decryptedPath);

//   return new Promise((resolve, reject) => {
//     input
//       .pipe(decipher)
//       .pipe(output)
//       .on('finish', resolve)
//       .on('error', reject);
//   });
// }


// // 📨 Create new approval
// router.post('/', verifyToken, upload.array('files'), async (req, res) => {
//   const { title, assignee, details, dueDate } = req.body;
//   const userId = req.user.userId;
//   const client = await pool.connect();

//   try {
//     await client.query('BEGIN');
//     const approvalRes = await client.query(
//       `INSERT INTO approvals (title, assignee, details, due_date, assigned_by, created_at, status)
//        VALUES ($1, $2, $3, $4, $5, NOW(), 'New') RETURNING id`,
//       [title, assignee, details, dueDate, userId]
//     );

//     const approvalId = approvalRes.rows[0].id;

//     for (const file of req.files) {
//       const iv = crypto.randomBytes(ivLength);
//       const encryptedPath = `${file.path}.enc`;
//       await encryptFile(file.path, encryptedPath, iv);
// fs.unlinkSync(file.path); // only delete after encryption finishes

//       await client.query(
//         `INSERT INTO approval_files (approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv)
//          VALUES ($1, $2, $3, $4, NOW(), $5)`,
//         [approvalId, file.originalname, encryptedPath, userId, iv.toString('hex')]
//       );
//     }

//     await client.query('COMMIT');
//     res.status(201).json({ message: 'Approval created' });
//   } catch (err) {
//     await client.query('ROLLBACK');
//     console.error('❌ Error creating approval:', err);
//     res.status(500).json({ error: 'Failed to create approval' });
//   } finally {
//     client.release();
//   }
// });




// // 📥 Inbox route
// router.get('/inbox', verifyToken, async (req, res) => {
//   const userId = req.user.userId;
//   try {
//     const result = await pool.query(
//       `SELECT a.*,
//               ab.firstname AS assigned_by_firstname,
//               au.firstname AS assignee_firstname,
//               COALESCE(
//                 json_agg(
//                   DISTINCT jsonb_build_object(
//                     'id', f.id,
//                     'original_filename', f.original_filename,
//                     'uploaded_by_name', u.firstname,
//                     'uploaded_at', f.uploaded_at
//                   )
//                 ) FILTER (WHERE f.id IS NOT NULL), '[]'
//               ) AS files
//        FROM approvals a
//        JOIN users ab ON ab.id = a.assigned_by
//        JOIN users au ON au.id = a.assignee
//        LEFT JOIN approval_files f ON f.approval_id = a.id
//        LEFT JOIN users u ON u.id = f.uploaded_by
//        WHERE a.assignee = $1
//        GROUP BY a.id, ab.firstname, au.firstname`,
//       [userId]
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error('❌ Failed to fetch inbox approvals:', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// // 📤 Outbox route
// router.get('/outbox', verifyToken, async (req, res) => {
//   const userId = req.user.userId;
//   try {
//     const result = await pool.query(
//       `SELECT a.*,
//               ab.firstname AS assigned_by_firstname,
//               au.firstname AS assignee_firstname,
//               COALESCE(
//                 json_agg(
//                   DISTINCT jsonb_build_object(
//                     'id', f.id,
//                     'original_filename', f.original_filename,
//                     'uploaded_by_name', u.firstname,
//                     'uploaded_at', f.uploaded_at
//                   )
//                 ) FILTER (WHERE f.id IS NOT NULL), '[]'
//               ) AS files
//        FROM approvals a
//        JOIN users ab ON ab.id = a.assigned_by
//        JOIN users au ON au.id = a.assignee
//        LEFT JOIN approval_files f ON f.approval_id = a.id
//        LEFT JOIN users u ON u.id = f.uploaded_by
//        WHERE a.assigned_by = $1
//        GROUP BY a.id, ab.firstname, au.firstname`,
//       [userId]
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error('❌ Failed to fetch outbox approvals:', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });





// // // 📁 Secure download
// // router.get('/download/:id', verifyToken, async (req, res) => {
// //   const fileId = req.params.id;
// //   try {
// //     const fileRes = await pool.query(
// //       `SELECT original_filename, encrypted_path, iv FROM approval_files WHERE id = $1`,
// //       [fileId]
// //     );

// //     if (fileRes.rows.length === 0) {
// //       return res.status(404).json({ message: 'File not found' });
// //     }

// //     const { original_filename, encrypted_path, iv } = fileRes.rows[0];
// //     const tempDir = path.join(__dirname, '../temp');
// //     if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
// //     const decryptedPath = path.join(tempDir, original_filename);

// //     await decryptFile(encrypted_path, decryptedPath, iv);

// //     res.download(decryptedPath, original_filename, (err) => {
// //       fs.unlink(decryptedPath, () => {}); // cleanup
// //       if (err) console.error('Download error:', err);
// //     });
// //   } catch (err) {
// //     console.error('❌ File download failed:', err);
// //     res.status(500).json({ error: 'File download error' });
// //   }
// // });


// router.get('/download/:id', verifyToken, async (req, res) => {
//   const fileId = req.params.id;
//   try {
//     const fileRes = await pool.query(
//       `SELECT original_filename, encrypted_path, iv FROM approval_files WHERE id = $1`,
//       [fileId]
//     );

//     if (fileRes.rows.length === 0) {
//       return res.status(404).json({ message: 'File not found' });
//     }

//     const { original_filename, encrypted_path, iv } = fileRes.rows[0];

//     // ✅ Debug Logs
//     console.log('🔽 Download request');
//     console.log('Original Filename:', original_filename);
//     console.log('Encrypted Path:', encrypted_path);
//     console.log('IV (hex):', iv);
//     console.log('Key (from env):', key.toString('hex'));

//     const tempDir = path.join(__dirname, '../temp');
//     if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
//     const decryptedPath = path.join(tempDir, original_filename);

//     await decryptFile(encrypted_path, decryptedPath, iv);

//     res.download(decryptedPath, original_filename, (err) => {
//       fs.unlink(decryptedPath, () => {}); // cleanup
//       if (err) console.error('Download error:', err);
//     });
//   } catch (err) {
//     console.error('❌ File download failed:', err);
//     res.status(500).json({ error: 'File download error' });
//   }
// });




// router.patch('/:id/update-by-assignee', verifyToken, upload.array('files'), async (req, res) => {
//   const approvalId = req.params.id;
//   const userId = req.user.userId;
//   const { status, assignee_comments } = req.body;

//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     const approvalCheck = await client.query(
//       'SELECT * FROM approvals WHERE id = $1 AND assignee = $2',
//       [approvalId, userId]
//     );

//     if (approvalCheck.rows.length === 0) {
//       await client.query('ROLLBACK');
//       return res.status(403).json({ error: 'Unauthorized: Not the assignee' });
//     }

//     await client.query(
//       `UPDATE approvals
//        SET status = $1, assignee_comments = $2, modified_by = $3, modified_date = NOW()
//        WHERE id = $4`,
//       [status, assignee_comments, userId, approvalId]
//     );

//     for (const file of req.files) {
//       const iv = crypto.randomBytes(ivLength);
//       const encryptedPath = `${file.path}.enc`;
//       await encryptFile(file.path, encryptedPath, iv);
//       fs.unlinkSync(file.path);

//       await client.query(
//         `INSERT INTO approval_files (approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv)
//          VALUES ($1, $2, $3, $4, NOW(), $5)`,
//         [approvalId, file.originalname, encryptedPath, userId, iv.toString('hex')]
//       );
//     }

//     await client.query('COMMIT');
//     res.json({ message: 'Approval updated successfully' });
//   } catch (err) {
//     await client.query('ROLLBACK');
//     console.error('❌ Assignee update failed:', err);
//     res.status(500).json({ error: 'Update failed' });
//   } finally {
//     client.release();
//   }
// });






// module.exports = router;
