const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('CanvasConfig', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    canvasName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'canvas_name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    orgId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'org_id'
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: "canvas_configs_key_key"
    },
    canvasConfig: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: 'canvas_config'
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'owner_id'
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
    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_archived'
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'updated_by'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    slug: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'canvas_configs',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "canvas_configs_key_key",
        unique: true,
        fields: [
          { name: "key" },
        ]
      },
      {
        name: "canvas_configs_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_canvas_configs_archived",
        fields: [
          { name: "is_archived" },
        ]
      },
      {
        name: "idx_canvas_configs_key",
        fields: [
          { name: "key" },
        ]
      },
      {
        name: "idx_canvas_configs_owner",
        fields: [
          { name: "owner_id" },
        ]
      },
    ]
  });
};
