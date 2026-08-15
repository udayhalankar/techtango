const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ApprovalFile', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    approvalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'approvals',
        key: 'id'
      },
      field: 'approval_id'
    },
    originalFilename: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'original_filename'
    },
    encryptedPath: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'encrypted_path'
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'uploaded_by'
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'uploaded_at'
    },
    iv: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    refTable: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'ref_table'
    },
    refTableId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'ref_table_id'
    }
  }, {
    sequelize,
    tableName: 'approval_files',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "approval_files_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
