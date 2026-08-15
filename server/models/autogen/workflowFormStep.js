const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('WorkflowFormStep', {
    workflowId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'workflow_id'
    },
    nodeId: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'node_id'
    },
    nodeType: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'node_type'
    },
    formId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'form_id'
    }
  }, {
    sequelize,
    tableName: 'workflow_form_steps',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false
  });
};
