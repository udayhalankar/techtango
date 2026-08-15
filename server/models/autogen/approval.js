const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Approval', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    assignee: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assignedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'assigned_by'
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'due_date'
    },
    files: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true
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
    },
    filePaths: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      field: 'file_paths'
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "New"
    },
    fileIvs: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      field: 'file_ivs'
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assigneeComments: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'assignee_comments'
    }
  }, {
    sequelize,
    tableName: 'approvals',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "approvals_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
