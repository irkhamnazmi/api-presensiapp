const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '../data/data.xlsx');

function loadSheets() {
  const wb = XLSX.readFile(filePath);
  const sheets = {
    teachers: XLSX.utils.sheet_to_json(wb.Sheets['teachers'] || []),
    students: XLSX.utils.sheet_to_json(wb.Sheets['students'] || []),
    presences: XLSX.utils.sheet_to_json(wb.Sheets['presences'] || [])
  };
  return { wb, sheets };
}

function saveSheet(sheetName, data) {
  const { wb } = loadSheets();
  const newSheet = XLSX.utils.json_to_sheet(data);
  wb.Sheets[sheetName] = newSheet;
  if (!wb.SheetNames.includes(sheetName)) wb.SheetNames.push(sheetName);
  XLSX.writeFile(wb, filePath);
}

module.exports = {
  loadSheets,
  saveSheet
};
