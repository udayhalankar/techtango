const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Organization', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: "organizations_name_key"
    },
    address1: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    address2: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    city: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    emailid: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    phone: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    contactPerson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'contact_person'
    },
    contactPersonEmail: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'contact_person_email'
    },
    contactPersonMobile: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'contact_person_mobile'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'created_by'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'created_at'
    },
    modifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'modified_by'
    },
    modifiedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'modified_date'
    }
  }, {
    sequelize,
    tableName: 'organizations',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "organizations_name_key",
        unique: true,
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "organizations_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
