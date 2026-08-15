const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Tenant', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    tenantname: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    contactperson: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    contactemail: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    contactmobile: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    tenantAddress1: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'tenant_address1'
    },
    tenantAddress2: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'tenant_address2'
    },
    tenantCity: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'tenant_city'
    },
    tenantZip: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'tenant_zip'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'created_at'
    },
    createdBy: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'created_by'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'updated_at'
    },
    updatedBy: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'updated_by'
    }
  }, {
    sequelize,
    tableName: 'tenants',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "tenant_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
