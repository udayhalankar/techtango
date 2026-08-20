// // src/config/modulesConfig.js
// src/config/modulesConfig.js
import BusinessAutomation from "../pages/businessautomation/BusinessAutomation";
import Dashboardmain from "../pages/dashboardmain/Dashboardmain";
import Sbforms from "../pages/businessautomation/sbforms/Sbforms";
import Datatablebuilder from "../pages/businessautomation/datatablebuilder/Datatablebuilder"; // capitalized var
import Dak from "../pages/dak/Dak";
import Cm from "../pages/cm/Cm";
import Ccm from "../pages/ccm/Ccm";
import Mrm from "../pages/mrm/Mrm";
import Dms from "../pages/dms/Dms";
import Approvals from "../pages/approvals/Approvals";
import DirectAssignments from "../pages/directassignments/DirectAssignments";
import WorkflowAssign from "../pages/workflowassign/WorkflowAssign";
import Feedback from "../pages/feedback/Feedback";
import NewEnquiryForm from "../pages/enquiries/NewEnquiryForm";
import Rms from "../pages/rm/Rms";
import WorkflowManager from "../pages/businessautomation/workflows/WorkflowManager"; // one import
import CreateWorkflowModal from "../pages/businessautomation/workflows/CreateWorkflowModal";
import Enquiries from "../pages/enquiries/Enquiries";
import BulkUploader from "../pages/businessautomation/BulkUploader";
import Forms from "../pages/businessautomation/ListFormViews";
import ChowkidarDashboard from "../pages/ChowkidarDashboard";
import UICreator from "../pages/businessautomation/UiCreator";
import HomeLayout from "../layout/HomeLayout";
import TableCreator from "../pages/businessautomation/TableCreator";
import ChartBuilder from "../pages/businessautomation/ChartBuilder";
import CustomApps from  "../pages/businessautomation/customapps/CustomApps";
import DBSettings from "../pages/admin/DatabaseSettings";
import AdminPanel from "../pages/admin/AdminPanel";
import DBSchema from "../pages/DbSchemaExplorer";
import Workflows from "../pages/businessautomation/workflows/WorkflowAssignments";
import Workflowdesigner from "../pages/businessautomation/workflows/WorkflowDesigner";
import Workflowlibrary from "../pages/businessautomation/workflows/WorkflowLibrary";
import FormRunner from "../pages/businessautomation/workflows/FormRunner";
import SearchSubmitRequest from "../pages/rm/physicalrecords/searchsubmitrequest";
import ProcessRequest from "../pages/rm/physicalrecords/processservicerequest";
import VerifyOtpPage from "../pages/rm/physicalrecords/VerifyOtpPage";
import RcAssignments from "../pages/rm/physicalrecords/rcassignments";
import MaterialRequest from "../pages/rm/physicalrecords/MaterialRequest";
import MatReqModal from "../pages/rm/physicalrecords/ProcessMaterialReqModal";
import RmConfigLayout from "../pages/rm/RmConfigLayout";
import RegisterNew from "../pages/rm/physicalrecords/registernew";
import LandingPage from "../pages/public/LandingPage";
import CrudPageBuilder from "../pages/businessautomation/crudpagebuilder/CrudPageBuilder";
import BAAsideNav from "../pages/businessautomation/components/BAAsideNav";
import SimpleWorkflowbuilder from "../pages/businessautomation/simple_workflowbuilder/SimpleWorkflowbuilder";
import SimpleWorkflowConfigurator from "../pages/businessautomation/simple_workflowbuilder/SimpleWorkflowConfigurator";
import BAAssignments from "../pages/businessautomation/components/BAAssignments";
import SampleDashboard1 from "../pages/businessautomation/dashboardbuilder/SampleDashboard1";
import DashboardBuilder from "../pages/businessautomation/dashboardbuilder/DashboardBuilder";
import DashboardViewer from "../pages/businessautomation/dashboardbuilder/DashboardViewer";
import ExperienceBuilder from "../pages/businessautomation/experiencebuilder/ExperienceBuilder";
import ExperienceBuilderV2 from "../pages/businessautomation/experiencebuilder/ExperienceBuilderV2";
import AIEBV2Page from "../pages/businessautomation/experiencebuilder/aiebv2/aiebv2Page";
import AIAppBuilder from "../pages/businessautomation/aiappbuilder/AIAppBuilder";
import PrintWorkflow from "../pages/businessautomation/simple_workflowbuilder/components/PrintWorkflow"

//import SimpleWorkflowConfigurator from "../pages/businessautomation/simple_workflowbuilder/SimpleWorkflowConfigurator";

const modulesConfig = {
  ChowkidarDashboard: { path: "/chowkidar", component: ChowkidarDashboard, protected: false },

  LandingPage: { path: "/lp", component: LandingPage, protected: false },
  Dashboard: { path: "/dashboard", component: Dashboardmain, protected: true },

  BusinessAutomation: { path: "/businessautomation/*", component: BusinessAutomation, protected: true, moduleId: 8, moduleName: "Business Automation" },
  SmartForms: { path: "/sbforms", component: Sbforms, protected: true, moduleId: 8, moduleName: "Business Automation" },
  Datatablebuilder: { path: "/datatablebuilder", component: Datatablebuilder, protected: true, moduleId: 8, moduleName: "Business Automation" },
  ExperienceBuilder: { path: "/experiencebuilder", component: ExperienceBuilder, protected: true, moduleId: 8, moduleName: "Business Automation" },
  ExperienceBuilderV2: { path: "/experiencebuilderv2", component: ExperienceBuilderV2, protected: true, moduleId: 8, moduleName: "Business Automation" },
  AIExperienceBuilder: { path: "/aiexperiencebuilder", component: AIEBV2Page, protected: true, moduleId: 8, moduleName: "Business Automation" },
  AIAppBuilder: { path: "/aiappbuilder", component: AIAppBuilder, protected: true, moduleId: 8, moduleName: "Business Automation" },
  AIAppBuilderCrudView: { path: "/aicrudapp/:id", component: AIAppBuilder, protected: true, moduleId: 8, moduleName: "Business Automation" },
  AIAppBuilderDashboardView: { path: "/aidashboardapp/:id", component: AIAppBuilder, protected: true, moduleId: 8, moduleName: "Business Automation" },
  CustomApps: { path: "/customapps", component: CustomApps, protected: true, moduleId: 8, moduleName: "Business Automation" },
  WorkflowManager: { path: "/workflowmanager", component: WorkflowManager, protected: true, moduleId: 8, moduleName: "Business Automation" },
  CreateWorkflowModal: { path: "/wfmod", component: CreateWorkflowModal, protected: true, moduleId: 8, moduleName: "Business Automation" },
  TableCreator: { path: "/tables", component: TableCreator, protected: true, moduleId: 8, moduleName: "Business Automation" },
  ChartBuilder: { path: "/charts/new", component: ChartBuilder, protected: true, moduleId: 8, moduleName: "Business Automation" },
  Workflows: { path: "/wfassignments", component: Workflows, protected: true, moduleId: 8, moduleName: "Business Automation" },
  Workflowdesigner: { path: "/wfdesigner", component: Workflowdesigner, protected: true, moduleId: 8, moduleName: "Business Automation" },
  WorkflowdesignerEdit: { path: "/wfdesigner/:id", component: Workflowdesigner, protected: true, moduleId: 8, moduleName: "Business Automation" },
  WorkflowdesignerCompat: { path: "/workflow-designer", component: Workflowdesigner, protected: true, moduleId: 8, moduleName: "Business Automation" },
  WorkflowdesignerCompatEdit: { path: "/workflow-designer/:id", component: Workflowdesigner, protected: true, moduleId: 8, moduleName: "Business Automation" },
  Workflowlibrary: { path: "/wflibrary", component: Workflowlibrary, protected: true, moduleId: 8, moduleName: "Business Automation" },

  BulkUploader: { path: "/bulkuploader", component: BulkUploader, protected: true, moduleId: 8, moduleName: "Business Automation" },
  Forms: { path: "/forms", component: Forms, protected: true, moduleId: 8, moduleName: "Business Automation" },
  UICreator: { path: "/uicreator", component: UICreator, protected: true, moduleId: 8, moduleName: "Business Automation" },
  DashboardBuilder: { path: "/dashboardbuilder", component: DashboardBuilder, protected: true, moduleId: 8, moduleName: "Business Automation" },
  DashboardViewer: { path: "/dashboardbuilder/:dashboardId", component: DashboardViewer, protected: true, moduleId: 8, moduleName: "Business Automation" },
  SampleDashboard1: { path: "/sampledashboard1", component: SampleDashboard1, protected: true, moduleId: 8, moduleName: "Business Automation" },
  CrudPageBuilder: { path: "/crudwebpage", component: CrudPageBuilder, protected: true, moduleId: 8, moduleName: "Business Automation" },
  CrudPageBuilderStandalone: { path: "/crudwebpage/:pageId", component: CrudPageBuilder, protected: true, moduleId: 8, moduleName: "Business Automation" },
  BAAsideNav: { path: "/baasidenav", component: BAAsideNav, protected: true, moduleId: 8, moduleName: "Business Automation" },

  SimpleWorkflowbuilder: {    path: "/simplewfb",    component: SimpleWorkflowbuilder,    protected: true,    moduleId: 8,    moduleName: "Business Automation"  },
  SimpleWorkflowConfigurator: {    path: "/simplewfb/configure/:id",    component: SimpleWorkflowConfigurator,    protected: true,    moduleId: 8,    moduleName: "Business Automation"},
  BAAssignments : {    path: "/workflowassignments",    component: BAAssignments,    protected: true,    moduleId: 14,    moduleName: "Business Automation"},
  // Print view for workflow instance
  PrintWorkflow : { path: "/print/workflow/:id", component: PrintWorkflow,  protected: false, moduleId: 8,    moduleName: "Business Automation" },

  RMS: { path: "/Rms", component: Rms, protected: true },
  SearchSubmitRequest: { path: "/submitrequest", component: SearchSubmitRequest, protected: true, moduleId: 6, moduleName: "RMS" },
  ProcessRequest: { path: "/processrequest", component: ProcessRequest, protected: true, moduleId: 6, moduleName: "RMS" },
  RcAssignments: { path: "/rcassignments", component: RcAssignments, protected: true, moduleId: 6, moduleName: "RMS" },
  MaterialRequest: { path: "/materialrequest", component: MaterialRequest, protected: true, moduleId: 6, moduleName: "RMS" },
  MatReqModal: { path: "/materialrequestmodal", component: MatReqModal, protected: true, moduleId: 6, moduleName: "RMS" },
  RmConfigLayout: { path: "/rmconfig/*", component: RmConfigLayout, protected: true, moduleId: 6, moduleName: "RMS" },
  RegisterNew: { path: "/registernew", component: RegisterNew, protected: true, moduleId: 6, moduleName: "RMS" },

  Approvals: { path: "/approvals", component: Approvals, protected: true, moduleId: 9, moduleName: "Assignments" },
  DirectAssignments: { path: "/directassignments", component: DirectAssignments, protected: true, moduleId: 8, moduleName: "Business Automation" },
  WorkflowAssign: { path: "/workflowassign", component: WorkflowAssign, protected: true, moduleId: 14, moduleName: "Business Automation" },
  Feedback: { path: "/feedback", component: Feedback, protected: false },

  HomeLayout: { path: "/homelayout", component: HomeLayout, protected: false },

  DBSettings: { path: "/dbsettings", component: DBSettings, protected: false },
  AdminPanel: { path: "/adminpanel", component: AdminPanel, protected: false },
  DBSchema: { path: "/db-schema", component: DBSchema, protected: false },

  DAK: { path: "/dak", component: Dak, protected: true },
  CM: { path: "/cm", component: Cm, protected: true },
  CCM: { path: "/ccm", component: Ccm, protected: true },
  MRM: { path: "/mrm", component: Mrm, protected: true },
  DMS: { path: "/dms", component: Dms, protected: true },

  FormRunner: { path: "/form/:id", component: FormRunner, protected: false },
  VerifyOtpPage: { path: "/verify-otp", component: VerifyOtpPage, protected: false },

  Enquiries: { path: "/enquiry", component: Enquiries, protected: true, moduleId: 12, moduleName: "Enquiries" },
};

export default modulesConfig;

















// import BusinessAutomation from "../pages/businessautomation/BusinessAutomation";
// import Dashboardmain from "../pages/dashboardmain/Dashboardmain";
// import Sbforms from "../pages/businessautomation/sbforms/Sbforms";
// import Datatablebuilder from "../pages/businessautomation/datatablebuilder/Datatablebuilder";
// import Dak from "../pages/dak/Dak";
// import Cm from "../pages/cm/Cm";
// import Ccm from "../pages/ccm/Ccm";
// import Mrm from "../pages/mrm/Mrm";
// import Dms from "../pages/dms/Dms";
// import Approvals from "../pages/approvals/Approvals";
// import Feedback from "../pages/feedback/Feedback";
// import NewEnquiryForm from "../pages/enquiries/NewEnquiryForm";
// import Rms from "../pages/rm/Rms";
// import WorkflowManager from "../pages/businessautomation/workflows/WorkflowManager";
// import CreateWorkflowModal from "../pages/businessautomation/workflows/CreateWorkflowModal";
// import Enquiries from "../pages/enquiries/Enquiries";
// import BulkUploader from "../pages/businessautomation/BulkUploader";
// import Forms from "../pages/businessautomation/ListFormViews"
// import ChowkidarDashboard from "../pages/ChowkidarDashboard";
// import UICreator from "../pages/businessautomation/UiCreator";
// import HomeLayout from "../layout/HomeLayout";
// import TableCreator from "../pages/businessautomation/TableCreator";
// import ChartBuilder from "../pages/businessautomation/ChartBuilder";
// import DBSettings from "../pages/admin/DatabaseSettings";
// import AdminPanel from "../pages/admin/AdminPanel";
// import DBSchema from "../pages/DbSchemaExplorer";
// import Workflows from "../pages/businessautomation/workflows/WorkflowAssignments";
// import Workflowdesigner from "../pages/businessautomation/workflows/WorkflowDesigner";
// import Workflowlibrary from "../pages/businessautomation/workflows/WorkflowLibrary";
// //import Workflowmanager from "../pages/businessautomation/workflows/WorkflowManager";
// import FormRunner from '../pages/businessautomation/workflows/FormRunner';
// import SearchSubmitRequest from "../pages/rm/physicalrecords/searchsubmitrequest";
// import ProcessRequest from "../pages/rm/physicalrecords/processservicerequest";
// import VerifyOtpPage from "../pages/rm/physicalrecords/VerifyOtpPage";
// import RcAssignments from "../pages/rm/physicalrecords/rcassignments";
// import MaterialRequest from "../pages/rm/physicalrecords/MaterialRequest";
// import MatReqModal from "../pages/rm/physicalrecords/ProcessMaterialReqModal";
// // import RmConfigModal from "../pages/rm/config/ConfigModal";
// // import RmConfig from "../pages/rm/rmConfiguration";
// import RmConfigLayout from "../pages/rm/RmConfigLayout";
// import RegisterNew from "../pages/rm/physicalrecords/registernew";
// import LandingPage from "../pages/public/LandingPage";
// import CrudPageBuilder from "../pages/businessautomation/crudpagebuilder/CrudPageBuilder";
// import BAAsideNav from "../pages/businessautomation/components/BAAsideNav";
// import SimpleWorkflowbuilder from "../pages/businessautomation/simple_workflowbuilder/SimpleWorkflowbuilder";
// import SimpleWorkflowConfigurator from "../pages/businessautomation/simple_workflowbuilder/SimpleWorkflowConfigurator";


// // You can add unprotected modules by setting protected: false
// const modulesConfig = {
//   ChowkidarDashboard: { path: "/chowkidar", component:  ChowkidarDashboard, protected: false }, // ✅ unprotected
  
//   LandingPage: { path: "/lp", component: LandingPage, protected: false }, 
//   Dashboard: { path: "/dashboard", component: Dashboardmain, protected: true },
  

  
//   BusinessAutomation: { path: "/businessautomation/*", component: BusinessAutomation, protected: true,  moduleId: 8,    moduleName: "Business Automation" },
//   SmartForms: { path: "/sbforms", component: Sbforms, protected: true, moduleId: 8, moduleName: "Business Automation"  },
//   Datatablebuilder: { path: "/datatablebuilder", component: Datatablebuilder, protected: true, moduleId: 8, moduleName: "Business Automation"  },
//   WorkflowManager: { path: "/workflowmanager", component: WorkflowManager, protected: true, moduleId: 8, moduleName: "Business Automation"  }, // ✅ protected
//   CreateWorkflowModal: { path: "/wfmod", component: CreateWorkflowModal, protected: true, moduleId: 8, moduleName: "Business Automation"  }, // ✅ protected
//   TableCreator: { path: "/tables", component: TableCreator,  protected: true, moduleId: 8, moduleName: "Business Automation"  }, // ✅ protected
//   ChartBuilder: { path: "/charts/new", component: ChartBuilder,  protected: true, moduleId: 8, moduleName: "Business Automation"  }, // ✅ protected
//   Workflows: { path: "/wfassignments", component: Workflows,  protected: true, moduleId: 8, moduleName: "Business Automation"  }, // ✅ protected
//   Workflowdesigner: { path: "/wfdesigner", component: Workflowdesigner, protected: true, moduleId: 8, moduleName: "Business Automation"  }, // ✅ protected
//   WorkflowdesignerEdit:  { path: "/wfdesigner/:id", component: Workflowdesigner,  protected: true, moduleId: 8, moduleName: "Business Automation"  },
//   WorkflowdesignerCompat:     { path: "/workflow-designer", component: Workflowdesigner,  protected: true, moduleId: 8, moduleName: "Business Automation"  },
//   WorkflowdesignerCompatEdit: { path: "/workflow-designer/:id", component: Workflowdesigner,  protected: true, moduleId: 8, moduleName: "Business Automation"  },
//   Workflowlibrary: { path: "/wflibrary", component: Workflowlibrary,  protected: true, moduleId: 8, moduleName: "Business Automation"  }, // ✅ protected
//   Workflowmanager: { path: "/wfmanager", component: Workflowmanager,  protected: true, moduleId: 8, moduleName: "Business Automation"  }, // ✅ protected
//   BulkUploader: { path: "/bulkuploader", component: BulkUploader,  protected: true, moduleId: 8, moduleName: "Business Automation"  }, // ✅ protected
//   Forms: { path: "/forms", component:  Forms,  protected: true, moduleId: 8, moduleName: "Business Automation"  }, // ✅ protected
//   UICreator: {     path: '/uicreator', component: UICreator, protected: true, moduleId: 8, moduleName: "Business Automation"  }, 
//   CrudPageBuilder: {     path: '/crudwebpage', component: CrudPageBuilder, protected: true, moduleId: 8, moduleName: "Business Automation"  },  
//   // Standalone view of a single CRUD page (opens when you click OPEN)
//   CrudPageBuilderStandalone: { path: '/crudwebpage/:pageId', component: CrudPageBuilder, protected: true, moduleId: 8, moduleName: "Business Automation" },
//   BAAsideNav: {     path: '/baasidenav', component: BAAsideNav, protected: true, moduleId: 8, moduleName: "Business Automation"  },  
//   //UICreator: {     path: '/uicreator', component: UICreator, protected: true, moduleId: 13, moduleName: 'UICreator', moduleId: 8, moduleName: "Business Automation"  }, 
//   SimpleWorkflowbuilder: {     path: '/simplewfb', component: SimpleWorkflowbuilder, protected: true, moduleId: 8, moduleName: "Business Automation"  },  
//   SimpleWorkflowConfigurator: {  path: "/simplewfb/configure/:id",  component: SimpleWorkflowConfigurator,  protected: true,  moduleId: 8,  moduleName: "Business Automation",},
  
//   RMS: { path: "/Rms", component: Rms, protected: true }, 
//   SearchSubmitRequest: { path: "/submitrequest",        component: SearchSubmitRequest, protected: true, moduleId: 6, moduleName: "RMS" },
//   ProcessRequest:      { path: "/processrequest",       component: ProcessRequest,      protected: true, moduleId: 6, moduleName: "RMS" },
//   RcAssignments:       { path: "/rcassignments",        component: RcAssignments,       protected: true, moduleId: 6, moduleName: "RMS" },
//   MaterialRequest:     { path: "/materialrequest",      component: MaterialRequest,     protected: true, moduleId: 6, moduleName: "RMS" },
//   MatReqModal:         { path: "/materialrequestmodal", component: MatReqModal,        protected: true, moduleId: 6, moduleName: "RMS" },
//   RmConfigLayout:      { path: "/rmconfig/*",           component: RmConfigLayout,      protected: true, moduleId: 6, moduleName: "RMS" },
//   RegisterNew:         { path: "/registernew",          component: RegisterNew,         protected: true, moduleId: 6, moduleName: "RMS" },

//   Approvals: { path: "/approvals", component: Approvals, protected: true }, 
//   Feedback: { path: "/feedback", component: Feedback, protected: false }, // ✅ unprotected
  
//   HomeLayout: { path: "/homelayout", component: HomeLayout, protected: false }, // ✅ unprotected
  
//   // Enquiries: { path: "/enquiries", component: Enquiries, protected: false}, // ✅ unprotected
//   DBSettings: { path: "/dbsettings", component: DBSettings, protected: false }, // ✅ unprotected
//   AdminPanel: { path: "/adminpanel", component: AdminPanel, protected: false }, // ✅ unprotected
//   DBSchema: { path: "/db-schema", component: DBSchema, protected: false }, // ✅ unprotected

//     DAK: { path: "/dak", component: Dak, protected: true },
//   CM: { path: "/cm", component: Cm, protected: true },
//   CCM: { path: "/ccm", component: Ccm, protected: true },
//   MRM: { path: "/mrm", component: Mrm, protected: true },
//   DMS: { path: "/dms", component: Dms, protected: true }, 
  
//   //UICreator: { path: "/uicreator", component: UICreator, protected: false }, // ✅ unprotected
//   FormRunner: { path: "/form/:id", component: FormRunner, protected: false }, // ✅ unprotected
//   VerifyOtpPage: { path: "/verify-otp", component: VerifyOtpPage, protected: false }, // ✅ unprotected
  
  
//   //RmConfigModal: { path: "/rmconfigmodal", component: RmConfigModal, protected: false }, // ✅ unprotected
//   //RmConfig: { path: "/rmconfig", component: RmConfig, protected: false }, // ✅ unprotected
  




//   Enquiries: {
//     path: '/enquiry',
//     component: Enquiries,
//     protected: true,
//     moduleId: 12,            // ← use the numeric id
//     moduleName: 'Enquiries', // optional fallback
//   },
  
  
 
  
 
//   //NewEnquiryForm: { path: "/enquiry", component: NewEnquiryForm, protected: false }, // ✅ unprotected
// };

// export default modulesConfig;
