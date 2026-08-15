const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('FormField', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    templateId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'form_templates',
        key: 'id'
      },
      field: 'template_id'
    },
    fieldname: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    datatype: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    inputtype: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    options: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true
    },
    format: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
    }
  }, {
    sequelize,
    tableName: 'form_fields',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "form_fields_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
