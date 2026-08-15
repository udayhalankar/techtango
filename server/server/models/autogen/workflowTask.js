const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('WorkflowTask', {
    id: {
      autoIncrement: true,
      autoIncrementIdentity: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    instanceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'instance_id'
    },
    nodeId: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'node_id'
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'assigned_to'
    },
    status: {
      type: DataTypes.ENUM("Pending","In Progress","Completed","Rejected","Closed"),
      allowNull: false,
      defaultValue: "Pending"
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'updated_at'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by'
    },
    modifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'modified_by'
    },
    modifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'modified_at'
    },
    workflowId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'workflow_id'
    },
    assigneeId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'assignee_id'
    },
    nodeType: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'node_type'
    },
    formId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'form_id'
    },
    assigneeEmail: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'assignee_email'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'started_at'
    }
  }, {
    sequelize,
    tableName: 'workflow_tasks',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "idx_wt_assignee",
        fields: [
          { name: "assignee_id" },
        ]
      },
      {
        name: "idx_wt_assignee_email",
        fields: [
          { name: "assignee_email" },
        ]
      },
      {
        name: "idx_wt_instance",
        fields: [
          { name: "instance_id" },
        ]
      },
      {
        name: "idx_wt_status",
        fields: [
          { name: "status" },
        ]
      },
      {
        name: "idx_wt_workflow_node",
        fields: [
          { name: "workflow_id" },
          { name: "node_id" },
        ]
      },
      {
        name: "workflow_tasks_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
