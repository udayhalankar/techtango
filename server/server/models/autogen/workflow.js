const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Workflow', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    createdBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'created_by'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'updated_at'
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
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
    name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    graph: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    assigneeId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'assignee_id'
    }
  }, {
    sequelize,
    tableName: 'workflows',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "workflows_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
