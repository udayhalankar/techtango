const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('FormView', {
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
    viewName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'view_name'
    },
    viewType: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'view_type'
    },
    primaryViewId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'form_views',
        key: 'id'
      },
      field: 'primary_view_id'
    },
    layout: {
      type: DataTypes.JSONB,
      allowNull: false
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
    tableName: 'form_views',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "form_views_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
