import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';

const db = createClient({ url: process.env.DATABASE_URL ?? 'file:local.db', authToken: process.env.DATABASE_AUTH_TOKEN });
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function send(res, status, body) { res.status(status).json(body); }
function errorMessage(error) { return error instanceof Error ? error.message : '请求失败'; }

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await db.execute('SELECT id, date, description, amount, type, created_at AS createdAt FROM entries ORDER BY date DESC, created_at DESC');
      return send(res, 200, { entries: result.rows });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const date = body.date;
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      const amount = typeof body.amount === 'string' ? Number(body.amount) : body.amount;
      const type = body.type;
      if (!validDate(date)) return send(res, 400, { error: '日期格式无效，请使用 YYYY-MM-DD。' });
      if (!description) return send(res, 400, { error: '说明不能为空。' });
      if (description.length > 100) return send(res, 400, { error: '说明最多 100 个字符。' });
      if (!Number.isFinite(amount) || amount <= 0) return send(res, 400, { error: '金额必须是大于 0 的数字。' });
      if (!['income', 'expense'].includes(type)) return send(res, 400, { error: '类型必须是 income 或 expense。' });
      const normalizedAmount = Math.round(amount * 100) / 100;
      if (!Number.isFinite(normalizedAmount)) return send(res, 400, { error: '金额格式无效。' });
      const entry = { id: randomUUID(), date, description, amount: normalizedAmount, type, createdAt: Date.now() };
      await db.execute({ sql: 'INSERT INTO entries (id, date, description, amount, type, created_at) VALUES (?, ?, ?, ?, ?, ?)', args: [entry.id, entry.date, entry.description, entry.amount, entry.type, entry.createdAt] });
      return send(res, 201, { entry });
    }
    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (typeof id !== 'string' || !id) return send(res, 400, { error: '缺少要删除的记录 id。' });
      const result = await db.execute({ sql: 'DELETE FROM entries WHERE id = ?', args: [id] });
      if (!result.rowsAffected) return send(res, 404, { error: '记录不存在。' });
      return send(res, 200, { ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return send(res, 405, { error: '不支持的请求方法。' });
  } catch (error) {
    console.error(errorMessage(error));
    return send(res, 500, { error: '服务器暂时无法处理请求。' });
  }
}
