// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// Optional in-memory session store (not persistent across restarts)
const sessionStore = {};

async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const userId = decoded.userId || decoded.id;
    const now = Date.now();

    // Check if last activity header is provided from frontend
    const lastActivityHeader = parseInt(req.headers['x-last-activity'], 10);
    const lastSeen = !isNaN(lastActivityHeader)
      ? lastActivityHeader
      : sessionStore[userId]?.lastActivity || now;

    const inactiveDuration = now - lastSeen;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

    if (inactiveDuration > INACTIVITY_LIMIT) {
      return res.status(401).json({ message: 'Session expired due to inactivity' });
    }

    // Store activity timestamp server-side
    if (userId) {
      sessionStore[userId] = { lastActivity: now };
    }

    req.user = {
      ...decoded,
      userId,
    };

    // Attach PostgreSQL session variable
    if (userId) {
      try {
        await pool.query(`SET session "app.current_user_id" = '${userId}'`);
      } catch (dbErr) {
        console.warn('⚠️ Could not set session user ID:', dbErr.message);
      }
    }

    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

async function logAudit({ userId, action, tableName = null, recordId = null, details = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (table_name, action, modified_by, details)
       VALUES ($1, $2, $3, $4)`,
      [tableName, action, userId, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    console.warn('⚠️ Failed to log audit event:', err.message);
  }
}

async function logLoginSuccess(userId) {
  await logAudit({ userId, action: 'LOGIN_SUCCESS' });
}

async function logLoginFailure(emailOrUsername) {
  await logAudit({
    userId: null,
    action: 'LOGIN_FAILED',
    details: { attempted_user: emailOrUsername }
  });
}

async function logLogout(userId) {
  await logAudit({ userId, action: 'LOGOUT' });
}

async function logPasswordChange(userId) {
  await logAudit({ userId, action: 'PASSWORD_CHANGE' });
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  authorizeRole,
  logLoginSuccess,
  logLoginFailure,
  logLogout,
  logPasswordChange,
};



// // server/middleware/authMiddleware.js
// const jwt = require('jsonwebtoken');
// const pool = require('../db');
// require('dotenv').config();

// const JWT_SECRET = process.env.JWT_SECRET;

// async function verifyToken(req, res, next) {
//   const authHeader = req.headers['authorization'];
//   if (!authHeader) return res.status(401).json({ message: 'No token provided' });

//   const token = authHeader.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'Token missing' });

//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);

//     // 🕒 Check client-side inactivity
//     const lastActivity = parseInt(req.headers['x-last-activity'] || "0", 10);
//     if (!isNaN(lastActivity)) {
//       const now = Date.now();
//       const lastActivity = sessionStore[userId]?.lastActivity || now;
//       const inactiveFor = now - lastActivity;

//       if (now - lastActivity > 15 * 60 * 1000) {
//         return res.status(401).json({ message: 'Session expired due to inactivity' });
//       }
//     }

//     req.user = {
//       ...decoded,
//       userId: decoded.userId || decoded.id,
//     };

//     if (req.user.userId) {
//       try {
//         await pool.query(`SET session "app.current_user_id" = '${req.user.userId}'`);
//       } catch (dbErr) {
//         console.warn('⚠️ Could not set session user ID:', dbErr.message);
//       }
//     }

//     next();
//   } catch (err) {
//     console.error("❌ Token verification failed:", err.message);
//     return res.status(403).json({ message: 'Invalid or expired token' });
//   }
// }

// async function logAudit({ userId, action, tableName = null, recordId = null, details = null }) {
//   try {
//     await pool.query(
//       `INSERT INTO audit_log (table_name, action, modified_by, details)
//        VALUES ($1, $2, $3, $4)`,
//       [tableName, action, userId, details ? JSON.stringify(details) : null]
//     );
//   } catch (err) {
//     console.warn('⚠️ Failed to log audit event:', err.message);
//   }
// }

// async function logLoginSuccess(userId) {
//   await logAudit({ userId, action: 'LOGIN_SUCCESS' });
// }

// async function logLoginFailure(emailOrUsername) {
//   await logAudit({
//     userId: null,
//     action: 'LOGIN_FAILED',
//     details: { attempted_user: emailOrUsername }
//   });
// }

// async function logLogout(userId) {
//   await logAudit({ userId, action: 'LOGOUT' });
// }

// async function logPasswordChange(userId) {
//   await logAudit({ userId, action: 'PASSWORD_CHANGE' });
// }

// function authorizeRole(role) {
//   return (req, res, next) => {
//     if (!req.user || req.user.role !== role) {
//       return res.status(403).json({ message: 'Forbidden: insufficient role' });
//     }
//     next();
//   };
// }

// module.exports = {
//   verifyToken,
//   authorizeRole,
//   logLoginSuccess,
//   logLoginFailure,
//   logLogout,
//   logPasswordChange,
// };





// // server/middleware/authMiddleware.js
// const jwt = require('jsonwebtoken');
// const pool = require('../db');
// require('dotenv').config();

// const JWT_SECRET = process.env.JWT_SECRET;

// // ✅ Utility to insert into audit_log
// async function logAudit({ userId, action, tableName = null, recordId = null, details = null }) {
//   try {
//     await pool.query(
//       `INSERT INTO audit_log (table_name, action, modified_by, details)
//        VALUES ($1, $2, $3, $4)`,
//       [tableName, action, userId, details ? JSON.stringify(details) : null]
//     );
//   } catch (err) {
//     console.warn('⚠️ Failed to log audit event:', err.message);
//   }
// }

// // ✅ JWT middleware to verify token and attach user
// async function verifyToken(req, res, next) {
//   const authHeader = req.headers['authorization'];
//   if (!authHeader) return res.status(401).json({ message: 'No token provided' });

//   const token = authHeader.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'Token missing' });

//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);


//     //START - Added by UH
//     // Add inactivity check
//       if (decoded.lastActivity && Date.now() - decoded.lastActivity > 15 * 60 * 1000) {
//         return res.status(401).json({ message: 'Session expired due to inactivity' });
//       }
//     //END - Added by UH 

//     // ✅ Normalize userId for consistency
//     req.user = {
//       ...decoded,
//       userId: decoded.userId || decoded.id,
//     };

//     console.log("🔐 Decoded token:", decoded);
//     console.log("🧾 req.user.userId:", req.user.userId);

//     // ✅ Set PostgreSQL session variable if userId exists
//     if (req.user.userId) {
//       try {
//         // await pool.query(`SET session "app.current_user_id" = $1`, [req.user.userId]);
//         await pool.query(`SET session "app.current_user_id" = '${req.user.userId}'`);

//         console.log("✅ PostgreSQL session user set:", req.user.userId);
//       } catch (dbErr) {
//         console.warn('⚠️ Could not set session user ID:', dbErr.message);
//       }
//     }

//     next();
//   } catch (err) {
//     console.error("❌ Token verification failed:", err.message);
//     return res.status(403).json({ message: 'Invalid or expired token' });
//   }
// }

// // ✅ Optional utilities
// async function logLoginSuccess(userId) {
//   await logAudit({ userId, action: 'LOGIN_SUCCESS' });
// }

// async function logLoginFailure(emailOrUsername) {
//   await logAudit({
//     userId: null,
//     action: 'LOGIN_FAILED',
//     details: { attempted_user: emailOrUsername }
//   });
// }

// async function logLogout(userId) {
//   await logAudit({ userId, action: 'LOGOUT' });
// }

// async function logPasswordChange(userId) {
//   await logAudit({ userId, action: 'PASSWORD_CHANGE' });
// }

// function authorizeRole(role) {
//   return (req, res, next) => {
//     if (!req.user || req.user.role !== role) {
//       return res.status(403).json({ message: 'Forbidden: insufficient role' });
//     }
//     next();
//   };
// }

// module.exports = {
//   verifyToken,
//   authorizeRole,
//   logLoginSuccess,
//   logLoginFailure,
//   logLogout,
//   logPasswordChange,
// };















// // // server/middleware/authMiddleware.js
// // const jwt = require('jsonwebtoken');
// // const pool = require('../db');
// // require('dotenv').config();

// // const JWT_SECRET = process.env.JWT_SECRET;

// // async function verifyToken(req, res, next) {
// //   const authHeader = req.headers['authorization'];
// //   if (!authHeader) return res.status(401).json({ message: 'No token' });

// //   const token = authHeader.split(' ')[1];
// //   if (!token) return res.status(401).json({ message: 'Token missing' });

// //   try {
// //     const decoded = jwt.verify(token, JWT_SECRET);
// //     req.user = decoded;

// //     // 🛡️ Only set session if user.id exists (after login)
// //     if (req.user.id) {
// //       try {
// //         await pool.query(`SET session "app.current_user_id" = $1`, [req.user.id]);
// //       } catch (dbErr) {
// //         console.warn('⚠️ Failed to set session variable for audit tracking:', dbErr.message);
// //         // Don't block request if audit setup fails
// //       }
// //     }

// //     next();
// //   } catch (err) {
// //     return res.status(403).json({ message: 'Invalid token' });
// //   }
// // }

// // function authorizeRole(role) {
// //   return (req, res, next) => {
// //     if (!req.user || req.user.role !== role) {
// //       return res.status(403).json({ message: 'Forbidden: insufficient role' });
// //     }
// //     next();
// //   };
// // }

// // module.exports = { verifyToken, authorizeRole };















// // // server/middleware/authMiddleware.js

// // const jwt = require('jsonwebtoken');
// // require('dotenv').config(); // ✅ Load env vars



// // const JWT_SECRET = process.env.JWT_SECRET; // ✅ Use secret from .env

// // function verifyToken(req, res, next) {
// //   const authHeader = req.headers['authorization'];
// //   if (!authHeader) return res.status(401).json({ message: 'No token' });

// //   const token = authHeader.split(' ')[1];
// //   if (!token) return res.status(401).json({ message: 'Token missing' });

// //   jwt.verify(token, JWT_SECRET, (err, user) => {
// //     if (err) return res.status(403).json({ message: 'Invalid token' });
// //     req.user = user; // sets req.user.userId, req.user.email, req.user.role
// //     next();
// //   });
// // }

// // function authorizeRole(role) {
// //   return (req, res, next) => {
// //     if (!req.user || req.user.role !== role) {
// //       return res.status(403).json({ message: 'Forbidden: insufficient role' });
// //     }
// //     next();
// //   };
// // }

// // module.exports = { verifyToken, authorizeRole };
