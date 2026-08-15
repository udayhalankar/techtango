const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Facility', {
    facilityid: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    facilityname: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    deptcode: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    facilityaddress1: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    facilityaddress2: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    facilityemail: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    facilityph: {
      type: DataTypes.STRING(15),
      allowNull: true
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
    tableName: 'facility',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "facility_pkey",
        unique: true,
        fields: [
          { name: "facilityid" },
        ]
      },
    ]
  });
};
