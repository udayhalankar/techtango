// src/config/modulesConfig.js

import Bpm from "../pages/bpm/Bpm";
import Dashboardmain from "../pages/dashboardmain/Dashboardmain";
import Sbforms from "../pages/sbforms/Sbforms";
import Dak from "../pages/dak/Dak";
import Cm from "../pages/cm/Cm";
import Ccm from "../pages/ccm/Ccm";
import Mrm from "../pages/mrm/Mrm";
import Dms from "../pages/dms/Dms";
import Approvals from "../pages/approvals/Approvals";
import Feedback from "../pages/feedback/Feedback";
import NewEnquiryForm from "../pages/enquries/NewEnquiryForm";
import Rms from "../pages/rms/Rms";
import WorkflowManager from "../pages/workflow/WorkflowManager";
import CreateWorkflowModal from "../pages/workflow/CreateWorkflowModal";

// You can add unprotected modules by setting protected: false
const modulesConfig = {
  BPM: { path: "/bpm/*", component: Bpm, protected: true },
  Dashboard: { path: "/dashboard", component: Dashboardmain, protected: true },
  SmartForms: { path: "/sbforms", component: Sbforms, protected: true },
  DAK: { path: "/dak", component: Dak, protected: true },
  CM: { path: "/cm", component: Cm, protected: true },
  CCM: { path: "/ccm", component: Ccm, protected: true },
  MRM: { path: "/mrm", component: Mrm, protected: true },
  DMS: { path: "/dms", component: Dms, protected: true }, 
  RMS: { path: "/Rms", component: Rms, protected: true }, 
  Approvals: { path: "/approvals", component: Approvals, protected: true }, 
  Feedback: { path: "/feedback", component: Feedback, protected: false }, // ✅ unprotected
  WorkflowManager: { path: "/workflowmanager", component: WorkflowManager, protected: false }, // ✅ unprotected
  CreateWorkflowModal: { path: "/wfmod", component: CreateWorkflowModal, protected: false }, // ✅ unprotected
  NewEnquiryForm: { path: "/enquiry", component: NewEnquiryForm, protected: false }, // ✅ unprotected
};

export default modulesConfig;
