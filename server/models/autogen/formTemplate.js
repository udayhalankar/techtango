const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('FormTemplate', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    templateName: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "form_templates_template_name_key",
      field: 'template_name'
    },
    tableName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'table_name'
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
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'form_templates',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "form_templates_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "form_templates_template_name_key",
        unique: true,
        fields: [
          { name: "template_name" },
        ]
      },
    ]
  });
};
