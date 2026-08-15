const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Todo', {
    todoId: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'todo_id'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    assignto: {
      type: DataTypes.STRING,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'updated_at'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by'
    },
    modifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'modified_by'
    }
  }, {
    sequelize,
    tableName: 'todo',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "todo_pkey",
        unique: true,
        fields: [
          { name: "todo_id" },
        ]
      },
    ]
  });
};
