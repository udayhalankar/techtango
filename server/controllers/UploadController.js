const { parseExcelBuffer } = require('../utils/excelParser');
const pool = require('../../server/db');

 

// Utility: fetch column names from the table

const getTableColumns = async (table) => {

  const result = await pool.query(`

    SELECT column_name FROM information_schema.columns

    WHERE table_name = $1

    ORDER BY ordinal_position

  `, [table]);

 

  return result.rows.map(r => r.column_name);

};

 

exports.handleUpload = async (req, res) => {

  const table = req.params.tableName;

  const fileBuffer = req.file?.buffer;

 

  if (!fileBuffer) return res.status(400).json({ error: 'No file uploaded' });

 

  try {

    const { headers, rows } = await parseExcelBuffer(fileBuffer);

 

    if (!headers || rows.length < 2) {

      return res.status(400).json({ error: 'Excel must contain header, datatype, and data rows.' });

    }

 

    // Remove Row 2 (data types)

    const dataRows = rows.slice(1);

 

    // Fetch actual table columns from DB

    const validColumns = await getTableColumns(table);

 

    // Ensure all headers are valid columns

    const invalidCols = headers.filter(col => !validColumns.includes(col));

    if (invalidCols.length > 0) {

      return res.status(400).json({

        error: 'Invalid columns in Excel',

        invalidColumns: invalidCols,

      });

    }

 

    // Prepare INSERT query

    const placeholders = headers.map((_, i) => `$${i + 1}`).join(', ');

    const insertQuery = `INSERT INTO ${table} (${headers.join(',')}) VALUES (${placeholders})`;

 

    let insertedCount = 0;

 

    for (const row of dataRows) {

      // Skip completely empty rows

      if (row.every(cell => cell === undefined || cell === null || cell === '')) continue;

 

      await pool.query(insertQuery, row);

      insertedCount++;

    }

 

    res.json({ success: true, inserted: insertedCount });

  } catch (err) {

    console.error('Upload failed:', err);

    res.status(500).json({ error: 'Upload failed', message: err.message });

  }

};