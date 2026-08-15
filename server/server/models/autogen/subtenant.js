const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Subtenant', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    tenantid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id'
      }
    },
    subtenantname: {
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
    subtenantAddress1: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'subtenant_address1'
    },
    subtenantAddress2: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'subtenant_address2'
    },
    subtenantCity: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'subtenant_city'
    },
    subtenantZip: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'subtenant_zip'
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
    tableName: 'subtenants',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "subtenant_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
