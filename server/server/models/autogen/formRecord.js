const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('FormRecord', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    viewId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'view_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
    }
  }, {
    sequelize,
    tableName: 'form_records',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "form_records_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
