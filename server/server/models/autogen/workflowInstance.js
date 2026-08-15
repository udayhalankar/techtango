const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('WorkflowInstance', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    workflowRowId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'workflow_row_id'
    },
    workflowId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'workflow_id'
    },
    workflowName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'workflow_name'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    masterFormId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'master_form_id'
    },
    masterRowId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'master_row_id'
    },
    startedBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'started_by'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'started_at'
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'workflow_instances',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "idx_wi_rowid",
        fields: [
          { name: "workflow_row_id" },
        ]
      },
      {
        name: "idx_wi_started_by",
        fields: [
          { name: "started_by" },
        ]
      },
      {
        name: "idx_wi_workflow",
        fields: [
          { name: "workflow_id" },
        ]
      },
      {
        name: "workflow_instances_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
