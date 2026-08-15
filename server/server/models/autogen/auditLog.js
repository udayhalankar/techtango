const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('AuditLog', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    tableName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'table_name'
    },
    action: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    recordId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'record_id'
    },
    changedData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'changed_data'
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    modifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'modified_by'
    },
    modifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'modified_at'
    },
    beforeChange: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'before_change'
    },
    afterChange: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'after_change'
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'user_id'
    },
    path: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    method: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ip: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    meta: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'audit_log',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "audit_log_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
