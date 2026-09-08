'use client';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  RotateCcw,
  MessageSquare,
  Check,
  Clock3,
  X,
  LogOut,
  LoaderCircle,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { ReactLenis } from 'lenis/react';
type Appeal = {
  id: string;
  nickname: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: number;
  decision?: string;
};
const examples: Appeal[] = [
  {
    id: 'demo-1',
    nickname: 'pixelwanderer',
    reason:
      'Перегнул с шутками в чате. Перечитал правила и понял, почему получил бан. Хочу вернуться, смотреть стримы и больше не портить атмосферу.',
    status: 'pending',
    created_at: 1788876000000,
  },
  {
    id: 'demo-2',
    nickname: 'tea_without_sugar',
    reason:
      'Написал спойлер, не подумав, что кто-то ещё не прошёл игру. Это было глупо. Обещаю внимательнее следить за тем, что отправляю в чат.',
    status: 'pending',
    created_at: 1788868800000,
  },
  {
    id: 'demo-3',
    nickname: 'just_lurking',
    reason:
      'Скинул одну и ту же ссылку несколько раз — думал, что сообщение не отправилось. Теперь понимаю, как это выглядело со стороны.',
    status: 'accepted',
    created_at: 1788782400000,
    decision: 'Апелляция одобрена. Пожалуйста, соблюдай правила чата.',
  },
  {
    id: 'demo-4',
    nickname: 'neon_raccoon',
    reason:
      'Сорвался во время спора с другим зрителем. Извиняюсь перед чатом и модераторами. Хотел бы получить ещё одну возможность.',
    status: 'rejected',
    created_at: 1788696000000,
    decision:
      'Повторное нарушение правил. Решение о блокировке остаётся в силе.',
  },
];
const statuses = {
  pending: 'На рассмотрении',
  accepted: 'Одобрена',
  rejected: 'Отклонена',
};
const filters = [
  { id: 'all', label: 'Все апелляции' },
  { id: 'pending', label: 'На рассмотрении' },
  { id: 'accepted', label: 'Одобрены' },
  { id: 'rejected', label: 'Отклонены' },
];
function Status({ status }: { status: Appeal['status'] }) {
  const Icon =
    status === 'pending' ? Clock3 : status === 'accepted' ? Check : X;
  return (
    <span className={`status ${status}`}>
      <Icon size="0.8125rem" />
      {statuses[status]}
    </span>
  );
}
export default function AppealApp({
  signedIn,
  signInUrl,
}: {
  signedIn: boolean;
  signInUrl: string;
}) {
  const [items, setItems] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'form' | 'login' | 'rules' | null>(null);
  const [selected, setSelected] = useState<Appeal | null>(null);
  const [nickname, setNickname] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  async function refresh() {
    setLoading(true);
    setLoadError('');
    try {
      const r = await fetch('/api/appeals');
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { appeals: Appeal[] };
      setItems(d.appeals);
    } catch {
      setLoadError('Не удалось загрузить апелляции. Попробуй ещё раз.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    if (signedIn && new URLSearchParams(window.location.search).has('compose'))
      setModal('form');
  }, [signedIn]);
  function compose() {
    setSuccess(false);
    setError('');
    setModal(signedIn ? 'form' : 'login');
  }
  const isDemo = items.length === 0;
  const shown = isDemo ? examples : items;
  const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU');
  const searched = normalizedSearch
    ? shown.filter((appeal) =>
        appeal.nickname.toLocaleLowerCase('ru-RU').includes(normalizedSearch),
      )
    : shown;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          reason: reason.trim(),
        }),
      });
      const d = (await r.json()) as { appeal: Appeal; error?: string };
      if (!r.ok) throw new Error(d.error || 'Не удалось отправить апелляцию.');
      setItems((old) => [d.appeal, ...old]);
      setFilter('all');
      setSearch('');
      setSuccess(true);
      setNickname('');
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Попробуй ещё раз.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'start_appeal',
            title: 'Начать апелляцию',
            description:
              'Открыть форму апелляции или вход. Не отправляет заявку.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: (input: unknown) => {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Ожидается пустой объект.');
              setSuccess(false);
              setError('');
              setModal(signedIn ? 'form' : 'login');
              return { opened: signedIn ? 'form' : 'login' };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Unsupported browser */
    }
    return () => lifecycle.abort();
  }, [signedIn]);
  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        anchors: true,
        lerp: 0.09,
        wheelMultiplier: 0.9,
      }}
    >
      <div className="site-shell">
        <header className="header wrap">
          <a className="brand" href="/" aria-label="141 — главная">
            141
          </a>
          <nav aria-label="Главное меню">
            <a className="nav-active" href="#appeals">
              Апелляции
            </a>
            <button onClick={() => setModal('rules')}>
              Как это работает <ArrowUpRight size="0.8125rem" />
            </button>
          </nav>
          {signedIn ? (
            <a
              className="login-button"
              href="/signout-with-chatgpt?return_to=%2F"
              target="_top"
            >
              <span className="online-dot" />
              Выйти <LogOut size="0.9375rem" />
            </a>
          ) : (
            <button className="login-button" onClick={() => setModal('login')}>
              Войти <ArrowUpRight size="1rem" />
            </button>
          )}
        </header>
        <main>
          <section className="hero wrap" aria-labelledby="hero-title">
            <div className="hero-main">
              <h1 id="hero-title">
                Бан — не
                <br />
                <span>конец истории.</span>
              </h1>
              <p className="hero-copy">
                Все ошибаются. Расскажи, что произошло,
                <br className="desktop-break" /> и почему тебе стоит вернуться в
                чат.
              </p>
              <div className="hero-actions">
                <button className="primary" onClick={compose}>
                  Подать апелляцию <ArrowUpRight size="1.1875rem" />
                </button>
                <a className="text-button" href="#appeals">
                  Смотреть апелляции <ArrowDown size="1rem" />
                </a>
              </div>
            </div>
            <aside className="how-it-works">
              <div className="aside-label">
                ТВОЙ ПУТЬ ОБРАТНО В ЧАТ <ArrowUpRight size="1rem" />
              </div>
              <div className="step">
                <span className="step-no">01</span>
                <div>
                  <h2>Авторизуйся</h2>
                  <p>Чтобы мы знали, кто ты.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-no">02</span>
                <div>
                  <h2>Расскажи свою историю</h2>
                  <p>Честно, спокойно и по делу.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-no">03</span>
                <div>
                  <h2>Дождись решения</h2>
                  <p>Последнее слово — за стримером.</p>
                </div>
              </div>
              <div className="aside-note">
                <MessageSquare size="0.9375rem" />
                На той стороне тоже человек.
              </div>
            </aside>
          </section>
          <div className="appeals-band">
            <section
              className="appeals-section wrap"
              id="appeals"
              aria-labelledby="appeals-heading"
            >
              <div className="section-heading">
                <div className="heading-group">
                  <h2 id="appeals-heading">Апелляции сообщества</h2>
                </div>
                <span className="list-note">
                  {isDemo ? 'Примеры заявок' : `Всего: ${items.length}`}
                </span>
              </div>
              {loadError && (
                <div className="load-error" role="alert">
                  {loadError}
                  <button onClick={refresh}>
                    Повторить <RotateCcw size="0.875rem" />
                  </button>
                </div>
              )}
              <Tabs value={filter} onValueChange={(v) => setFilter(String(v))}>
                <div className="filter-bar">
                  <label className="nickname-search">
                    <Search size="1.25rem" aria-hidden="true" />
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Поиск по нику"
                      aria-label="Поиск апелляций по нику"
                    />
                  </label>
                  <TabsList
                    variant="line"
                    className="status-tabs"
                    aria-label="Статус апелляций"
                  >
                    {filters.map((f) => (
                      <TabsTrigger value={f.id} key={f.id}>
                        {f.label}
                        <span className="tab-count">
                          {
                            searched.filter(
                              (a) => f.id === 'all' || a.status === f.id,
                            ).length
                          }
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <span className="sort-label">
                    Сортировка <ArrowDown size="0.8125rem" />
                  </span>
                </div>
                {filters.map((f) => (
                  <TabsContent value={f.id} key={f.id}>
                    <div className="appeal-grid" aria-busy={loading}>
                      {searched
                        .filter((a) => f.id === 'all' || a.status === f.id)
                        .map((a, i) => (
                          <button
                            className="appeal-card"
                            key={a.id}
                            onClick={() => setSelected(a)}
                            aria-label={`Апелляция ${a.nickname}: ${statuses[a.status]}`}
                          >
                            <div className="card-top">
                              <span className="card-number">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span className="card-open" aria-hidden="true">
                                <ArrowUpRight size="1.5rem" />
                              </span>
                            </div>
                            <div className="card-copy">
                              <Status status={a.status} />
                              <h3 className="nickname">{a.nickname}</h3>
                              <p className="appeal-reason">{a.reason}</p>
                              <div className="card-bottom">
                                <span>
                                  {new Date(a.created_at).toLocaleDateString(
                                    'ru-RU',
                                    {
                                      day: 'numeric',
                                      month: 'long',
                                      timeZone: 'Europe/Moscow',
                                    },
                                  )}
                                  {isDemo && ' · пример'}
                                </span>
                                <span className="card-link">Подробнее</span>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                    {searched.filter((a) => f.id === 'all' || a.status === f.id)
                      .length === 0 && (
                      <Empty className="empty-state">
                        <EmptyHeader>
                          <MessageSquare />
                          <EmptyTitle>
                            {normalizedSearch
                              ? 'Ник не найден'
                              : 'Здесь пока тихо'}
                          </EmptyTitle>
                          <EmptyDescription>
                            {normalizedSearch
                              ? 'Проверь написание ника или очисти поиск.'
                              : 'Апелляций с таким статусом ещё нет.'}
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
              <div className="list-footer">
                <span>
                  <span className="tiny-dot" />
                  {isDemo
                    ? 'Это демонстрационные истории. Твоя заявка появится здесь после отправки.'
                    : 'Каждая история заслуживает внимания.'}
                </span>
                <button onClick={compose}>
                  Твоя история ещё не здесь? <ArrowRight size="1rem" />
                </button>
              </div>
            </section>
          </div>
        </main>
        <footer className="footer wrap">
          <a className="footer-brand" href="/" aria-label="141 — главная">
            141
          </a>
          <span className="footer-end">
            Сделано для сообщества <span className="lime">↗</span>
          </span>
        </footer>
        <Dialog
          open={modal !== null}
          onOpenChange={(open) => {
            if (!open && !busy) setModal(null);
          }}
        >
          <DialogContent
            className="site-modal"
            showCloseButton={!busy}
            data-lenis-prevent
          >
            {modal === 'login' && (
              <>
                <span className="modal-icon">
                  <RotateCcw />
                </span>
                <DialogTitle>Начнём со знакомства</DialogTitle>
                <DialogDescription>
                  Войди, чтобы подать апелляцию и сохранить свою заявку.
                </DialogDescription>
                <a className="primary full" href={signInUrl} target="_top">
                  Войти через ChatGPT <ArrowUpRight size="1.125rem" />
                </a>
                <p className="form-note">
                  В этой версии вход работает через ChatGPT. Подключение Twitch
                  пока не настроено; ник ты укажешь в заявке.
                </p>
              </>
            )}
            {modal === 'rules' && (
              <>
                <span className="eyebrow">ПЕРЕД ОТПРАВКОЙ</span>
                <DialogTitle>Второй шанс начинается с диалога</DialogTitle>
                <DialogDescription>
                  Апелляция — возможность объяснить ситуацию.
                </DialogDescription>
                <ol className="rules">
                  <li>Укажи ник, под которым тебя заблокировали.</li>
                  <li>
                    Расскажи, за что получил бан и почему просишь его снять.
                  </li>
                  <li>
                    Пиши уважительно. Не отправляй личные данные: текст заявки
                    виден другим посетителям.
                  </li>
                  <li>
                    Дождись решения. Одобрение заявки само по себе пока не
                    снимает бан в Twitch.
                  </li>
                </ol>
                <button className="primary full" onClick={compose}>
                  Всё понятно, подать апелляцию{' '}
                  <ArrowUpRight size="1.0625rem" />
                </button>
              </>
            )}
            {modal === 'form' &&
              (success ? (
                <>
                  <span className="modal-icon">
                    <Check />
                  </span>
                  <DialogTitle>Твоя история отправлена</DialogTitle>
                  <DialogDescription>
                    Апелляция сохранена и появилась в списке со статусом «На
                    рассмотрении».
                  </DialogDescription>
                  <button
                    className="primary full"
                    onClick={() => {
                      setModal(null);
                      document
                        .getElementById('appeals')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    К апелляциям <ArrowRight size="1.125rem" />
                  </button>
                </>
              ) : (
                <>
                  <span className="eyebrow">ТВОЙ ВТОРОЙ ШАНС</span>
                  <DialogTitle>Расскажи свою историю</DialogTitle>
                  <DialogDescription>
                    Спокойно объясни, что произошло и почему хочешь вернуться.
                  </DialogDescription>
                  <form onSubmit={submit} className="appeal-form">
                    <label htmlFor="nickname">
                      Ник в Twitch
                      <input
                        id="nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        required
                        minLength={2}
                        maxLength={25}
                        pattern="[a-zA-Z0-9_]{2,25}"
                        autoComplete="username"
                        placeholder="Твой ник, без @"
                      />
                      <span className="form-hint">
                        Латинские буквы, цифры и подчёркивание.
                      </span>
                    </label>
                    <label htmlFor="reason">
                      Причина апелляции
                      <textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                        minLength={20}
                        maxLength={1500}
                        rows={5}
                        placeholder="За что тебя забанили? Что изменилось с тех пор?"
                      />
                      <span className="field-meta">
                        <span>Не меньше 20 символов</span>
                        <span>{reason.length} / 1500</span>
                      </span>
                    </label>
                    <p className="form-note">
                      Ник и текст будут видны в списке апелляций. Не указывай
                      личные данные. Ник Twitch пока не подтверждён.
                    </p>
                    {error && (
                      <p role="alert" className="form-error">
                        {error}
                      </p>
                    )}
                    <button
                      className="primary full"
                      type="submit"
                      disabled={busy}
                    >
                      {busy ? (
                        <>
                          <LoaderCircle className="spin" size="1.125rem" />
                          Отправляем…
                        </>
                      ) : (
                        <>
                          Отправить апелляцию <ArrowUpRight size="1.125rem" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              ))}
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        >
          <DialogContent className="site-modal" data-lenis-prevent>
            {selected && (
              <>
                <Status status={selected.status} />
                <DialogTitle>{selected.nickname}</DialogTitle>
                <DialogDescription>
                  {selected.id.startsWith('demo-')
                    ? 'Демонстрационная апелляция'
                    : 'Апелляция на разбан'}{' '}
                  · {new Date(selected.created_at).toLocaleDateString('ru-RU')}
                </DialogDescription>
                <p className="full-reason">{selected.reason}</p>
                {selected.decision && (
                  <div className="decision">
                    <span>Решение по заявке</span>
                    <p>{selected.decision}</p>
                  </div>
                )}
                {selected.status === 'pending' && (
                  <p className="form-note">Заявка ожидает рассмотрения.</p>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ReactLenis>
  );
}
