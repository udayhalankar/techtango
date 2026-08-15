const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('WorkflowAudit', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    workflowId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'workflow_id'
    },
    instanceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'instance_id'
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'actor_id'
    },
    event: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    detail: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    ts: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
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
    }
  }, {
    sequelize,
    tableName: 'workflow_audit',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "workflow_audit_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
