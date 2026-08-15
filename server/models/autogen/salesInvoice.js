const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('SalesInvoice', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    invoiceNumber: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'invoice_number'
    },
    customerRef: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'customer_ref'
    },
    invoiceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'invoice_date'
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'due_date'
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "draft"
    },
    currency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: "USD"
    },
    subtotal: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    discountAmount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
      field: 'discount_amount'
    },
    taxAmount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
      field: 'tax_amount'
    },
    totalAmount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      field: 'total_amount'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'created_by'
    },
    modifiedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'modified_by'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'sales_invoices',
    schema: 'public',
    hasTrigger: true,
    timestamps: false,
    underscored: true,
    freezeTableName: false,
    indexes: [
      {
        name: "ix_sales_invoices_customer_ref",
        fields: [
          { name: "customer_ref" },
        ]
      },
      {
        name: "ix_sales_invoices_invoice_date",
        fields: [
          { name: "invoice_date" },
        ]
      },
      {
        name: "ix_sales_invoices_status",
        fields: [
          { name: "status" },
        ]
      },
      {
        name: "sales_invoices_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "ux_sales_invoices_invoice_number",
        unique: true,
        fields: [
          { name: "invoice_number" },
        ]
      },
    ]
  });
};
