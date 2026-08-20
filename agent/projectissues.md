# Project Issues

Track open issues here. Mark each item as closed once the underlying problem is resolved.

## Open

- [open] Admin role enforcement is inconsistent. The login token payload in `server/routes/auth.js` does not include a role claim, but `authorizeRole('admin')` checks `req.user.role`, and `checkSubscription` also expects `req.user.role/userRole`. Admin-gated paths in `server/routes/subscription.js` will not behave correctly.
- [open] `client/src/services/api.js` registers request and response interceptors twice. That duplicates logging and can make request metadata and error handling noisy or inconsistent.
- [open] There are hardcoded secrets and credentials in repo files: the Gmail account/app password fallback in `server/routes/auth.js`, the default JWT secret in `server/routes/auth.js`, and the plaintext DB password in `server/config/dbconfig.json` and `server/config/sequelize-auto.json`.
- [open] The user and subscription list endpoints return full tables once the request is authenticated: `server/routes/users.js` and `server/routes/subscription.js`. That is broad access unless you intend every authenticated user to see all rows.

## Close When Resolved

- Change the status tag from `[open]` to `[closed]` when the issue is fixed.
- Add the fix reference or brief resolution note next to the item when closing it.
