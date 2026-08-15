const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('FormConfig', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    templateName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'template_name'
    },
    tableName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'table_name'
    },
    type: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    masterRef: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'master_ref'
    },
    fieldsJson: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'fields_json'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'created_at'
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
    }
  }, {
    sequelize,
    tableName: 'form_configs',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "form_configs_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
