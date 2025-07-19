// utils/driverUploader.js

require('dotenv').config();
const { google } = require('googleapis');
const XLSX = require('xlsx');
const stream = require('stream');

// Ambil dari .env
const fileId = process.env.GOOGLE_DRIVE_FILE_ID;

// Setup autentikasi dari environment variable
const privateKey = Buffer.from(process.env.GOOGLE_PRIVATE_KEY_B64, 'base64').toString('utf8');

const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  

// Ambil client Google Drive
async function getDriveClient() {
  return google.drive({ version: 'v3', auth });
}

// Konversi buffer -> workbook
function bufferToWorkbook(buffer) {
  return XLSX.read(buffer, { type: 'buffer' });
}

// Konversi workbook -> buffer
function workbookToBuffer(workbook) {
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Ambil workbook dan data JSON dari Google Drive
async function loadSheets() {
  try {
    const drive = await getDriveClient();

    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(res.data);
    const wb = bufferToWorkbook(buffer);

    const getSheetData = (sheetName) =>
      wb.Sheets[sheetName]
        ? XLSX.utils.sheet_to_json(wb.Sheets[sheetName])
        : [];

    const sheets = {
      teachers: getSheetData('teachers'),
      students: getSheetData('students'),
      presences: getSheetData('presences'),
    };

    return { wb, sheets };
  } catch (err) {
      
    console.error('❌ Gagal loadSheets:', err.response?.data || err.message);
    throw err;
  }
}

// Simpan data JSON ke sheet dan upload ulang ke Google Drive
async function saveSheet(sheetName, data) {
  const drive = await getDriveClient();
  const { wb } = await loadSheets();

  const newSheet = XLSX.utils.json_to_sheet(data);
  wb.Sheets[sheetName] = newSheet;
  if (!wb.SheetNames.includes(sheetName)) wb.SheetNames.push(sheetName);

  const buffer = workbookToBuffer(wb);
  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  await drive.files.update({
    fileId,
    media: {
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: bufferStream,
    },
  });

  console.log(`✅ Sheet "${sheetName}" berhasil disimpan ke Google Drive`);
}

module.exports = {
  loadSheets,
  saveSheet,
};
