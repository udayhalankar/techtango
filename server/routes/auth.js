const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');   // ← import here

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

// 1️⃣ REGISTER + SEND ACTIVATION EMAIL
router.post('/register', async (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  // console.log('Register request body:', req.body);

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (firstname, lastname, email, password_hash, is_active)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, email`,
      [firstname, lastname, email, hashedPassword]
    );

    const newUser = result.rows[0];

    // Generate activation token
    const activationToken = jwt.sign(
      { userId: newUser.id },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const activationLink = `http://localhost:5000/api/auth/activate?token=${activationToken}`;

    // Send Email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'udayhalankar@gmail.com',        // ✅ Use your Gmail
        pass: 'cxte vspd jslh iaea'           // ✅ App password, not your Gmail password!
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
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// 2️⃣ ACTIVATE ACCOUNT
router.get('/activate', async (req, res) => {
  const token = req.query.token;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    await pool.query(
      'UPDATE users SET is_active = true WHERE id = $1',
      [userId]
    );

    res.redirect('http://localhost:3000/login'); // frontend login page
  } catch (err) {
    console.error(err);
    res.status(400).send('Invalid or expired activation link.');
  }
});

// 3️⃣ LOGIN (with activation check)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) return res.status(401).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.is_active) {
      return res.status(403).json({ message: 'Please activate your account first.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// ➊ Endpoint that frontend will call with Google ID token
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  try {
    // ➋ Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const firstname = payload.given_name;
    const lastname = payload.family_name;

    // ➌ Find or create user in your DB
    let user = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (user.rows.length === 0) {
      const hash = ''; // no password for Google accounts
      const insert = await pool.query(
        `INSERT INTO users (firstname, lastname, email, password_hash, is_active, role)
         VALUES ($1,$2,$3,$4,true,'user') RETURNING *`,
        [firstname, lastname, email, hash]
      );
      user = insert;
    }
    const dbUser = user.rows[0];

    // ➍ Issue your own JWT
    const token = jwt.sign(
      { userId: dbUser.id, email: dbUser.email, role: dbUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({ message: 'Google authentication failed' });
  }
});


module.exports = router;
