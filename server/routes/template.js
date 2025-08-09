const express = require('express');

const ExcelJS = require('exceljs');

const pool = require('../db');

const router = express.Router();

 

router.get('/:tableName', async (req, res) => {

  const { tableName } = req.params;

 

  try {

    // Fetch table structure

    const result = await pool.query(`

      SELECT column_name, data_type, column_default

      FROM information_schema.columns

      WHERE table_name = $1

      ORDER BY ordinal_position;

    `, [tableName]);

 

    // Filter out auto-increment (like 'id SERIAL')

    const columns = result.rows.filter(col =>

      !col.column_default || !col.column_default.includes('nextval')

    );

 

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet('Template');

 

    const headers = columns.map(c => c.column_name);

    const types = columns.map(c => c.data_type);

 

    sheet.addRow(headers);

    sheet.addRow(types);

 

    // Lock first two rows

    sheet.getRow(1).eachCell(cell => cell.protection = { locked: true });

    sheet.getRow(2).eachCell(cell => cell.protection = { locked: true });

 

    // Unlock input rows (3+), add validation based on data_type

    for (let row = 3; row <= 1000; row++) {

      columns.forEach((col, colIndex) => {

        const cell = sheet.getCell(row, colIndex + 1);

        cell.protection = { locked: false };

 

        if (col.data_type.includes('int')) {

          cell.dataValidation = {

            type: 'whole',

            operator: 'between',

            formula1: '0',

            formula2: '1000000000',

            showErrorMessage: true,

            error: 'Only numbers allowed',

          };

        } else if (col.data_type === 'date') {

          cell.dataValidation = {

            type: 'date',

            operator: 'greaterThan',

            formula1: '1/1/1900',

            showErrorMessage: true,

            error: 'Enter a valid date',

          };

        } else if (col.data_type === 'text') {

          cell.dataValidation = {

            type: 'textLength',

            operator: 'lessThanOrEqual',

            formula1: '255',

            showErrorMessage: true,

            error: 'Max 255 characters allowed',

          };

        }

      });

    }

 

    // Lock sheet but allow user input in unlocked cells

    sheet.protect('readonly', {

      selectLockedCells: true,

      selectUnlockedCells: true,

    });

 

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.setHeader('Content-Disposition', `attachment; filename=${tableName}_template.xlsx`);

    await workbook.xlsx.write(res);

    res.end();

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: 'Failed to generate template', message: err.message });

  }

});

 

module.exports = router;