const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('WorkflowStep', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
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
    stepNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'step_number'
    },
    stepName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'step_name'
    },
    assignedUser: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'assigned_user'
    },
    ccList: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      field: 'cc_list'
    },
    actionType: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'action_type'
    },
    sendEmailTo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'send_email_to'
    },
    statusOnCompletion: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'status_on_completion'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
    },
    onApproveSendTo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'on_approve_send_to'
    },
    onRejectSendTo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'on_reject_send_to'
    },
    onReferSendTo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'on_refer_send_to'
    },
    onSubmitSendTo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'on_submit_send_to'
    },
    isFinalStep: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'is_final_step'
    }
  }, {
    sequelize,
    tableName: 'workflow_steps',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "workflow_steps_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
