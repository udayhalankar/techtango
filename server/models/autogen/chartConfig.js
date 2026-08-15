const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ChartConfig', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    chartName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'chart_name'
    },
    chartDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'chart_description'
    },
    chartConfigJson: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'chart_config_json'
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'created_by'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
    },
    modifiedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'modified_by'
    },
    modifiedAt: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: 'chart_configs',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "chart_configs_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
