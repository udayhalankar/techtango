const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('CustFormDdltemplate', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    username: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    userage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    chicken: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    biryani: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    pulao: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gender: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    storytext: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    picture: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true
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
    }
  }, {
    sequelize,
    tableName: 'cust_form_ddltemplate',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "cust_form_ddltemplate_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
