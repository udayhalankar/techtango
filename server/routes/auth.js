require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const { logAudit } = require('../utils/auditLogger');
const { verifyToken } = require('../middleware/authMiddleware'); // add this import
const { appUrl } = require('../utils/appBaseUrl');
const { sendAlertEmail } = require('../utils/alertMailer');


const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  JWT_SECRET = 'YOUR_SECRET_KEY',
} = process.env;

const client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

router.use(express.json());

function buildMailTransporter() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'udayhalankar@gmail.com';
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '';
  const mailFrom = process.env.MAIL_FROM || `"Your App" <${smtpUser}>`;

  return {
    smtpUser,
    mailFrom,
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    }),
  };
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getClientBaseUrl(explicitBaseUrl) {
  const candidate = normalizeBaseUrl(explicitBaseUrl);
  if (/^https?:\/\/[^/]+/i.test(candidate)) return candidate;
  return appUrl('');
}

function buildClientUrl(baseUrl, path) {
  const cleanBase = getClientBaseUrl(baseUrl);
  const cleanPath = String(path || '');
  if (!cleanPath) return cleanBase;
  return `${cleanBase}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

function validatePassword(value) {
  return typeof value === 'string' && value.length >= 8;
}


// Who am I
router.get('/me', verifyToken, async (req, res) => {
try {
    // normalize the fields your UI uses
    const userId   = req.user?.id || req.user?.userId || null;
    const tenantId = req.user?.tenant_id ?? null;

    // (optional) fetch name/display fields from DB
    // const { rows } = await pool.query(
    //   `SELECT id, firstname, lastname, email FROM users WHERE id=$1`,
    //   [userId]
    // );
    // const u = rows[0];

    return res.json({
      user_id: userId,
      user_name: req.user?.firstname
        ? `${req.user.firstname} ${req.user.lastname || ''}`.trim()
        : req.user?.email || 'User',
      tenant_id: tenantId,
      roles: req.user?.roles || []
    });
  } catch (e) {
    console.error('/auth/me failed:', e.message);
    res.status(500).json({ message: 'Failed to load user context' });
  }
}
);

/** REGISTER **/
router.post('/register', async (req, res) => {
  const { firstname, lastname, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (firstname, lastname, email, password_hash, is_active)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, email`,
      [firstname, lastname, email, hashedPassword]
    );
    const newUser = result.rows[0];

    const activationToken = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '1d' });
    const activationLink = appUrl(`/activate?token=${activationToken}`);

    const { transporter, mailFrom, smtpUser } = buildMailTransporter();

    await transporter.sendMail({
      from: mailFrom,
      to: newUser.email,
      subject: 'Activate Your Account',
      html: `<p>Hi ${firstname},</p>
             <p>Please <a href="${activationLink}">click here</a> to activate your account.</p>`
    });

    res.status(201).json({ message: 'Registration successful. Please check your email.' });
  } catch (err) {
    console.error('Register error:', err);
    sendAlertEmail({
      subject: 'Tymebound registration/email failure',
      text: `Registration or activation email failed for ${email || 'unknown email'}: ${err.message}`,
      html: `
        <h3>Tymebound registration/email failure</h3>
        <p><strong>Email:</strong> ${email || 'unknown'}</p>
        <p><strong>Name:</strong> ${[firstname, lastname].filter(Boolean).join(' ') || 'unknown'}</p>
        <p><strong>Error:</strong> ${err.message}</p>
      `,
    }).catch((alertErr) => {
      console.warn('⚠️ Registration alert email failed:', alertErr.message);
    });
    res.status(500).json({ message: 'Registration failed' });
  }
});

/** FORGOT PASSWORD **/
router.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const appBaseUrl = req.body?.appBaseUrl;
  const genericMessage = 'If an account with that email exists, a reset link has been sent.';

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, firstname, lastname, is_active FROM users WHERE LOWER(email) = $1',
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.json({ message: genericMessage });
    }

    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const resetLink = buildClientUrl(appBaseUrl, `/reset-password?token=${encodeURIComponent(resetToken)}`);

    try {
      const { transporter, mailFrom } = buildMailTransporter();
      await transporter.sendMail({
        from: mailFrom,
        to: user.email,
        subject: 'Reset Your Password',
        html: `<p>Hi ${user.firstname || user.lastname || 'there'},</p>
               <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
               <p>This link expires in 1 hour.</p>`,
      });
    } catch (mailErr) {
      console.error('Forgot password email error:', mailErr.message);
      if (String(process.env.NODE_ENV || 'development').toLowerCase() === 'production') {
        return res.status(500).json({ message: 'Could not send reset email' });
      }
    }

    await logAudit({
      userId: user.id,
      action: 'password_reset_requested',
      tableName: 'users',
      recordId: user.id,
      details: { email: user.email },
    });

    const payload = { message: genericMessage };
    if (String(process.env.NODE_ENV || 'development').toLowerCase() !== 'production') {
      payload.resetUrl = resetLink;
    }
    return res.json(payload);
  } catch (err) {
    console.error('Forgot password error:', err.message);
    return res.status(500).json({ message: 'Could not process password reset' });
  }
});

/** RESET PASSWORD **/
router.post('/reset-password', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword || '');

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (!validatePassword(newPassword)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'password_reset' || !decoded.userId) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const result = await pool.query('SELECT id, email FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);

    await logAudit({
      userId: user.id,
      action: 'password_reset',
      tableName: 'users',
      recordId: user.id,
      details: { email: user.email },
    });

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    return res.status(400).json({ message: 'Invalid or expired reset link' });
  }
});

/** ACTIVATE **/
router.get('/activate', async (req, res) => {
  try {
    const decoded = jwt.verify(req.query.token, JWT_SECRET);
    await pool.query('UPDATE users SET is_active = true WHERE id = $1', [decoded.userId]);
    res.redirect(`${GOOGLE_REDIRECT_URI}/login`);
  } catch (err) {
    console.error('Activation error:', err);
    res.status(400).send('Invalid or expired activation link.');
  }
});

/** LOGIN **/
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      await logAudit({
        userId: null,
        action: 'login_failed',
        tableName: 'users',
        details: { email, reason: 'User not found' },
      });
      sendAlertEmail({
        subject: 'Tymebound failed login',
        text: `Failed login attempt for ${email || 'unknown'}: user not found`,
        html: `
          <h3>Tymebound failed login</h3>
          <p><strong>Email:</strong> ${email || 'unknown'}</p>
          <p><strong>Reason:</strong> User not found</p>
        `,
      }).catch((alertErr) => {
        console.warn('⚠️ Login alert email failed:', alertErr.message);
      });
      return res.status(401).json({ message: 'User not found' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      await logAudit({
        userId: null,
        action: 'login_failed',
        tableName: 'users',
        details: { email, reason: 'Invalid password' },
      });
      sendAlertEmail({
        subject: 'Tymebound failed login',
        text: `Failed login attempt for ${email || 'unknown'}: invalid password`,
        html: `
          <h3>Tymebound failed login</h3>
          <p><strong>Email:</strong> ${email || 'unknown'}</p>
          <p><strong>Reason:</strong> Invalid password</p>
        `,
      }).catch((alertErr) => {
        console.warn('⚠️ Login alert email failed:', alertErr.message);
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Activate your account first.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, firstname: user.firstname, lastname: user.lastname
        ,
    lastActivity: Date.now()  // custom field - added by UH 26-7-25 4:40pm
       },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    await logAudit({
      userId: user.id,
      action: 'login',
      tableName: 'users',
      recordId: user.id,
      details: { email: user.email },
    });

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Login failed' });
  }
});

/** LOGOUT **/
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(400).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    await logAudit({
      userId: decoded.id,
      action: 'logout',
      tableName: 'users',
      recordId: decoded.id,
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(400).json({ message: 'Logout failed' });
  }
});

/** LAST LOGIN **/
router.get('/last-login', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User context missing' });
    }

    const result = await pool.query(
      `SELECT action, modified_at
         FROM audit_log
        WHERE modified_by = $1
          AND action IN ('login', 'google_login')
        ORDER BY modified_at DESC, id DESC
        OFFSET 1
        LIMIT 1`,
      [userId]
    );

    const row = result.rows[0] || null;
    return res.json({
      lastLogin: row ? row.modified_at : null,
      action: row ? row.action : null,
    });
  } catch (err) {
    console.error('Last login lookup error:', err.message);
    res.status(500).json({ message: 'Failed to load last login' });
  }
});

/** PASSWORD CHANGE **/
router.post('/change-password', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(oldPassword, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Old password incorrect' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);

    await logAudit({
      userId: user.id,
      action: 'password_change',
      tableName: 'users',
      recordId: user.id,
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ message: 'Could not change password' });
  }
});

/** GOOGLE LOGIN **/
router.post('/google', async (req, res) => {
  const { idToken, code } = req.body;

  try {
    let ticket;

    if (idToken) {
      ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    } else {
      const { tokens } = await client.getToken({ code, redirect_uri: GOOGLE_REDIRECT_URI });
      ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
    }

    const payload = ticket.getPayload();
    const { email, given_name: firstname, family_name: lastname, picture } = payload;

    let dbRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (dbRes.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO users (firstname, lastname, email, password_hash, is_active)
         VALUES ($1, $2, $3, '', true)
         RETURNING *`,
        [firstname, lastname, email]
      );
      dbRes = insert;
    }

    const dbUser = dbRes.rows[0];

    const token = jwt.sign(
      { id: dbUser.id, email, firstname, lastname, picture,
    lastActivity: Date.now()  // custom field - added by UH 26-7-25 4:40pm
     },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    await logAudit({
      userId: dbUser.id,
      action: 'google_login',
      tableName: 'users',
      recordId: dbUser.id,
      details: { email },
    });

    res.json({ token });
  } catch (err) {
    console.error('❌ Google login error:', err.message);
    res.status(401).json({ message: 'Google authentication failed' });
  }
});

module.exports = router;

