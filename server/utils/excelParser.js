const XLSX = require('xlsx');
exports.parseExcelBuffer = async (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = json[0];
  const rows = json.slice(1).filter(r => r.length > 0);
  return { headers, rows };
};