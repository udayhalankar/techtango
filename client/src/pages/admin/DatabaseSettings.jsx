import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, CardHeader, TextField, Button, Stack, FormControlLabel,
  Checkbox, Snackbar, Alert, Divider, IconButton, InputAdornment, Typography, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, Refresh, Save, Lan, Security } from '@mui/icons-material';
import axios from 'axios';

const API_BASE = '/api/admin/db-settings';

export default function DatabaseSettings() {
  const [form, setForm] = useState({
    DB_HOST: '',
    DB_PORT: '',
    DB_NAME: '',
    DB_USER: '',
    DB_PASSWORD: '',
    DB_SSL: false,
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'info' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const ax = useCallback(() => {
    const instance = axios.create();
    instance.interceptors.request.use((config) => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, [token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ax().get(API_BASE);
      setForm((f) => ({
        ...f,
        DB_HOST: data.DB_HOST ?? '',
        DB_PORT: String(data.DB_PORT ?? ''),
        DB_NAME: data.DB_NAME ?? '',
        DB_USER: data.DB_USER ?? '',
        DB_SSL: !!data.DB_SSL,
      }));
      setSnack({ open: true, msg: 'Loaded current settings', sev: 'success' });
    } catch (e) {
      setSnack({ open: true, msg: e?.response?.data?.message || e.message, sev: 'error' });
    } finally {
      setLoading(false);
    }
  }, [ax]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const testConnection = async () => {
    setTesting(true);
    try {
      const payload = { ...form, DB_PORT: Number(form.DB_PORT) || 5432 };
      const { data } = await ax().post(`${API_BASE}/test`, payload);
      setSnack({ open: true, msg: data.message || 'Connection OK', sev: 'success' });
    } catch (e) {
      setSnack({ open: true, msg: e?.response?.data?.message || e.message, sev: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const saveApply = async () => {
    setSaving(true);
    try {
      const payload = { ...form, DB_PORT: Number(form.DB_PORT) || 5432 };
      const { data } = await ax().post(API_BASE, payload);
      setSnack({ open: true, msg: data.message || 'Saved & applied', sev: 'success' });
    } catch (e) {
      setSnack({ open: true, msg: e?.response?.data?.message || e.message, sev: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const valid =
    form.DB_HOST &&
    (Number(form.DB_PORT) > 0) &&
    form.DB_NAME &&
    form.DB_USER;

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Card elevation={2}>
        <CardHeader
          title="Database Settings"
          subheader="Configure your PostgreSQL connection used by the server"
          avatar={<Lan />}
          action={
            <Button
              startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
              onClick={loadSettings}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />
        <Divider />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Host"
              name="DB_HOST"
              value={form.DB_HOST}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="Port"
              name="DB_PORT"
              value={form.DB_PORT}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Database"
              name="DB_NAME"
              value={form.DB_NAME}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="User"
              name="DB_USER"
              value={form.DB_USER}
              onChange={handleChange}
              fullWidth
              required
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Password"
              name="DB_PASSWORD"
              type={showPw ? 'text' : 'password'}
              value={form.DB_PASSWORD}
              onChange={handleChange}
              fullWidth
              placeholder="Leave blank to keep current (if backend supports)"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPw(s => !s)} edge="end" aria-label="toggle password visibility">
                      {showPw ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Checkbox checked={form.DB_SSL} onChange={handleChange} name="DB_SSL" />}
                label={<Stack direction="row" alignItems="center" spacing={1}>
                  <Security fontSize="small" /><Typography>SSL (rejectUnauthorized=false)</Typography>
                </Stack>}
              />
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              onClick={testConnection}
              disabled={!valid || testing}
            >
              {testing ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Test Connection
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={saveApply}
              disabled={!valid || saving}
            >
              {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Save & Apply
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Note: This page updates the server’s live database pool. Ensure you have appropriate admin access.
          </Typography>
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.sev} sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
