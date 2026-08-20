// server/routes/simple_workflow_instances.js
const express = require('express');
const pool = require('../db');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const {
  coerceNumber,
  normalizeRouteinfo,
  buildRouteinfo,
  validatePatchPayload,
  applyPatchRules,
  normalizeMailUsers,
  resolveMailRecipients,
  resolveMailTokenUserId,
} = require('../rules/SimpleWorkflowRules');

// Basic transporter using env; prefers SMTP_* then EMAIL_* fallbacks
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpSecure = (process.env.SMTP_SECURE || '').toString().toLowerCase() === 'true';
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'udayhalankar@gmail.com';
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '';
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

async function fetchUserEmails(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const uniq = [...new Set(ids.map((n) => Number(n)).filter(Number.isFinite))];
  if (!uniq.length) return [];
  const placeholders = uniq.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await pool.query(
    `SELECT id, email, firstname, lastname
       FROM public.users
      WHERE id IN (${placeholders})`,
    uniq
  );
  return rows.map((r) => ({
    id: Number(r.id),
    email: r.email,
    name: [r.firstname, r.lastname].filter(Boolean).join(' ') || r.email || `User ${r.id}`,
  }));
}

function normalizeFields(stepCfg) {
  let fields = [];
  try {
    const raw =
      typeof stepCfg?.step_form_configuration === 'string'
        ? JSON.parse(stepCfg.step_form_configuration)
        : stepCfg?.step_form_configuration;
    if (raw && Array.isArray(raw.fields)) fields = raw.fields;
  } catch (_) {}
  return fields;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFieldValue(field, formData) {
  const val = formData[field.column] ?? formData[field.column?.trim?.() || ''];
  const t = String(field.input_type || '').toLowerCase();
  if (t === 'checkbox' && Array.isArray(field.option_list)) {
    return field.option_list
      .map((opt) => {
        const checked =
          Array.isArray(val) && val.map(String).includes(String(opt.value));
        const label = escapeHtml(opt.label || opt.value || '');
        return `<div class="check-row">${checked ? '✓' : '☐'} ${label}</div>`;
      })
      .join('');
  }
  if (t === 'radio' && Array.isArray(field.option_list)) {
    return field.option_list
      .map((opt) => {
        const checked = String(val) === String(opt.value);
        const label = escapeHtml(opt.label || opt.value || '');
        return `<div class="check-row">${checked ? '◉' : '○'} ${label}</div>`;
      })
      .join('');
  }
  if (val == null) return '';
  if (Array.isArray(val)) return val.map((v) => escapeHtml(v)).join(', ');
  return escapeHtml(val);
}

function buildFormHtml(formData = {}, title = 'Workflow Form', fieldsMeta = []) {
  const fieldsToRender =
    Array.isArray(fieldsMeta) && fieldsMeta.length
      ? fieldsMeta
      : Object.keys(formData || {}).map((k) => ({ label: k, column: k }));
  const fieldsHtml = fieldsToRender
    .map((f) => {
      const label = f.label || f.column || '';
      const value = renderFieldValue(f, formData);
      return `
      <div class="field">
        <label>${label}</label>
        <div class="value">${value || '&nbsp;'}</div>
      </div>`;
    })
    .join('\n');

  return `
  <html>
  <head>
    <style>
      @page { margin: 20px; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #f9fafb; padding: 0; margin: 0; }
      .wrap { background: #fff; border: 2px solid #1f2a60; border-radius: 10px; padding: 18px 18px 24px; }
      .header { display:flex; align-items:center; gap:12px; margin-bottom: 10px; }
      .logo { width: 110px; height: 32px; background: linear-gradient(90deg,#1990c6,#1dbb6f); border-radius: 4px; }
      h1 { margin: 0; font-size: 24px; color: #e25f1f; text-align:center; flex:1; font-weight: 700; }
      .divider { margin: 8px 0 18px; border-bottom: 2px solid #1f2a60; }
      .fields { display: flex; flex-direction: column; gap: 12px; }
      .field { border: none; border-radius: 0; padding: 6px 4px; background: transparent; }
      .field label { display:block; font-size: 11px; font-weight: 600; text-transform: none; letter-spacing: .1px; color: #3b4253; margin-bottom: 4px; }
      .field .value { font-size: 13px; color: #111827; min-height: 16px; line-height: 1.5; }
      .check-row { font-size: 13px; color: #111827; line-height: 1.3; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">
        <div class="logo"></div>
        <h1>${title}</h1>
      </div>
      <div class="divider"></div>
      <div class="fields">
        ${fieldsHtml || '<div class="field"><label>Info</label><div class="value">No form data.</div></div>'}
      </div>
    </div>
  </body>
  </html>
  `;
}

async function renderPdfBuffer(formData = {}, title = 'Workflow Form', stepCfg = null) {
  const fieldsMeta = normalizeFields(stepCfg);
  const html = buildFormHtml(formData, title, fieldsMeta);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ printBackground: true, format: 'A4' });
    await browser.close();
    return pdf;
  } catch (err) {
    await browser.close();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Enhanced printable HTML & PDF (closer to on-screen form; searchable)
// ---------------------------------------------------------------------------
function renderFieldValueV2(field, formData) {
  const val = formData[field.column] ?? formData[field.column?.trim?.() || ''];
  const t = String(field.input_type || '').toLowerCase();
  if (t === 'checkbox' && Array.isArray(field.option_list)) {
    return field.option_list
      .map((opt) => {
        const checked =
          Array.isArray(val) && val.map(String).includes(String(opt.value));
        const label = escapeHtml(opt.label || opt.value || '');
        return `<div class="choice">
          <span class="check-square ${checked ? 'checked' : ''}"></span>
          <span class="choice-label">${label}</span>
        </div>`;
      })
      .join('');
  }
  if (t === 'radio' && Array.isArray(field.option_list)) {
    return field.option_list
      .map((opt) => {
        const checked = String(val) === String(opt.value);
        const label = escapeHtml(opt.label || opt.value || '');
        return `<div class="choice">
          <span class="radio-dot ${checked ? 'filled' : ''}"></span>
          <span class="choice-label">${label}</span>
        </div>`;
      })
      .join('');
  }
  if (val == null) return '';
  if (Array.isArray(val)) return val.map((v) => escapeHtml(v)).join(', ');
  return escapeHtml(val);
}

function buildFormHtmlV2(
  formData = {},
  title = 'Workflow Form',
  fieldsMeta = [],
  layoutDef = null,
  warning = ''
) {
  const fieldsToRender =
    Array.isArray(fieldsMeta) && fieldsMeta.length
      ? fieldsMeta
      : Object.keys(formData || {}).map((k) => ({ label: k, column: k }));

  // Friendly labels for known system fields
  fieldsToRender.forEach((f) => {
    const col = String(f.column || '').toLowerCase();
    if (col === '_attachments' && !f.label) f.label = 'Attachments';
  });

  const fieldMetaMap = new Map(
    fieldsToRender.map((f) => [String(f.column || '').toLowerCase(), f])
  );

  const renderSpan = (w, cols = 48) => {
    const span = Math.round((Number(w) || cols) / cols * 12);
    return Math.max(1, Math.min(12, span || 12));
  };

  const renderHeader = (section) => {
    if (!section || !Array.isArray(section.items)) return '';
    const cols = Number(section.grid?.cols) || 48;
    const items = [...section.items].sort((a, b) =>
      a.y === b.y ? a.x - b.x : a.y - b.y
    );
    return `
      <div class="grid header-grid">
        ${items
          .map((it) => {
            const span = renderSpan(it.w, cols);
            const colStart = Math.max(1, Math.round((Number(it.x) || 0) / cols * 12) + 1);
            const rowStart = Math.max(1, Math.round((Number(it.y) || 0) + 1));
            const rowSpan = Math.max(1, Math.round(Number(it.h) || 1));
            const style = `grid-column: ${colStart} / span ${span}; grid-row: ${rowStart} / span ${rowSpan};`;
            if (it.type === 'image' && it.props?.src) {
              const mh = it.props.maxHeight ? `max-height:${it.props.maxHeight}px;` : '';
              return `<div class="field" style="${style}"><div class="box box-flex"><img src="${it.props.src}" alt="${it.props.alt || ''}" style="height:auto;width:auto;${mh}"></div></div>`;
            }
            if (it.type === 'line') {
              const thickness = it.props?.thickness || 2;
              const color = it.props?.color || '#233b8c';
              return `<div class="field" style="${style}"><div class="line" style="height:${thickness}px;background:${color};"></div></div>`;
            }
            if (it.type === 'text') {
              const color = it.props?.color || '#2b2b2b';
              const fs = it.props?.fontSize || 16;
              const ta = it.props?.textAlign || 'left';
              const html = it.props?.html || it.props?.text || '';
              return `<div class="field" style="${style}"><div class="box box-flex" style="color:${color};font-size:${fs}px;text-align:${ta};">${html}</div></div>`;
            }
            return '';
          })
          .join('')}
      </div>
    `;
  };

  const renderFieldsFromLayout = (section) => {
    if (!section || !Array.isArray(section.items)) return '';
    const cols = Number(section.grid?.cols) || 48;
    const items = [...section.items]
      .filter((it) => String(it.type || '').toLowerCase() === 'field')
      .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
    return items
      .map((it) => {
        const span = renderSpan(it.w, cols);
        const colStart = Math.max(1, Math.round((Number(it.x) || 0) / cols * 12) + 1);
        const rowStart = Math.max(1, Math.round((Number(it.y) || 0) + 1));
        const rowSpan = Math.max(1, Math.round(Number(it.h) || 1));
        const style = `grid-column: ${colStart} / span ${span}; grid-row: ${rowStart} / span ${rowSpan};`;
        const meta =
          fieldMetaMap.get(String(it.field || '').toLowerCase()) || { column: it.field, label: it.field };
        const label = meta.label || meta.column || '';
        const value = renderFieldValueV2(meta, formData);
        return `<div class="field" style="${style}">
          <div class="label">${label}</div>
          <div class="box">${value || '&nbsp;'}</div>
        </div>`;
      })
      .join('');
  };

  const hasLayout = layoutDef && layoutDef.kind === 'canvas_v1';
  const headerSection = hasLayout
    ? layoutDef.sections?.find((s) => String(s.id) === 'header')
    : null;
  const mainSection = hasLayout
    ? layoutDef.sections?.find((s) => String(s.id) === 'main')
    : null;
  const footerSection = hasLayout
    ? layoutDef.sections?.find((s) => String(s.id) === 'footer')
    : null;

  const fallbackFieldsHtml = fieldsToRender
    .map((f) => {
      const label = f.label || f.column || '';
      const value = renderFieldValueV2(f, formData);
      const span =
        Number(f.span || f.grid_span || f.colSpan || f.span_cols || f.col_span) || 12;
      // default to two columns (span 6) when layout is missing
      const defaultSpan = hasLayout ? span : 6;
      const safeSpan = Math.max(1, Math.min(12, defaultSpan));
      return `
      <div class="field" style="grid-column: span ${safeSpan};">
        <div class="label">${label}</div>
        <div class="box">${value || '&nbsp;'}</div>
      </div>`;
    })
    .join('\n');

  const mainHtml = hasLayout ? renderFieldsFromLayout(mainSection) : fallbackFieldsHtml;
  const footerHtml = hasLayout ? renderFieldsFromLayout(footerSection) : '';
  const headerHtml = renderHeader(headerSection);

  const containerStyle = layoutDef?.container_style || {};
  const borderColor = containerStyle.color || '#d7dce6';
  const borderWidth = Number(containerStyle.width || 1);
  const borderRadius = Number(containerStyle.radius || 8);

  const fieldsHtml =
    mainHtml ||
    '<div class="field" style="grid-column: span 12;"><div class="label">Info</div><div class="box">No form data.</div></div>';

  return `
  <html>
  <head>
    <style>
      @page { margin: 10mm; }
      :root {
        --text: #2b2b2b;
        --muted: #6b7280;
        --border: #c5cbd5;
        --bg: #f7f8fb;
        --card: #fff;
        --brand: #e46f2e;
        --accent: #233b8c;
        --input-bg: #fafbff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px 0 32px;
        font-family: 'Roboto','Helvetica Neue',Arial,sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      .container {
        width: min(780px, 96vw);
        margin: 0 auto;
        background: var(--card);
        border: ${borderWidth}px solid ${borderColor};
        border-radius: ${borderRadius}px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.04);
        padding: 24px 24px 32px;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 6px;
      }
      .logo {
        width: 38px;
        height: 38px;
        border-radius: 8px;
        background: linear-gradient(135deg, #1f8ee4, #1dbb6f);
        flex-shrink: 0;
      }
      .title {
        font-size: 24px;
        font-weight: 700;
        color: var(--brand);
        letter-spacing: 0.2px;
        line-height: 1.1;
      }
      .subtitle {
        font-size: 12px;
        color: var(--muted);
        margin-top: 2px;
      }
      .warning {
        padding: 8px 10px;
        border-radius: 6px;
        background: #fff6f6;
        color: #b91c1c;
        font-size: 12px;
        border: 1px solid #fecdd3;
        margin-bottom: 10px;
      }
      .divider {
        height: 2px;
        background: var(--accent);
        margin: 8px 0 18px;
        border-radius: 2px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        column-gap: 16px;
        row-gap: 16px;
      }
      .grid.fallback {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .field {
        display: flex;
        flex-direction: column;
      }
      .label {
        font-size: 13px;
        font-weight: 600;
        color: #4b5563;
        margin-bottom: 4px;
        line-height: 1.2;
      }
      .box {
        min-height: 42px;
        border: none;
        border-radius: 0;
        padding: 6px 4px;
        background: transparent;
        color: var(--text);
        font-size: 14px;
        line-height: 1.3;
        display: block;
      }
      .choice {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-right: 12px;
        margin-bottom: 6px;
        font-size: 14px;
      }
      .choice:last-child { margin-bottom: 0; }
      .radio-dot, .check-square {
        width: 16px; height: 16px;
        border: 1px solid #94a3b8;
        display: inline-block;
        position: relative;
        flex-shrink: 0;
      }
      .radio-dot { border-radius: 50%; }
      .radio-dot.filled::after {
        content: '';
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: #1f5fbf;
      }
      .check-square { border-radius: 3px; }
      .check-square.checked::after {
        content: '✓';
        position: absolute;
        top: -1px; left: 2px;
        color: #1f5fbf;
        font-size: 13px;
        font-weight: 700;
      }
      .choice-label { color: var(--text); }
      .box-flex { display: flex; align-items: center; justify-content: flex-start; min-height: 42px; }
      .line { width: 100%; border-radius: 2px; }
      .header-grid { margin-bottom: 12px; }
      @media (max-width: 800px) {
        .grid { grid-template-columns: repeat(1, 1fr); }
        .field { grid-column: span 1 !important; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div>
        <div class="header">
          <div class="logo"></div>
          <div>
            <div class="title">${title}</div>
            <div class="subtitle">Auto-generated from submitted form</div>
          </div>
        </div>
        <div class="divider"></div>
        ${warning ? `<div class="warning">${warning}</div>` : ''}
      </div>
      ${headerHtml}
      <div class="grid ${hasLayout ? '' : 'fallback'}">
        ${fieldsHtml}
      </div>
      ${footerHtml ? `<div class="grid" style="margin-top:16px;">${footerHtml}</div>` : ''}
    </div>
  </body>
  </html>
  `;
}

async function renderPdfBuffer(formData = {}, title = 'Workflow Form', stepCfg = null, instanceId = null, authHeader = null) {
  const fieldsMeta = normalizeFields(stepCfg);
  let layoutDef = null;
  try {
    const rawLayout =
      stepCfg?.layout_def ||
      stepCfg?.layout_definition ||
      stepCfg?.layout ||
      stepCfg?.canvas_layout ||
      stepCfg?.form_layout;
    if (typeof rawLayout === 'string' && rawLayout.trim()) {
      layoutDef = JSON.parse(rawLayout);
    } else if (rawLayout && typeof rawLayout === 'object') {
      layoutDef = rawLayout;
    }
  } catch (_) {
    layoutDef = null;
  }
  // Fallback: try latest formview layout for this workflow + step (or step_no/name)
  if (!layoutDef) {
    const wid = stepCfg?.workflow_id || stepCfg?.workflow_map_id || null;
    const sno = stepCfg?.step_no ?? null;
    const sname = stepCfg?.step_name || null;
    if (wid) {
      const lookups = [];
    if (sno != null) lookups.push({ where: 'workflow_map_id = $1 AND step_no = $2', args: [wid, sno] });
      if (sname) lookups.push({ where: 'workflow_map_id = $1 AND step_name = $2', args: [wid, sname] });
      for (const q of lookups) {
        try {
          const { rows } = await pool.query(
            `SELECT layout_def
               FROM public.simple_workflowbuilder_formviews
              WHERE ${q.where}
              ORDER BY id DESC
              LIMIT 1`,
            q.args
          );
          const raw = rows?.[0]?.layout_def;
          if (raw) {
            layoutDef = typeof raw === 'string' ? JSON.parse(raw) : raw;
            break;
          }
        } catch (e) {
          console.warn('[pdf] layout lookup failed', e.message);
        }
      }
    }
  }

  let warning = '';
  if (!authHeader) warning = 'No auth header provided; rendering inline layout.';

  const html = buildFormHtmlV2(formData, title, fieldsMeta, layoutDef, warning);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1800 });
    // keep navigation bounded so we don't hang the API call
    page.setDefaultNavigationTimeout(15000);
    page.setDefaultTimeout(15000);
    const baseUrl = process.env.APP_BASE_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    let bearer = null;
    if (authHeader) {
      const hdrs = { Authorization: authHeader, 'x-last-activity': Date.now().toString() };
      await page.setExtraHTTPHeaders(hdrs);
      bearer = /^Bearer\s+(.+)/i.test(authHeader) ? authHeader.replace(/^Bearer\s+/i, '') : null;
      if (bearer) {
        await page.evaluateOnNewDocument((token) => {
          try {
            localStorage.setItem('token', token);
            localStorage.setItem('lastActivity', Date.now().toString());
            localStorage.setItem('subscriptions', JSON.stringify([]));
          } catch (_) {}
          try {
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('lastActivity', Date.now().toString());
          } catch (_) {}
          try {
            document.cookie = `token=${token}; path=/; SameSite=Lax`;
          } catch (_) {}
        }, bearer);
        try {
          const u = new URL(baseUrl);
          await page.setCookie({
            name: 'token',
            value: bearer,
            domain: u.hostname,
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
          });
        } catch (_) {}
      }
    }
    // Try print page with auth; fallback to inline if any auth or navigation issue
      if (instanceId && authHeader) {
        const tokenParam = bearer ? `?token=${encodeURIComponent(bearer)}` : '';
        const printUrl = `${baseUrl}/print/workflow/${instanceId}${tokenParam}`;
        let wentToPrint = false;
        try {
          await page.goto(printUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          wentToPrint = true;
        } catch (_) {
        wentToPrint = false;
      }
      let needsFallback = false;
      const currentUrl = page.url() || '';
      if (!wentToPrint || currentUrl.toLowerCase().includes('login')) {
        needsFallback = true;
      } else {
        // Detect if the loaded page is actually the login shell (SPA route may keep URL)
        try {
          const loginDetected = await page.evaluate(() => {
            const text = (document.body.innerText || '').toLowerCase();
            const hasPwd = !!document.querySelector('input[type="password"]');
            const hasEmail = !!document.querySelector('input[type="email"]');
            return hasPwd || (text.includes('password') && text.includes('log in')) || (hasPwd && hasEmail);
          });
          if (loginDetected) {
            needsFallback = true;
          }
        } catch (_) {
          needsFallback = true;
        }
      }
      if (needsFallback && bearer) {
        // second attempt: inject token after first load then reload print page
        try {
          await page.evaluate((token) => {
            try {
              localStorage.setItem('token', token);
              localStorage.setItem('lastActivity', Date.now().toString());
              localStorage.setItem('subscriptions', JSON.stringify([]));
            } catch (_) {}
            try {
              sessionStorage.setItem('token', token);
              sessionStorage.setItem('lastActivity', Date.now().toString());
            } catch (_) {}
            try {
              document.cookie = `token=${token}; path=/; SameSite=Lax`;
            } catch (_) {}
          }, bearer);
          await page.goto(printUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          const cur = page.url() || '';
          if (!cur.toLowerCase().includes('login')) {
            needsFallback = false;
          }
        } catch (_) {
          needsFallback = true;
        }
      }
      if (needsFallback) {
        warning = warning || 'Print page auth failed; using inline renderer.';
        await page.setViewport({ width: 1200, height: 1800 });
        const htmlWithWarn = buildFormHtmlV2(formData, title, fieldsMeta, layoutDef, warning);
        await page.setContent(htmlWithWarn, { waitUntil: 'domcontentloaded' });
      }

      // Wait for the print page to finish rendering to avoid capturing the loading spinner
      try {
        await page.waitForFunction(() => window.__PRINT_READY__ === true, {
          timeout: 15000,
        });
      } catch (_) {
        // ignore: fall back to whatever is loaded
      }
      // Optional: short settle period
      try {
        await page.waitForTimeout(300);
      } catch (_) {}

      const pdf = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      await browser.close();
      return pdf;
    } else {
      await page.setViewport({ width: 1200, height: 1800 });
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      await browser.close();
      return pdf;
    }
  } catch (err) {
    await browser.close();
    throw err;
  }
}

// Render PNG image of the form (inline render, no auth/navigation)
async function renderImageBuffer(formData = {}, title = 'Workflow Form', stepCfg = null) {
  const fieldsMeta = normalizeFields(stepCfg);
  let layoutDef = null;
  try {
    const rawLayout =
      stepCfg?.layout_def ||
      stepCfg?.layout_definition ||
      stepCfg?.layout ||
      stepCfg?.canvas_layout ||
      stepCfg?.form_layout;
    if (typeof rawLayout === 'string' && rawLayout.trim()) {
      layoutDef = JSON.parse(rawLayout);
    } else if (rawLayout && typeof rawLayout === 'object') {
      layoutDef = rawLayout;
    }
  } catch (_) {
    layoutDef = null;
  }
  if (!layoutDef) {
    layoutDef = await resolveLayoutDef(stepCfg);
  }

  const html = buildFormHtmlV2(formData, title, fieldsMeta, layoutDef, warning);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(15000);
    page.setDefaultTimeout(15000);
    await page.setViewport({ width: 1280, height: 2000 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const buffer = await page.screenshot({ fullPage: true, type: 'png' });
    await browser.close();
    return {
      buffer,
      filename: `workflow_${stepCfg?.step_name || 'form'}.png`,
      mime: 'image/png',
    };
  } catch (err) {
    await browser.close();
    throw err;
  }
}


// Helper to resolve layout_def for a given step config (uses routeinfo layout_def first, then formviews by step_no/name)
async function resolveLayoutDef(stepCfg) {
  let layoutDef = null;
  try {
    const rawLayout =
      stepCfg?.layout_def ||
      stepCfg?.layout_definition ||
      stepCfg?.layout ||
      stepCfg?.canvas_layout ||
      stepCfg?.form_layout;
    if (typeof rawLayout === 'string' && rawLayout.trim()) {
      layoutDef = JSON.parse(rawLayout);
    } else if (rawLayout && typeof rawLayout === 'object') {
      layoutDef = rawLayout;
    }
  } catch (_) {
    layoutDef = null;
  }
  if (layoutDef) return layoutDef;

  const wid = stepCfg?.workflow_id || stepCfg?.workflow_map_id || null;
  const sno = stepCfg?.step_no ?? null;
  const sname = stepCfg?.step_name || null;
  if (!wid) return null;

  const lookups = [];
  if (sno != null) lookups.push({ where: 'workflow_map_id = $1 AND step_no = $2', args: [wid, sno] });
  if (sname) lookups.push({ where: 'workflow_map_id = $1 AND step_name = $2', args: [wid, sname] });

  for (const q of lookups) {
    try {
      const { rows } = await pool.query(
        `SELECT layout_def
           FROM public.simple_workflowbuilder_formviews
          WHERE ${q.where}
          ORDER BY id DESC
          LIMIT 1`,
        q.args
      );
      const raw = rows?.[0]?.layout_def;
      if (raw) {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    } catch (e) {
      console.warn('[pdf] layout lookup failed', e.message);
    }
  }
  return null;
}

async function sendWorkflowMail({ stepCfg, formData, instance, instanceId, action, authHeader }) {
  if (!stepCfg) return { sent: false, reason: 'no stepCfg' };
  const resolvedRecipients = resolveMailRecipients({ action, stepCfg, instance });
  if (resolvedRecipients?.error) {
    return { sent: false, reason: resolvedRecipients.error };
  }
  const users = resolvedRecipients?.users || null;
  if (!Array.isArray(users) || users.length === 0) {
    return { sent: false, reason: 'no recipients' };
  }

  const mailContent =
    typeof stepCfg.mail_content === 'string'
      ? (() => {
          try {
            return JSON.parse(stepCfg.mail_content);
          } catch {
            return {};
          }
        })()
      : stepCfg.mail_content || {};

  const {
    body = '',
    dear_recipient = false,
    include_report = false, // placeholder
    click_here_enabled = false,
    click_here_text = 'Click here',
    click_here_url = '',
    attach_pdf = false,
    // default to true so emails are boxed unless explicitly disabled
    wrap_content = true,
  } = mailContent;

  const recipients = await fetchUserEmails(users);
  if (!recipients.length) return;
  if (!recipients.some((r) => r.email)) {
    return { sent: false, reason: 'recipients missing email' };
  }

  const subject =
    (mailContent.notification_subject ||
      mailContent.mail_notification_subject ||
      stepCfg.mail_notification_subject ||
      '')
      .toString()
      .trim() ||
    `Workflow Update (Instance ${instanceId || ''})`;
  const htmlPieces = [];

  if (dear_recipient && recipients.length === 1) {
    const r = recipients[0];
    htmlPieces.push(`<p style="margin:0 0 12px 0;">Dear ${r.name || 'recipient'},</p>`);
  }

  // Build primary content (body + optional click-here) and wrap it if enabled
  const hasMarker = /data-mail-wrap=/i.test(body || '');
  const shouldWrap = wrap_content || hasMarker;
  const contentParts = [];
  if (body) contentParts.push(body);
  if (click_here_enabled && click_here_url) {
    const txt = click_here_text || 'Click here';
    contentParts.push(
      `<p style="margin:12px 0 0 0; text-align:left;"><a href="${click_here_url}" target="_blank" rel="noopener noreferrer">${txt}</a></p>`
    );
  }
  if (contentParts.length) {
    const inner = contentParts.join('\n');
    const wrappedBody = shouldWrap
      ? `<div data-mail-wrap="1" style="border:1px solid #d1d5db;border-radius:5px;width:100%;max-width:640px;margin:0;padding:12px;text-align:left;">${inner}</div>`
      : inner;
    htmlPieces.push(wrappedBody);
  }

  if (!htmlPieces.length) {
    htmlPieces.push('<p>Workflow notification.</p>');
  }

    const attachments = [];
    if (attach_pdf) {
      try {
        let effectiveAuth = authHeader || null;
        const tokenUserId = resolveMailTokenUserId({ action, stepCfg, instance });
        if (Number.isFinite(tokenUserId)) {
          const secret = process.env.JWT_SECRET;
          try {
            if (secret) {
              const svcToken = jwt.sign({ id: tokenUserId }, secret, { expiresIn: '10m' });
              effectiveAuth = `Bearer ${svcToken}`;
            }
          } catch (_) {}
        }

        const buf = await renderPdfBuffer(formData, subject, stepCfg, instanceId, effectiveAuth);
        attachments.push({
          filename: `workflow_${instanceId || 'form'}.pdf`,
          content: buf,
          contentType: 'application/pdf',
        });
      } catch (e) {
        console.warn('[mail] failed to build PDF', e.message);
      }
    }

  // include_report placeholder hook
  if (include_report) {
    htmlPieces.push('<p>[Report placeholder]</p>');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@example.com',
    to: recipients.map((r) => r.email).filter(Boolean),
    subject,
    html: htmlPieces.join('\n'),
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[mail] sent to', mailOptions.to, info?.messageId || '');
    return { sent: true, to: mailOptions.to };
  } catch (err) {
    console.error('[mail] send failed', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = function simpleWorkflowInstancesRouter() {
  const router = express.Router();

  // Simple logger
  router.use((req, _res, next) => {
    const t0 = Date.now();
    req.___t0 = t0;
    console.log(`[swfi] ${req.method} ${req.originalUrl}`);
    next();
  });

  router.get('/__ping', (req, res) =>
    res.json({ ok: true, user: req.user || null })
  );

  /* ---------------------------------------------------------------------- */
  /* LIST inbox/outbox for current user                                    */
  /* GET /api/simple_workflow_instances?box=inbox|outbox                   */
  /* ---------------------------------------------------------------------- */
  router.get('/', async (req, res) => {
    try {
      const userId = req.user?.id || null;
      const tenantId = req.user?.tenant_id || null;
      const box = String(req.query.box || 'inbox').toLowerCase();

      let where = '1=1';
      const args = [];
      if (tenantId) {
        args.push(tenantId);
        where += ` AND i.tenant_id = $${args.length}`;
      }
      if (userId) {
        if (box === 'outbox') {
          args.push(userId);
          where += ` AND i.initiator = $${args.length}`;
        } else {
          args.push(userId);
          where += ` AND i.step_performer = $${args.length}`;
        }
      }

      const { rows } = await pool.query(
        `SELECT i.*,
                TRIM(
                  COALESCE(
                    NULLIF(CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, '')), ' '),
                    ''
                  )
                ) AS step_performer_name,
                u.email AS step_performer_email
           FROM public.simple_workflow_instances i
           LEFT JOIN public.simple_workflowbuilder swb ON swb.id = i.workflow_id
           LEFT JOIN public.users u ON u.id = i.step_performer
          WHERE ${where}
          ORDER BY i.date_modified DESC NULLS LAST, i.id DESC`,
        args
      );

      res.json(rows);
    } catch (e) {
      console.error('swfi:list', e);
      res.status(500).json({ error: 'Failed to list assignments', details: e.message });
    }
  });

  /* ---------------------------------------------------------------------- */
  /* GET one instance by id                                                */
  /* GET /api/simple_workflow_instances/:id                                */
  /* ---------------------------------------------------------------------- */
  router.get('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid id' });
      }

      const userId = req.user?.id || null;
      const tenantId = req.user?.tenant_id || null;
      const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];

      const isAdmin = roles.some(
        (r) => String(r).toLowerCase() === 'admin'
      );

      const args = [id];
      let where = 'i.id = $1';

      if (tenantId) {
        args.push(tenantId);
        where += ` AND i.tenant_id = $${args.length}`;
      }

      if (!isAdmin && userId) {
        args.push(userId, userId);
        where += ` AND (i.initiator = $${args.length - 1} OR i.step_performer = $${args.length})`;
      }

      const { rows } = await pool.query(
        `
        SELECT
          i.*,
          swb.workflow_map_name,
          swb.workflow_table_name,
          TRIM(
            COALESCE(
              NULLIF(CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, '')), ' '),
              ''
            )
          ) AS step_performer_name,
          u.email AS step_performer_email
        FROM public.simple_workflow_instances i
        LEFT JOIN public.simple_workflowbuilder swb ON swb.id = i.workflow_id
        LEFT JOIN public.users u ON u.id = i.step_performer
        WHERE ${where}
        LIMIT 1
        `,
        args
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      const row = rows[0];
      const rawRouteinfo = Array.isArray(row.routeinfo)
        ? row.routeinfo
        : (() => {
            try {
              return JSON.parse(row.routeinfo || '[]');
            } catch (_) {
              return [];
            }
          })();
      const { normalized: routeinfo, changed } = normalizeRouteinfo(rawRouteinfo, row.initiator);
      if (changed) {
        try {
          await pool.query(
            `UPDATE public.simple_workflow_instances
                SET routeinfo = $1
              WHERE id = $2`,
            [JSON.stringify(routeinfo), row.id]
          );
        } catch (e) {
          console.warn('[swfi] routeinfo normalize failed', e.message);
        }
        row.routeinfo = routeinfo;
      }

      return res.json(row);
    } catch (e) {
      console.error('swfi:getOne', e);
      return res
        .status(500)
        .json({ error: 'Failed to fetch instance', details: e.message });
    }
  });

  /* ---------------------------------------------------------------------- */
  /* CREATE a new instance (INITIATE -> STEP 1)                             */
  /* POST /api/simple_workflow_instances                                   */
  /* ---------------------------------------------------------------------- */
 
  // CREATE a new instance (INITIATE -> STEP 1)
// POST /api/simple_workflow_instances
// CREATE a new instance (INITIATE -> STEP 1)
// POST /api/simple_workflow_instances
router.post('/', async (req, res) => {
  try {
    await pool.query('SET LOCAL statement_timeout = 5000');
    await pool.query('SELECT 1');

    const userId   = Number(req.user?.id)        || null;
    const tenantId = Number(req.user?.tenant_id) || null;
    const p        = req.body || {};

    const wid = Number(p.workflow_id);
    if (!Number.isFinite(wid)) {
      return res.status(400).json({ error: 'workflow_id is required' });
    }

    // 1) Header: workflow name
    const { rows: wfRows } = await pool.query(
      `SELECT workflow_map_name
         FROM public.simple_workflowbuilder
        WHERE id = $1`,
      [wid]
    );
    const wfHeader = wfRows[0] || {};

    // 2) Load all steps
    const { rows: allSteps } = await pool.query(
      `SELECT *
         FROM public.simple_workflowbuilder_steps
        WHERE workflow_id = $1
        ORDER BY step_no ASC`,
      [wid]
    );

    // 2b) Load latest formviews per step (for layout_def snapshot)
    const formviewMap = new Map();
    try {
      const { rows: fvRows } = await pool.query(
        `SELECT step_no, view_key, layout_def
           FROM public.simple_workflowbuilder_formviews
          WHERE workflow_map_id = $1
          ORDER BY id DESC`,
        [wid]
      );
      for (const fv of fvRows) {
        const stepNo = Number(fv.step_no);
        if (!Number.isFinite(stepNo) || formviewMap.has(stepNo)) continue; // keep latest only
        let layout = fv.layout_def;
        if (typeof layout === 'string') {
          try {
            layout = JSON.parse(layout);
          } catch (_) {
            // keep raw string
          }
        }
        formviewMap.set(stepNo, { view_key: fv.view_key, layout_def: layout });
      }
    } catch (e) {
      console.warn('[swfi] formviews load failed', e.message);
    }

    if (!allSteps.length) {
      return res
        .status(400)
        .json({ error: 'No steps defined for this workflow' });
    }

    // Choose initiate step: prefer step_no=0, then step_type=create, then name INITIATE, else first
    const findInitStep = () => {
      const byZero = allSteps.find((s) => Number(s.step_no) === 0);
      if (byZero) return byZero;
      const byType = allSteps.find(
        (s) => String(s.step_type || '').toLowerCase() === 'create'
      );
      if (byType) return byType;
      const byName = allSteps.find(
        (s) => String(s.step_name || '').toUpperCase() === 'INITIATE'
      );
      if (byName) return byName;
      return allSteps[0];
    };

    const step1 = findInitStep();
    if (!step1) {
      return res
        .status(400)
        .json({ error: 'Initiate step not defined for this workflow' });
    }

    const currentInitStepNo = Number(step1.step_no) || 0;
    const initiatorId       = userId;

    // 3) Routeinfo snapshot
    const routeinfo = buildRouteinfo(allSteps, formviewMap, initiatorId);

    // Determine the first actionable step (post-init) and its performer
    const candidateNextNo = Number.isFinite(Number(step1.next_step_after_approve))
      ? Number(step1.next_step_after_approve)
      : currentInitStepNo + 1;

    const stepAfterInit =
      allSteps.find((s) => Number(s.step_no) === candidateNextNo) ||
      allSteps.find((s) => Number(s.step_no) === 1) ||
      allSteps.find((s) => Number(s.step_no) > currentInitStepNo) ||
      null;

    const liveStep = stepAfterInit || step1;

    const rawLivePerformer =
      liveStep.step_performer != null ? Number(liveStep.step_performer) : null;
    const livePerformerId =
      Number.isFinite(rawLivePerformer) && rawLivePerformer > 0
        ? rawLivePerformer
        : initiatorId;

    const liveStepNo = Number(liveStep.step_no) || 0;
    const liveStepName = liveStep.step_name || step1.step_name || 'STEP';
    const dueDays = Number(liveStep.step_due_in_days) || 1;

    // 4) workflow_name for display
    const workflowName =
      p.workflow_name ||
      p.workflow_map_name ||
      wfHeader.workflow_map_name ||
      null;

    
    
    
    
    
    // const step1Performer =
    // step1.step_performer != null ? Number(step1.step_performer) : null;

    // const currentStepNo = Number(step1.step_no) || 1;

    // const rawNextApprove = step1.next_step_after_approve;
    // const rawNextReject  = step1.next_step_after_reject;

    // const nextStepAfterApprove =
    //   rawNextApprove !== null &&
    //   rawNextApprove !== undefined &&
    //   rawNextApprove !== ''
    //     ? Number(rawNextApprove)
    //     : null;

    // const nextStepAfterReject =
    //   rawNextReject !== null &&
    //   rawNextReject !== undefined &&
    //   rawNextReject !== ''
    //     ? Number(rawNextReject)
    //     : null;

    // // ---------------------------------------------------------------------
    // // 🔹 Build initial audit_trail entry with initiator & performer
    // // ---------------------------------------------------------------------
    // const initiatorId       = userId;
    // const performerId       = step1Performer || initiatorId || null;
        // Normalise performer:
    //  - >0  = fixed user id
    //  - 0 or null = "Initiator"
    const currentStepNo = Number(step1.step_no) || 0;

    // ---------------------------------------------------------------------
    //  Initiator & Performer
    // ---------------------------------------------------------------------
    const performerId       = livePerformerId ?? initiatorId ?? null;

    // ---------------------------------------------------------------------
    // 🔹 Next step pointers from Step 1
    // ---------------------------------------------------------------------
    const rawNextApprove = liveStep.next_step_after_approve;
    const rawNextReject  = liveStep.next_step_after_reject;

    const nextStepAfterApprove =
      rawNextApprove !== null &&
      rawNextApprove !== undefined &&
      rawNextApprove !== ''
        ? Number(rawNextApprove)
        : liveStepNo + 1;

    const nextStepAfterReject =
      rawNextReject !== null &&
      rawNextReject !== undefined &&
      rawNextReject !== ''
        ? Number(rawNextReject)
        : null;





    const reviewRequestorId = null; // only set on "review" actions later

    const baseFormValues = p.form_values || {};

    const auditEntry = {
      at: new Date().toISOString(),
      by: initiatorId,                         // who initiated
      action: 'initiate',
      from_step_no: 0,
      to_step_no: currentStepNo,
      step_name: step1.step_name || 'STEP',
      wf_status: 'Initiated',
      workflow_map_name: workflowName,

      // top-level system fields for easy reading
      initiator: initiatorId,
      performer: performerId,
      review_requestor: reviewRequestorId,

      // snapshot of form values + system fields
      form_values: {
        ...baseFormValues,
        wf_status: 'Initiated',  
        initiator: initiatorId,
        performer: performerId,
        review_requestor: reviewRequestorId,
      },
    };

    // store as array so later steps can just push new entries
    const auditTrail = [auditEntry];

    const q = `
      INSERT INTO public.simple_workflow_instances (
        workflow_id,
        date_created, date_modified,
        created_by, modified_by,
        step_name, wf_status, step_performer,
        review_requestor, reviewer, initiator,
        audit_trail, step_comments, tenant_id,
        step_assigned_date, step_due_date,
        step_no, workflow_name, assigned_by, routeinfo,
        next_step_after_reject, next_step_after_approve
      ) VALUES (
        $1,
        NOW(), NOW(),
        $2, $2,
        $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        NOW(), NOW() + ($12 || ' days')::interval,
        $13, $14, $15, $16,
        $17, $18
      )
      RETURNING *;
    `;

    const params = [
      wid,                        // $1  workflow_id
      userId,                     // $2  created_by / modified_by
      liveStepName,               // $3  step_name
      'Initiated',                // $4  wf_status (instance-level)
      performerId,                // $5  step_performer  (current owner)
      userId,                     // $6  review_requestor (kept as-is; can be null if you prefer)
      null,                       // $7  reviewer
      initiatorId,                // $8  initiator
      JSON.stringify(auditTrail), // $9  audit_trail (jsonb)
      p.step_comments ?? null,    // $10 step_comments
      tenantId,                   // $11 tenant_id
      String(dueDays),            // $12 for interval
      liveStepNo,                 // $13 step_no
      workflowName,               // $14 workflow_name
      userId,                     // $15 assigned_by
      JSON.stringify(routeinfo),  // $16 routeinfo (jsonb)
      nextStepAfterReject,        // $17 next_step_after_reject
      nextStepAfterApprove,       // $18 next_step_after_approve
    ];

    const insertStartMs = Date.now();
    const { rows } = await pool.query(q, params);
    console.log('[swfi] create db insert ms', Date.now() - insertStartMs);

    // mail for initiate, if configured
    let mailStatus = { sent: false };
    const mailStartMs = Date.now();
    try {
      mailStatus = await sendWorkflowMail({
        stepCfg: step1,
        formData: baseFormValues,
        instance: rows[0],
        instanceId: rows[0]?.id,
        action: 'initiate',
        authHeader: req.headers?.authorization || null,
      });
      console.log('[swfi] create mail ms', Date.now() - mailStartMs);
    } catch (err) {
      console.error('[mail:initiate] failed', err.message);
      console.log('[swfi] create mail ms', Date.now() - mailStartMs);
      mailStatus = { sent: false, reason: err.message };
    }

    const mailContent = step1?.mail_content || {};
    return res
      .status(201)
      .json({ ...rows[0], mail_status: mailStatus, mail_content: mailContent });
  } catch (e) {
    console.error('swfi:create error:', e);
    return res
      .status(500)
      .json({ error: 'Failed to create instance' });
  }
});



  /* ---------------------------------------------------------------------- */
  /* PATCH instance (advance, comment, reassign, etc.)                      */
  /* PATCH /api/simple_workflow_instances/:id                               */
  /* ---------------------------------------------------------------------- */
  router.patch('/:id', async (req, res) => {
    try {
      await pool.query('SET LOCAL statement_timeout = 5000');
      await pool.query('SELECT 1');

      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'Invalid id' });
      }

      let body = req.body || {};
      const payloadError = validatePatchPayload(body);
      if (payloadError) {
        return res.status(400).json({ error: payloadError });
      }
      const action = body.action;
      if (body.action !== undefined) delete body.action;

      // Load routeinfo + initiator so we can derive step defaults from saved workflow config
      const { rows: instMetaRows } = await pool.query(
        `SELECT initiator, routeinfo, step_no
           FROM public.simple_workflow_instances
          WHERE id = $1
          LIMIT 1`,
        [id]
      );
      const initiatorFromDb =
        instMetaRows && instMetaRows[0] && instMetaRows[0].initiator != null
          ? Number(instMetaRows[0].initiator)
          : null;
      const currentStepNoFromDb =
        instMetaRows && instMetaRows[0] && instMetaRows[0].step_no != null
          ? Number(instMetaRows[0].step_no)
          : null;
      const rawRouteinfo = Array.isArray(instMetaRows?.[0]?.routeinfo)
        ? instMetaRows[0].routeinfo
        : (() => {
            try {
              return JSON.parse(instMetaRows?.[0]?.routeinfo || '[]');
            } catch (_) {
              return [];
            }
          })();
      const { normalized: routeinfo, changed: routeChanged } =
        normalizeRouteinfo(rawRouteinfo, initiatorFromDb);
      if (routeChanged) {
        try {
          await pool.query(
            `UPDATE public.simple_workflow_instances
                SET routeinfo = $1
              WHERE id = $2`,
            [JSON.stringify(routeinfo), id]
          );
        } catch (e) {
          console.warn('[swfi] routeinfo normalize failed', e.message);
        }
      }

      const ruleResult = applyPatchRules({
        body,
        routeinfo,
        currentStepNo: currentStepNoFromDb,
        initiatorId: initiatorFromDb,
        action,
        userId: req.user?.id ?? null,
      });
      if (ruleResult.error) {
        return res.status(400).json({ error: ruleResult.error });
      }
      body = ruleResult.body;

      const whitelist = new Map([
        ['step_name', null],
        ['wf_status', null],
        ['step_performer', null],
        ['review_requestor', null],
        ['reviewer', null],
        ['audit_trail', 'jsonb'],
        ['step_comments', null],
        ['step_no', null],
        ['next_step_after_approve', null],
        ['next_step_after_reject', null],
      ]);


      const keys = Object.keys(body).filter((k) => whitelist.has(k));
      if (keys.length === 0) {
        return res.status(400).json({ error: 'Nothing to update' });
      }

      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const vals = keys.map((k) =>
        whitelist.get(k) === 'jsonb'
          ? JSON.stringify(body[k])
          : body[k]
      );
      vals.push(req.user?.id || null); // modified_by
      vals.push(id);                   // id

      const { rows } = await pool.query(
        `UPDATE public.simple_workflow_instances
            SET ${sets.join(', ')},
                modified_by = $${vals.length - 1},
                date_modified = NOW()
          WHERE id = $${vals.length}
          RETURNING *`,
        vals
      );
      const updated = rows[0];

      // fire-and-forget mail notification for this step
      let mailStatus = { sent: false };
      try {
        console.log(
          "[mail:patch] routeinfo type",
          typeof updated?.routeinfo,
          "step_no",
          updated?.step_no
        );
        console.log(
          "[mail:patch] routeinfo isArray",
          Array.isArray(updated?.routeinfo),
          "keys",
          updated?.routeinfo && !Array.isArray(updated?.routeinfo)
            ? Object.keys(updated.routeinfo)
            : null
        );
        const route = Array.isArray(updated?.routeinfo)
          ? updated.routeinfo
          : [];
        const rawStepNo = updated?.step_no;
        const stepNo =
          rawStepNo === 0 || rawStepNo === "0"
            ? 0
            : Number(rawStepNo);
        const stepCfg =
          (stepNo != null &&
            route.find((r) => Number(r.step_no) === stepNo)) ||
          null;

        let formData = {};
        if (updated?.audit_trail) {
          try {
            const at = Array.isArray(updated.audit_trail)
              ? updated.audit_trail
              : JSON.parse(updated.audit_trail);
            const last = Array.isArray(at) && at.length ? at[at.length - 1] : null;
            if (last && last.data && typeof last.data === 'object') {
              formData = last.data;
            }
          } catch (_) {}
        }

        if (stepCfg) {
          mailStatus = await sendWorkflowMail({
            stepCfg,
            formData,
            instance: updated,
            instanceId: updated?.id,
            action: action || updated?.wf_status || 'update',
            authHeader: req.headers?.authorization || null,
          });
        } else {
          mailStatus = { sent: false, reason: 'step config missing' };
        }
      } catch (err) {
        console.error('[mail:patch] failed', err.message);
        mailStatus = { sent: false, reason: err.message };
      }

      const currentStepCfg =
        Array.isArray(updated?.routeinfo) && Number(updated?.step_no) != null
          ? updated.routeinfo.find(
              (r) => Number(r.step_no) === Number(updated.step_no)
            )
          : null;

      res.json({
        ...updated,
        mail_status: mailStatus,
        mail_content: currentStepCfg?.mail_content || {},
      });
    } catch (e) {
      console.error('swfi:patch', e);
      res.status(500).json({ error: 'Failed to update instance' });
    }
  });

  /* ---------------------------------------------------------------------- */
  /* PRINT instance HTML (read-only form)                                  */
  /* GET /api/simple_workflow_instances/:id/print                          */
  /* ---------------------------------------------------------------------- */
  router.get('/:id/print', async (req, res) => {
    try {
      await pool.query('SET LOCAL statement_timeout = 5000');
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).send('Invalid id');
      }

      const { rows } = await pool.query(
        `SELECT *
           FROM public.simple_workflow_instances
          WHERE id = $1
          LIMIT 1`,
        [id]
      );
      if (!rows || !rows[0]) {
        return res.status(404).send('Instance not found');
      }
      const inst = rows[0];

      // latest form values from audit_trail
      let formData = {};
      try {
        const at = Array.isArray(inst.audit_trail)
          ? inst.audit_trail
          : JSON.parse(inst.audit_trail || '[]');
        const last = Array.isArray(at) && at.length ? at[at.length - 1] : null;
        if (last) {
          if (last.form_values && typeof last.form_values === 'object') {
            formData = last.form_values;
          } else if (last.data && typeof last.data === 'object') {
            formData = last.data;
          }
        }
      } catch (_) {}

      const route = Array.isArray(inst.routeinfo) ? inst.routeinfo : [];
      const stepNo = Number(inst.step_no) || null;
      const stepCfg =
        (stepNo != null && route.find((r) => Number(r.step_no) === stepNo)) || null;

      const fieldsMeta = normalizeFields(stepCfg);
      const layoutDef = await resolveLayoutDef(stepCfg);
      const title = `Workflow Update (Instance ${id})`;
      const authHeader = req.headers?.authorization || null;
      let warning = '';
      if (!authHeader) warning = 'Using service token for print; inline render if auth fails.';

      const html = buildFormHtmlV2(formData, title, fieldsMeta, layoutDef, warning);

      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (e) {
      console.error('swfi:print', e);
      return res.status(500).send('Failed to render print view');
    }
  });

  return router;
};
