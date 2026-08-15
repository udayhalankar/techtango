const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Dept', {
    deptid: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    subtenantid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'subtenants',
        key: 'id'
      }
    },
    deptname: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    deptcode: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    deptcontact: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    contactemail: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    contactmobile: {
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
    tableName: 'dept',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "dept_pkey",
        unique: true,
        fields: [
          { name: "deptid" },
        ]
      },
    ]
  });
};
