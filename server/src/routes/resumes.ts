import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { assertUuid, asyncH, HttpError, parse, uid } from '../lib/http.js';
import { ALLOWED_MIME, analyzeResume, buildImprovedDocx, extractResumeText, type ResumeAnalysis } from '../services/resume.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype] || /\.(pdf|docx)$/i.test(file.originalname)) cb(null, true);
    else cb(new HttpError(415, 'Only PDF and DOCX resumes are supported'));
  },
});
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: config.nodeEnv === 'test' ? 1000 : 20, message: { error: 'Too many resume operations – try again shortly.' } });

router.get(
  '/',
  asyncH(async (req, res) => {
    const db = await getDb();
    const rows = await db.query(
      `SELECT r.id, r.filename, r.mime_type, r.size_bytes, r.created_at, length(r.extracted_text)::int AS text_length,
              (SELECT json_build_object('id', a.id, 'ats_score', a.ats_score, 'match_score', a.match_score, 'created_at', a.created_at)
                 FROM resume_analysis a WHERE a.resume_id=r.id ORDER BY a.created_at DESC LIMIT 1) AS latest_analysis
         FROM resumes r WHERE r.user_id=$1 ORDER BY r.created_at DESC`,
      [uid(req)],
    );
    res.json({ resumes: rows });
  }),
);

router.post(
  '/',
  limiter,
  upload.single('file'),
  asyncH(async (req, res) => {
    const f = req.file;
    if (!f) throw new HttpError(400, 'Attach a PDF or DOCX file in the "file" field');
    const kind = ALLOWED_MIME[f.mimetype] ?? (/\.pdf$/i.test(f.originalname) ? 'pdf' : 'docx');
    let text: string;
    try {
      text = await extractResumeText(f.buffer, kind);
    } catch (e) {
      throw new HttpError(422, `Could not read the resume: ${(e as Error).message}`);
    }
    if (text.length < 50) throw new HttpError(422, 'No readable text found – scanned/image PDFs are not supported. Export your resume as a text-based PDF or DOCX.');
    const db = await getDb();
    const safeName = f.originalname.replace(/[^\w.\- ()]/g, '_').slice(0, 120);
    const [row] = await db.query(
      `INSERT INTO resumes (user_id, filename, mime_type, size_bytes, file_data, extracted_text) VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, filename, mime_type, size_bytes, created_at`,
      [uid(req), safeName, kind === 'pdf' ? 'application/pdf' : ALLOWED_MIME_DOCX, f.size, f.buffer, text],
    );
    res.status(201).json({ resume: row, preview: text.slice(0, 600) });
  }),
);
const ALLOWED_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function ownResume(userId: string, id: string) {
  const db = await getDb();
  const [r] = await db.query('SELECT * FROM resumes WHERE id=$1 AND user_id=$2', [assertUuid(id), userId]);
  if (!r) throw new HttpError(404, 'Resume not found');
  return r;
}

router.post(
  '/:id/analyze',
  limiter,
  asyncH(async (req, res) => {
    const { jobDescription } = parse(z.object({ jobDescription: z.string().max(20000).optional().nullable() }), req.body ?? {});
    const r = await ownResume(uid(req), String(req.params.id));
    const db = await getDb();
    const [p] = await db.query('SELECT full_name, current_role_title FROM user_profiles WHERE user_id=$1', [uid(req)]);
    const analysis = await analyzeResume(r.extracted_text, jobDescription?.trim() || null, { fullName: p?.full_name, currentRole: p?.current_role_title });
    const [row] = await db.query(
      `INSERT INTO resume_analysis (resume_id, user_id, job_description, match_score, ats_score, result, evaluator) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
      [r.id, uid(req), jobDescription?.trim() || null, analysis.jobMatch?.score ?? null, analysis.atsScore, JSON.stringify(analysis), analysis.evaluator],
    );
    res.json({ id: row.id, createdAt: row.created_at, analysis });
  }),
);

router.get(
  '/:id/analyses',
  asyncH(async (req, res) => {
    const r = await ownResume(uid(req), String(req.params.id));
    const db = await getDb();
    const rows = await db.query('SELECT id, job_description, match_score, ats_score, result, evaluator, created_at FROM resume_analysis WHERE resume_id=$1 ORDER BY created_at DESC LIMIT 20', [r.id]);
    res.json({ analyses: rows });
  }),
);

router.get(
  '/:id/file',
  asyncH(async (req, res) => {
    const r = await ownResume(uid(req), String(req.params.id));
    res.setHeader('Content-Type', r.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${r.filename.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(Buffer.from(r.file_data));
  }),
);

router.get(
  '/analyses/:analysisId/improved.docx',
  asyncH(async (req, res) => {
    const db = await getDb();
    const [a] = await db.query(
      `SELECT a.result, r.extracted_text, r.filename, u.email, p.full_name FROM resume_analysis a JOIN resumes r ON r.id=a.resume_id
         JOIN users u ON u.id=a.user_id JOIN user_profiles p ON p.user_id=a.user_id WHERE a.id=$1 AND a.user_id=$2`,
      [assertUuid(String(req.params.analysisId)), uid(req)],
    );
    if (!a) throw new HttpError(404, 'Analysis not found');
    const buf = await buildImprovedDocx(a.extracted_text, a.result as ResumeAnalysis, a.full_name, a.email);
    res.setHeader('Content-Type', ALLOWED_MIME_DOCX);
    res.setHeader('Content-Disposition', `attachment; filename="improved-${a.filename.replace(/\.(pdf|docx)$/i, '').replace(/"/g, '')}.docx"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buf);
  }),
);

router.delete(
  '/:id',
  asyncH(async (req, res) => {
    const r = await ownResume(uid(req), String(req.params.id));
    await (await getDb()).query('DELETE FROM resumes WHERE id=$1', [r.id]);
    res.json({ ok: true });
  }),
);

export default router;
