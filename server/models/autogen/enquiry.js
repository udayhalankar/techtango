const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Enquiry', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    caseNo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'case_no'
    },
    enquiryNo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'enquiry_no'
    },
    enquiryDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'enquiry_details'
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'special_instructions'
    },
    technicalNo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'technical_no'
    },
    estimationNo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'estimation_no'
    },
    proposalNo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'proposal_no'
    },
    attachEmail: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'attach_email'
    },
    attachSupportingDocs: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'attach_supporting_docs'
    },
    attachTechnical: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'attach_technical'
    },
    attachTechnicalSupportings: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'attach_technical_supportings'
    },
    attachEstimation: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'attach_estimation'
    },
    attachEstimationSupportings: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'attach_estimation_supportings'
    },
    attachProposal: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'attach_proposal'
    },
    attachProposalSupportings: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'attach_proposal_supportings'
    },
    technicalSubmissionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'technical_submission_date'
    },
    estimationSubmissionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'estimation_submission_date'
    },
    proposalSubmissionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'proposal_submission_date'
    },
    technicalComments: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'technical_comments'
    },
    technicalDecision: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'technical_decision'
    },
    technicalApprovalComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'technical_approval_comment'
    },
    estimationComments: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'estimation_comments'
    },
    estimationApproval: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'estimation_approval'
    },
    estimationApprovalComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'estimation_approval_comment'
    },
    proposalComments: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'proposal_comments'
    },
    proposalApproval: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'proposal_approval'
    },
    proposalApprovalComments: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'proposal_approval_comments'
    },
    initiatorMailId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'initiator_mail_id'
    },
    technicalRecipientMailId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'technical_recipient_mail_id'
    },
    technicalApproverMailId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'technical_approver_mail_id'
    },
    estimationRecipientMailId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'estimation_recipient_mail_id'
    },
    estimationApproverMailId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'estimation_approver_mail_id'
    },
    proposalCreatorMailId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'proposal_creator_mail_id'
    },
    proposalApproverMailId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'proposal_approver_mail_id'
    },
    clientMailId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'client_mail_id'
    },
    workflowId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'workflows',
        key: 'id'
      },
      field: 'workflow_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'client_id'
    },
    initiatorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'initiator_id'
    },
    initiatorEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'initiator_email'
    },
    recipient: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    enquiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'enquiry_date'
    },
    offerDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'offer_date'
    },
    source: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    repeatOrNew: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'repeat_or_new'
    },
    enquiryType: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'enquiry_type'
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    sizeModel: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'size_model'
    },
    offerValueInInr: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'offer_value_in_inr'
    },
    country: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    poNo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'po_no'
    },
    poDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'po_date'
    },
    poValueInInr: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'po_value_in_inr'
    },
    poValueInUsd: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'po_value_in_usd'
    },
    exchangeRate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'exchange_rate'
    },
    projectCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'project_code'
    },
    keyDecisionMaker: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'key_decision_maker'
    },
    dateTechnicalCreated: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_technical_created'
    },
    dateTechnicalApproved: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_technical_approved'
    },
    dateEstimateCreated: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_estimate_created'
    },
    dateEstimateApproved: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_estimate_approved'
    },
    dateProposalCreated: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_proposal_created'
    },
    dateProposalApproved: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_proposal_approved'
    },
    dateProposalSent: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_proposal_sent'
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'enquiries',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "cases_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_cases_workflow_id",
        fields: [
          { name: "workflow_id" },
        ]
      },
    ]
  });
};
