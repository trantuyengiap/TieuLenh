import ExcelJS from 'exceljs';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/auth.js';
import { createHttpError } from '../utils/httpError.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

async function exportData() {
  const [users, employees, commandSets, sessions, results, appSettings] = await Promise.all([
    prisma.user.findMany(),
    prisma.employee.findMany(),
    prisma.commandSet.findMany({ include: { items: true } }),
    prisma.drillSession.findMany(),
    prisma.sessionResult.findMany(),
    prisma.appSetting.findMany(),
  ]);

  return { users, employees, commandSets, sessions, results, appSettings };
}

router.get('/export', requireRole('SUPERADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    const format = req.query.format || 'json';
    const data = await exportData();

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      Object.entries(data).forEach(([sheetName, rows]) => {
        const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
        if (!rows.length) {
          sheet.addRow(['No data']);
          return;
        }
        const headers = Object.keys(rows[0]);
        sheet.addRow(headers);
        rows.forEach((row) => sheet.addRow(headers.map((header) => JSON.stringify(row[header] ?? ''))));
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="tieulenh-export.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/import', requireRole('SUPERADMIN', 'ADMIN'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw createHttpError(400, 'Missing import file');
    }

    let payload;
    if (req.file.mimetype.includes('json')) {
      payload = JSON.parse(req.file.buffer.toString('utf8'));
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      payload = {};
      workbook.worksheets.forEach((sheet) => {
        const rows = [];
        const headers = sheet.getRow(1).values.slice(1);
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const raw = {};
          headers.forEach((header, index) => {
            const value = row.getCell(index + 1).value;
            try {
              raw[header] = typeof value === 'string' ? JSON.parse(value) : value;
            } catch {
              raw[header] = value;
            }
          });
          rows.push(raw);
        });
        payload[sheet.name] = rows;
      });
    }

    await prisma.$transaction(async (tx) => {
      if (payload.employees?.length) {
        for (const employee of payload.employees) {
          await tx.employee.upsert({
            where: { employeeCode: employee.employeeCode },
            update: {
              fullName: employee.fullName,
              rank: employee.rank || null,
              position: employee.position || null,
              department: employee.department || null,
              notes: employee.notes || null,
            },
            create: {
              employeeCode: employee.employeeCode,
              fullName: employee.fullName,
              rank: employee.rank || null,
              position: employee.position || null,
              department: employee.department || null,
              notes: employee.notes || null,
            },
          });
        }
      }
    });

    res.json({ message: 'Import completed. Current implementation imports employees and is ready for legacy JSON extension.' });
  } catch (error) {
    next(createHttpError(400, 'Failed to import data', error.message));
  }
});

export default router;
