// routes/auth.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  JWT_SECRET = 'YOUR_SECRET_KEY'
} = process.env;

const client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

router.use(express.json());

/** 1️⃣ REGISTER + SEND ACTIVATION EMAIL **/
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
    const activationLink = `${GOOGLE_REDIRECT_URI}/activate?token=${activationToken}`;

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'udayhalankar@gmail.com',
        pass: 'YOUR_GMAIL_APP_PASSWORD'
      }
    });

    await transporter.sendMail({
      from: '"Your App" <youremail@gmail.com>',
      to: newUser.email,
      subject: 'Activate Your Account',
      html: `<p>Hi ${firstname},</p>
             <p>Please <a href="${activationLink}">click here</a> to activate your account.</p>`
    });

    res.status(201).json({ message: 'Registration successful. Please check your email.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

/** 2️⃣ ACTIVATE ACCOUNT **/
router.get('/activate', async (req, res) => {
  const token = req.query.token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await pool.query('UPDATE users SET is_active = true WHERE id = $1', [decoded.userId]);
    return res.redirect(`${GOOGLE_REDIRECT_URI}/login`);
  } catch (err) {
    console.error('Activation error:', err);
    return res.status(400).send('Invalid or expired activation link.');
  }
});

/** 3️⃣ EMAIL/PASSWORD LOGIN **/
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ message: 'Activate your account first.' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, firstname: user.firstname, lastname: user.lastname },
      JWT_SECRET,
      //session expires in 1 hour
      { expiresIn: '1h' }
    );
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

/** 4️⃣ GOOGLE SIGN‑IN **/
router.post('/google', async (req, res) => {
  const { idToken, code } = req.body;

  if (!idToken && !code) {
    return res.status(400).json({ message: 'Missing idToken or authorization code' });
  }

  try {
    let ticket;

    if (idToken) {
      ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
    } else {
      const { tokens } = await client.getToken({ code, redirect_uri: GOOGLE_REDIRECT_URI });
      ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });
    }

    const payload = ticket.getPayload();
    const email = payload.email;
    const firstname = payload.given_name;
    const lastname = payload.family_name;
    const picture   = payload.picture; // ✅ Google profile photo

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
      {
        userId: dbUser.id,
        email: dbUser.email,
        // firstname: dbUser.firstname,
        // lastname: dbUser.lastname,
        firstname,
        lastname,
        picture,
      },
      JWT_SECRET,
       //session expires in 1 hour
      { expiresIn: '1h' }
    );

    res.json({ token }); // ✅ this is the fix you were missing
  } catch (err) {
    console.error('❌ Google login error:', err);
    res.status(401).json({ message: 'Google authentication failed', details: err.message });
  }
});

module.exports = router;
