const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('WorkflowEdge', {
    id: {
      autoIncrement: true,
      autoIncrementIdentity: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    workflowId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'workflow_id'
    },
    sourceNodeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'source_node_id'
    },
    targetNodeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'target_node_id'
    },
    condition: {
      type: DataTypes.TEXT,
      allowNull: true
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
    }
  }, {
    sequelize,
    tableName: 'workflow_edges',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "workflow_edges_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
