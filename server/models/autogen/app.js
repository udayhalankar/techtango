const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('App', {
    appid: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    appname: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    appownerid: {
      type: DataTypes.STRING(10),
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
    tableName: 'apps',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "apps_pkey",
        unique: true,
        fields: [
          { name: "appid" },
        ]
      },
    ]
  });
};
