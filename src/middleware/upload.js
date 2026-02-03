const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    const base = (file.originalname && path.basename(file.originalname, path.extname(file.originalname)))
      ? path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40)
      : '';
    const name = base ? `${Date.now()}-${base}${ext}` : `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

// Images: jpeg, png, gif, webp. Documents: pdf, doc, docx, xls, xlsx, txt, csv, etc.
const IMAGE_MIMES = /^image\/(jpeg|png|gif|webp)$/;
const DOC_MIMES = [
  'application/pdf',
  'application/msword',                                                                 // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',            // .docx
  'application/vnd.ms-excel',                                                             // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                   // .xlsx
  'text/plain',
  'text/csv',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',                                             // .odt
  'application/vnd.oasis.opendocument.spreadsheet',                                      // .ods
  // Some systems report docx/xlsx as zip
  'application/zip',
  'application/x-zip-compressed',
];
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.rtf', '.odt', '.ods'];

function isAllowedMime(mimetype) {
  if (IMAGE_MIMES.test(mimetype)) return true;
  if (DOC_MIMES.includes(mimetype)) return true;
  return false;
}

function isAllowedExtension(filename) {
  if (!filename || typeof filename !== 'string') return false;
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXT.includes(ext);
}

const fileFilter = (req, file, cb) => {
  if (isAllowedMime(file.mimetype)) return cb(null, true);
  // Allow by extension when MIME is wrong (e.g. docx reported as application/zip)
  if (file.fieldname === 'attachments' && isAllowedExtension(file.originalname)) return cb(null, true);
  cb(new Error('Allowed: images (jpeg, png, gif, webp) and documents (pdf, doc, docx, xls, xlsx, txt, csv, rtf, odt, ods).'), false);
};

const limits = { fileSize: 10 * 1024 * 1024 }; // 10MB per file

const upload = multer({ storage, fileFilter, limits });

// For create: accept both 'images' and 'attachments' (images in images, documents in attachments)
const uploadProjectFiles = multer({
  storage,
  fileFilter,
  limits,
}).fields([
  { name: 'images', maxCount: 20 },
  { name: 'attachments', maxCount: 10 },
]);

module.exports = { upload, uploadProjectFiles };
