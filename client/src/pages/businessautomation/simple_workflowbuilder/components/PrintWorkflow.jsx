// Lightweight print page to render a workflow instance form read-only
// Route: /print/workflow/:id
import React, { Component } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../../services/api';
import { DynamicStepForm } from '../../components/BAAssignments';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import qs from 'qs';

const printCss = `
  @page {
    size: 8.5in 11in;
    margin: 0.5in;
  }
  body {
    margin: 0;
    background: #f7f8fb;
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    color: #1f2937;
  }
  .print-root {
    padding: 12px 0 28px;
  }
  .print-shell {
    max-width: 920px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    padding: 28px 30px 34px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.06);
  }
  .print-shell .MuiPaper-root {
    box-shadow: none !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
  }
  .print-shell .MuiFormControl-root,
  .print-shell .form-group,
  .print-shell .ba-field {
    margin-bottom: 14px;
  }
  .print-shell .MuiFormLabel-root,
  .print-shell .field-label,
  .print-shell label {
    font-size: 13px;
    font-weight: 600;
    color: #4b5563;
  }
  .print-shell input,
  .print-shell select,
  .print-shell textarea,
  .print-shell .MuiInputBase-input {
    font-size: 15px;
    color: #111827;
  }
  .print-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .print-logo {
    width: 42px;
    height: 42px;
    object-fit: contain;
  }
  .print-title {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.15;
  }
  .print-subtitle {
    font-size: 12px;
    color: #6b7280;
    margin-top: 2px;
  }
  .print-body {
    margin-top: 10px;
  }
`;

class PrintWorkflowClass extends Component {
  state = {
    inst: null,
    loading: true,
    error: '',
    ready: false,
  };

  componentDidMount() {
    try {
      window.__PRINT_READY__ = false;
    } catch (_) {}
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token') ||
      qs.parse(window.location.search, { ignoreQueryPrefix: true }).token;
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    this.fetchInstance();
  }

  componentDidUpdate() {
    const { inst, loading, error, ready } = this.state;
    if (!loading && !error && inst && !ready) {
      const mark = () => {
        try {
          window.__PRINT_READY__ = true;
        } catch (_) {}
        this.setState({ ready: true });
      };
      const fontsReady = typeof document !== 'undefined' && document.fonts?.ready;
      if (fontsReady && fontsReady.then) {
        fontsReady.then(() => requestAnimationFrame(mark)).catch(mark);
      } else {
        requestAnimationFrame(mark);
      }
    }
  }

  async fetchInstance() {
    const { id } = this.props;
    try {
      const { data } = await api.get(`/simple_workflow_instances/${id}`);
      this.setState({ inst: data, loading: false, error: '' });
    } catch (_) {
      this.setState({ error: 'Failed to load instance', loading: false });
    }
  }

  buildFormData(inst) {
    if (!inst) return { formData: {}, stepCfg: null };
    let formValues = {};
    try {
      const at = Array.isArray(inst.audit_trail)
        ? inst.audit_trail
        : JSON.parse(inst.audit_trail || '[]');
      const last = Array.isArray(at) && at.length ? at[at.length - 1] : null;
      if (last) {
        if (last.form_values && typeof last.form_values === 'object') {
          formValues = last.form_values;
        } else if (last.data && typeof last.data === 'object') {
          formValues = last.data;
        }
      }
    } catch (_) {}

    let route = [];
    try {
      if (Array.isArray(inst.routeinfo)) {
        route = inst.routeinfo;
      } else if (typeof inst.routeinfo === 'string' && inst.routeinfo.trim()) {
        route = JSON.parse(inst.routeinfo);
      } else if (inst.routeinfo && typeof inst.routeinfo === 'object') {
        route = inst.routeinfo;
      }
    } catch (_) {
      route = [];
    }
    const stepNo = Number(inst.step_no);
    const stepName = (inst.step_name || '').toLowerCase();
    const cfg =
      (Number.isFinite(stepNo) && route.find((r) => Number(r.step_no) === stepNo)) ||
      (stepName && route.find((r) => String(r.step_name || '').toLowerCase() === stepName)) ||
      (route.length ? route[route.length - 1] : null);

    return { formData: formValues, stepCfg: cfg };
  }

  parseSchema(stepCfg) {
    if (!stepCfg) return { schema: { fields: [] }, layoutDef: null, attachmentsAllowedFlag: false };
    const schema = Array.isArray(stepCfg.step_form_configuration?.fields)
      ? stepCfg.step_form_configuration
      : (() => {
          try {
            return JSON.parse(stepCfg.step_form_configuration || '{}');
          } catch {
            return { fields: [] };
          }
        })();

    const layoutDef = (() => {
      try {
        const raw =
          stepCfg.layout_def ||
          stepCfg.layout_definition ||
          stepCfg.layout ||
          stepCfg.canvas_layout ||
          stepCfg.form_layout;
        if (typeof raw === 'string') return JSON.parse(raw);
        if (raw && typeof raw === 'object') return raw;
      } catch (_) {}
      return null;
    })();

    const attachmentsAllowedFlag = String(stepCfg.attachments_allowed || '').toLowerCase() !== 'false';
    return { schema, layoutDef, attachmentsAllowedFlag };
  }

  render() {
    const { inst, loading, error } = this.state;
    if (loading) {
      return (
        <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} />
          <Typography>Loading.</Typography>
        </Box>
      );
    }

    const { formData, stepCfg } = this.buildFormData(inst);
    if (error || !inst || !stepCfg) {
      return (
        <Box sx={{ p: 4 }}>
          <Typography color="error">{error || 'Instance or step not found'}</Typography>
        </Box>
      );
    }

    const { schema, layoutDef, attachmentsAllowedFlag } = this.parseSchema(stepCfg);

    return (
      <Box className="print-root">
        <style dangerouslySetInnerHTML={{ __html: printCss }} />
        <Box className="print-shell">
          <Box className="print-header">
            {inst?.logo_url ? (
              <img src={inst.logo_url} alt="logo" className="print-logo" />
            ) : (
              <Box
                className="print-logo"
                sx={{
                  background:
                    'linear-gradient(135deg, #ef4444 0%, #fb923c 50%, #22c55e 100%)',
                  borderRadius: '8px',
                }}
              />
            )}
            <Box>
              <div className="print-title">{inst?.workflow_name || 'Workflow'}</div>
              <div className="print-subtitle">Instance #{inst?.id}</div>
            </Box>
          </Box>

          <Box className="print-body">
            <DynamicStepForm
              schema={schema}
              initial={formData}
              attachmentsAllowed={attachmentsAllowedFlag}
              showPrimaryButton={false}
              oneColumn={false}
              layoutSections={layoutDef}
              canvasModel={layoutDef && layoutDef.kind === 'canvas_v1' ? layoutDef : null}
              containerStyle={
                layoutDef?.container_style || {
                  border: '0',
                  padding: 0,
                  boxShadow: 'none',
                }
              }
            />
          </Box>
        </Box>
      </Box>
    );
  }
}

export default function PrintWorkflow() {
  const { id } = useParams();
  return <PrintWorkflowClass id={id} />;
}
