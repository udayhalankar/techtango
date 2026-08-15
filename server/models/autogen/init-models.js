var DataTypes = require("sequelize").DataTypes;
var _ApprovalFile = require("./approvalFile");
var _Approval = require("./approval");
var _App = require("./app");
var _AuditLog = require("./auditLog");
var _AuthLog = require("./authLog");
var _Businesspartner = require("./businesspartner");
var _CanvasConfig = require("./canvasConfig");
var _ChartConfig = require("./chartConfig");
var _CustFormAcasdcasca = require("./custFormAcasdcasca");
var _CustFormDdl2 = require("./custFormDdl2");
var _CustFormDdltemplate = require("./custFormDdltemplate");
var _CustFormDirtydelete1 = require("./custFormDirtydelete1");
var _CustFormUdaytest2 = require("./custFormUdaytest2");
var _CustFormUserdatum = require("./custFormUserdatum");
var _Dept = require("./dept");
var _EmailTemplate = require("./emailTemplate");
var _Enquiry = require("./enquiry");
var _EnquiryFile = require("./enquiryFile");
var _Facility = require("./facility");
var _FormConfig = require("./formConfig");
var _FormCustTable = require("./formCustTable");
var _FormCustTable2 = require("./formCustTable2");
var _FormField = require("./formField");
var _FormMaster = require("./formMaster");
var _FormRecord = require("./formRecord");
var _FormTemplate = require("./formTemplate");
var _FormView = require("./formView");
var _Module = require("./module");
var _Organization = require("./organization");
var _Product = require("./product");
var _Request = require("./request");
var _Review = require("./review");
var _SalesInvoice = require("./salesInvoice");
var _Subscription = require("./subscription");
var _Subtenant = require("./subtenant");
var _TableConfig = require("./tableConfig");
var _Tenant = require("./tenant");
var _Todo = require("./todo");
var _User = require("./user");
var _Users2 = require("./users2");
var _WorkflowAudit = require("./workflowAudit");
var _WorkflowEdge = require("./workflowEdge");
var _WorkflowFormStep = require("./workflowFormStep");
var _WorkflowInstance = require("./workflowInstance");
var _WorkflowNode = require("./workflowNode");
var _WorkflowStep = require("./workflowStep");
var _WorkflowTask = require("./workflowTask");
var _Workflow = require("./workflow");

function initModels(sequelize) {
  var ApprovalFile = _ApprovalFile(sequelize, DataTypes);
  var Approval = _Approval(sequelize, DataTypes);
  var App = _App(sequelize, DataTypes);
  var AuditLog = _AuditLog(sequelize, DataTypes);
  var AuthLog = _AuthLog(sequelize, DataTypes);
  var Businesspartner = _Businesspartner(sequelize, DataTypes);
  var CanvasConfig = _CanvasConfig(sequelize, DataTypes);
  var ChartConfig = _ChartConfig(sequelize, DataTypes);
  var CustFormAcasdcasca = _CustFormAcasdcasca(sequelize, DataTypes);
  var CustFormDdl2 = _CustFormDdl2(sequelize, DataTypes);
  var CustFormDdltemplate = _CustFormDdltemplate(sequelize, DataTypes);
  var CustFormDirtydelete1 = _CustFormDirtydelete1(sequelize, DataTypes);
  var CustFormUdaytest2 = _CustFormUdaytest2(sequelize, DataTypes);
  var CustFormUserdatum = _CustFormUserdatum(sequelize, DataTypes);
  var Dept = _Dept(sequelize, DataTypes);
  var EmailTemplate = _EmailTemplate(sequelize, DataTypes);
  var Enquiry = _Enquiry(sequelize, DataTypes);
  var EnquiryFile = _EnquiryFile(sequelize, DataTypes);
  var Facility = _Facility(sequelize, DataTypes);
  var FormConfig = _FormConfig(sequelize, DataTypes);
  var FormCustTable = _FormCustTable(sequelize, DataTypes);
  var FormCustTable2 = _FormCustTable2(sequelize, DataTypes);
  var FormField = _FormField(sequelize, DataTypes);
  var FormMaster = _FormMaster(sequelize, DataTypes);
  var FormRecord = _FormRecord(sequelize, DataTypes);
  var FormTemplate = _FormTemplate(sequelize, DataTypes);
  var FormView = _FormView(sequelize, DataTypes);
  var Module = _Module(sequelize, DataTypes);
  var Organization = _Organization(sequelize, DataTypes);
  var Product = _Product(sequelize, DataTypes);
  var Request = _Request(sequelize, DataTypes);
  var Review = _Review(sequelize, DataTypes);
  var SalesInvoice = _SalesInvoice(sequelize, DataTypes);
  var Subscription = _Subscription(sequelize, DataTypes);
  var Subtenant = _Subtenant(sequelize, DataTypes);
  var TableConfig = _TableConfig(sequelize, DataTypes);
  var Tenant = _Tenant(sequelize, DataTypes);
  var Todo = _Todo(sequelize, DataTypes);
  var User = _User(sequelize, DataTypes);
  var Users2 = _Users2(sequelize, DataTypes);
  var WorkflowAudit = _WorkflowAudit(sequelize, DataTypes);
  var WorkflowEdge = _WorkflowEdge(sequelize, DataTypes);
  var WorkflowFormStep = _WorkflowFormStep(sequelize, DataTypes);
  var WorkflowInstance = _WorkflowInstance(sequelize, DataTypes);
  var WorkflowNode = _WorkflowNode(sequelize, DataTypes);
  var WorkflowStep = _WorkflowStep(sequelize, DataTypes);
  var WorkflowTask = _WorkflowTask(sequelize, DataTypes);
  var Workflow = _Workflow(sequelize, DataTypes);

  ApprovalFile.belongsTo(Approval, { as: "approval", foreignKey: "approvalId"});
  Approval.hasMany(ApprovalFile, { as: "approvalFiles", foreignKey: "approvalId"});
  EnquiryFile.belongsTo(Enquiry, { as: "enquiry", foreignKey: "enquiryId"});
  Enquiry.hasMany(EnquiryFile, { as: "enquiryFiles", foreignKey: "enquiryId"});
  FormField.belongsTo(FormTemplate, { as: "template", foreignKey: "templateId"});
  FormTemplate.hasMany(FormField, { as: "formFields", foreignKey: "templateId"});
  FormView.belongsTo(FormTemplate, { as: "template", foreignKey: "templateId"});
  FormTemplate.hasMany(FormView, { as: "formViews", foreignKey: "templateId"});
  FormView.belongsTo(FormView, { as: "primaryView", foreignKey: "primaryViewId"});
  FormView.hasMany(FormView, { as: "formViews", foreignKey: "primaryViewId"});
  Subscription.belongsTo(Module, { as: "module", foreignKey: "moduleId"});
  Module.hasMany(Subscription, { as: "subscriptions", foreignKey: "moduleId"});
  User.belongsTo(Organization, { as: "organizationOrganization", foreignKey: "organizationId"});
  Organization.hasMany(User, { as: "users", foreignKey: "organizationId"});
  Review.belongsTo(Product, { as: "product", foreignKey: "productId"});
  Product.hasMany(Review, { as: "reviews", foreignKey: "productId"});
  Request.belongsTo(Request, { as: "primaryrequest", foreignKey: "primaryrequestid"});
  Request.hasMany(Request, { as: "requests", foreignKey: "primaryrequestid"});
  Dept.belongsTo(Subtenant, { as: "subtenant", foreignKey: "subtenantid"});
  Subtenant.hasMany(Dept, { as: "depts", foreignKey: "subtenantid"});
  Subtenant.belongsTo(Tenant, { as: "tenant", foreignKey: "tenantid"});
  Tenant.hasMany(Subtenant, { as: "subtenants", foreignKey: "tenantid"});
  ApprovalFile.belongsTo(User, { as: "uploadedByUser", foreignKey: "uploadedBy"});
  User.hasMany(ApprovalFile, { as: "approvalFiles", foreignKey: "uploadedBy"});
  Approval.belongsTo(User, { as: "assignedByUser", foreignKey: "assignedBy"});
  User.hasMany(Approval, { as: "approvals", foreignKey: "assignedBy"});
  Approval.belongsTo(User, { as: "assigneeUser", foreignKey: "assignee"});
  User.hasMany(Approval, { as: "assigneeApprovals", foreignKey: "assignee"});
  Approval.belongsTo(User, { as: "modifiedByUser", foreignKey: "modifiedBy"});
  User.hasMany(Approval, { as: "modifiedByApprovals", foreignKey: "modifiedBy"});
  EnquiryFile.belongsTo(User, { as: "uploadedByUser", foreignKey: "uploadedBy"});
  User.hasMany(EnquiryFile, { as: "enquiryFiles", foreignKey: "uploadedBy"});
  Module.belongsTo(User, { as: "createdByUser", foreignKey: "createdBy"});
  User.hasMany(Module, { as: "modules", foreignKey: "createdBy"});
  Module.belongsTo(User, { as: "updatedByUser", foreignKey: "updatedBy"});
  User.hasMany(Module, { as: "updatedByModules", foreignKey: "updatedBy"});
  Organization.belongsTo(User, { as: "createdByUser", foreignKey: "createdBy"});
  User.hasMany(Organization, { as: "organizations", foreignKey: "createdBy"});
  Organization.belongsTo(User, { as: "modifiedByUser", foreignKey: "modifiedBy"});
  User.hasMany(Organization, { as: "modifiedByOrganizations", foreignKey: "modifiedBy"});
  Subscription.belongsTo(User, { as: "createdByUser", foreignKey: "createdBy"});
  User.hasMany(Subscription, { as: "subscriptions", foreignKey: "createdBy"});
  Subscription.belongsTo(User, { as: "updatedByUser", foreignKey: "updatedBy"});
  User.hasMany(Subscription, { as: "updatedBySubscriptions", foreignKey: "updatedBy"});
  Subscription.belongsTo(User, { as: "user", foreignKey: "userId"});
  User.hasMany(Subscription, { as: "userSubscriptions", foreignKey: "userId"});
  Enquiry.belongsTo(Workflow, { as: "workflow", foreignKey: "workflowId"});
  Workflow.hasMany(Enquiry, { as: "enquiries", foreignKey: "workflowId"});
  WorkflowStep.belongsTo(Workflow, { as: "workflow", foreignKey: "workflowId"});
  Workflow.hasMany(WorkflowStep, { as: "workflowSteps", foreignKey: "workflowId"});

  return {
    ApprovalFile,
    Approval,
    App,
    AuditLog,
    AuthLog,
    Businesspartner,
    CanvasConfig,
    ChartConfig,
    CustFormAcasdcasca,
    CustFormDdl2,
    CustFormDdltemplate,
    CustFormDirtydelete1,
    CustFormUdaytest2,
    CustFormUserdatum,
    Dept,
    EmailTemplate,
    Enquiry,
    EnquiryFile,
    Facility,
    FormConfig,
    FormCustTable,
    FormCustTable2,
    FormField,
    FormMaster,
    FormRecord,
    FormTemplate,
    FormView,
    Module,
    Organization,
    Product,
    Request,
    Review,
    SalesInvoice,
    Subscription,
    Subtenant,
    TableConfig,
    Tenant,
    Todo,
    User,
    Users2,
    WorkflowAudit,
    WorkflowEdge,
    WorkflowFormStep,
    WorkflowInstance,
    WorkflowNode,
    WorkflowStep,
    WorkflowTask,
    Workflow,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
