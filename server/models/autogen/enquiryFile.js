const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('EnquiryFile', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    enquiryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'enquiries',
        key: 'id'
      },
      field: 'enquiry_id'
    },
    originalName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'original_name'
    },
    storedPath: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'stored_path'
    },
    ivHex: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'iv_hex'
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
    }
  }, {
    sequelize,
    tableName: 'enquiry_files',
    schema: 'public',
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "enquiry_files_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_enquiry_files_enquiry_id",
        fields: [
          { name: "enquiry_id" },
        ]
      },
    ]
  });
};
