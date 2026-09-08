import { getChatGPTUser } from '@/app/chatgpt-auth';
import { appealsDb } from '@/lib/appeals-db';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const { results } = await appealsDb().prepare('SELECT id, nickname, reason, status, created_at, decision FROM appeals ORDER BY created_at DESC LIMIT 100').all();
    return Response.json({ appeals: results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Не удалось загрузить апелляции.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: 'Недопустимый источник запроса.' }, { status: 403 });
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Войди, чтобы подать апелляцию.' }, { status: 401 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'Ожидается JSON.' }, { status: 415 });
  const raw = await request.text();
  if (raw.length > 12000) return Response.json({ error: 'Заявка слишком длинная.' }, { status: 413 });
  let data;
  try { data = JSON.parse(raw); } catch { return Response.json({ error: 'Некорректная заявка.' }, { status: 400 }); }
  const nickname = typeof data?.nickname === 'string' ? data.nickname.trim() : '';
  const reason = typeof data?.reason === 'string' ? data.reason.trim() : '';
  if (!/^[a-zA-Z0-9_]{2,25}$/.test(nickname)) return Response.json({ error: 'Ник: от 2 до 25 латинских букв, цифр или подчёркиваний.' }, { status: 400 });
  if (reason.length < 20 || reason.length > 1500) return Response.json({ error: 'Причина должна содержать от 20 до 1500 символов.' }, { status: 400 });
  const appeal = { id: crypto.randomUUID(), nickname, reason, status: 'pending', created_at: Date.now() };
  try {
    const result = await appealsDb().prepare("INSERT INTO appeals (id, user_id, nickname, reason, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?) ON CONFLICT DO NOTHING").bind(appeal.id, user.userId, nickname, reason, appeal.created_at).run();
    if (!result.meta.changes) return Response.json({ error: 'У тебя уже есть апелляция на рассмотрении. Дождись решения.' }, { status: 409 });
    return Response.json({ appeal }, { status: 201 });
  } catch { return Response.json({ error: 'Не удалось сохранить апелляцию. Попробуй ещё раз.' }, { status: 503 }); }
}
