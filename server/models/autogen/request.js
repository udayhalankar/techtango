const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Request', {
    requestid: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    primaryrequestid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'request',
        key: 'requestid'
      }
    },
    tenantid: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    subtenantid: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    requesttype: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    requestorid: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    requestordept: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    requeststatus: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    contactmobile: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    materialqtyrequested: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    materialqtyissued: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    materialqtybalance: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    isuserauthenticated: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    requestcloseddate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    requestclosedby: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    userip: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    deliveredto: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    cancelreason: {
      type: DataTypes.STRING(100),
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
    tableName: 'request',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "request_pkey",
        unique: true,
        fields: [
          { name: "requestid" },
        ]
      },
    ]
  });
};
