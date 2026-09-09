'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  ArrowUpRight,
  ArrowLeft,
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
  ShieldCheck,
  UserRound,
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
import InteractiveGrid from '@/components/interactive-grid';
import { ReactLenis } from 'lenis/react';
type Appeal = {
  id: string;
  nickname: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: number;
  decision?: string;
  decision_reason?: string;
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
const STATIC_APPEALS_KEY = 'appeals-141';
const STATIC_AUTH_KEY = 'appeals-141-signed-in';
const STATIC_ROLE_KEY = 'appeals-141-role';
type StaticRole = 'guest' | 'admin';
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
  staticMode = false,
}: {
  signedIn: boolean;
  signInUrl: string;
  staticMode?: boolean;
}) {
  const [items, setItems] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'form' | 'login' | 'rules' | null>(null);
  const [selected, setSelected] = useState<Appeal | null>(null);
  const [slideDirection, setSlideDirection] = useState<'next' | 'previous'>(
    'next',
  );
  const [nickname, setNickname] = useState('');
  const [reason, setReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [staticRole, setStaticRole] = useState<StaticRole | null>(null);
  const userSignedIn = staticMode ? staticRole !== null : signedIn;
  const isAdmin = staticMode && staticRole === 'admin';
  async function refresh() {
    setLoading(true);
    setLoadError('');
    if (staticMode) {
      try {
        const savedRole = localStorage.getItem(STATIC_ROLE_KEY);
        if (savedRole === 'guest' || savedRole === 'admin') {
          setStaticRole(savedRole);
        } else if (localStorage.getItem(STATIC_AUTH_KEY) === 'true') {
          setStaticRole('guest');
          localStorage.setItem(STATIC_ROLE_KEY, 'guest');
        }
        const saved = localStorage.getItem(STATIC_APPEALS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Appeal[];
          if (Array.isArray(parsed)) {
            const savedIds = new Set(parsed.map((appeal) => appeal.id));
            setItems([
              ...parsed,
              ...examples.filter((appeal) => !savedIds.has(appeal.id)),
            ]);
          }
        } else setItems(examples);
      } catch {
        setLoadError('Не удалось прочитать локальные апелляции.');
      } finally {
        setLoading(false);
      }
      return;
    }
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
    if (
      userSignedIn &&
      new URLSearchParams(window.location.search).has('compose')
    )
      setModal('form');
  }, [signedIn, staticMode, userSignedIn]);
  function compose() {
    setSuccess(false);
    setError('');
    setModal(userSignedIn ? 'form' : 'login');
  }
  function signInStatic(role: StaticRole) {
    localStorage.setItem(STATIC_AUTH_KEY, 'true');
    localStorage.setItem(STATIC_ROLE_KEY, role);
    setStaticRole(role);
    setModal(role === 'guest' ? 'form' : null);
  }
  function signOutStatic() {
    localStorage.removeItem(STATIC_AUTH_KEY);
    localStorage.removeItem(STATIC_ROLE_KEY);
    setStaticRole(null);
  }
  const isDemo = staticMode || items.length === 0;
  const shown = useMemo(
    () => (staticMode ? items : isDemo ? examples : items),
    [isDemo, items, staticMode],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU');
  const searched = useMemo(
    () =>
      normalizedSearch
        ? shown.filter((appeal) =>
            appeal.nickname
              .toLocaleLowerCase('ru-RU')
              .includes(normalizedSearch),
          )
        : shown,
    [normalizedSearch, shown],
  );
  const carouselItems = useMemo(
    () =>
      searched.filter((appeal) => filter === 'all' || appeal.status === filter),
    [filter, searched],
  );
  const selectedIndex = selected
    ? carouselItems.findIndex((appeal) => appeal.id === selected.id)
    : -1;
  const previousAppeal =
    selectedIndex >= 0 && carouselItems.length > 1
      ? carouselItems[
          (selectedIndex - 1 + carouselItems.length) % carouselItems.length
        ]
      : null;
  const nextAppeal =
    selectedIndex >= 0 && carouselItems.length > 1
      ? carouselItems[(selectedIndex + 1) % carouselItems.length]
      : null;

  const navigateAppeal = useCallback(
    (direction: 'next' | 'previous') => {
      if (selectedIndex < 0 || carouselItems.length < 2) return;
      const offset = direction === 'next' ? 1 : -1;
      const targetIndex =
        (selectedIndex + offset + carouselItems.length) % carouselItems.length;
      const targetAppeal = carouselItems[targetIndex];
      setSlideDirection(direction);
      setRejectionReason(targetAppeal.decision_reason ?? '');
      setSelected(targetAppeal);
    },
    [carouselItems, selectedIndex],
  );

  useEffect(() => {
    if (!selected || carouselItems.length < 2) return;
    function handleCarouselKeys(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateAppeal('previous');
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateAppeal('next');
      }
    }
    window.addEventListener('keydown', handleCarouselKeys);
    return () => window.removeEventListener('keydown', handleCarouselKeys);
  }, [selected, carouselItems.length, navigateAppeal]);

  function moderateSelected(status: Appeal['status']) {
    if (!isAdmin || !selected) return;
    const updatedAppeal: Appeal = {
      ...selected,
      status,
      decision:
        status === 'accepted'
          ? 'Апелляция одобрена. Пользователя можно разбанить.'
          : status === 'rejected'
            ? 'Апелляция отклонена. Блокировка остаётся в силе.'
            : undefined,
      decision_reason:
        status === 'rejected' && rejectionReason.trim()
          ? rejectionReason.trim()
          : undefined,
    };
    setItems((old) => {
      const source = old.length ? old : examples;
      const next = source.map((appeal) =>
        appeal.id === selected.id ? updatedAppeal : appeal,
      );
      localStorage.setItem(STATIC_APPEALS_KEY, JSON.stringify(next));
      return next;
    });
    if (filter !== 'all' && filter !== status) {
      if (nextAppeal) {
        setSlideDirection('next');
        setRejectionReason(nextAppeal.decision_reason ?? '');
        setSelected(nextAppeal);
      } else {
        setRejectionReason('');
        setSelected(null);
      }
      return;
    }
    setRejectionReason(updatedAppeal.decision_reason ?? '');
    setSelected(updatedAppeal);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    if (staticMode) {
      const appeal: Appeal = {
        id: crypto.randomUUID(),
        nickname: nickname.trim(),
        reason: reason.trim(),
        status: 'pending',
        created_at: Date.now(),
      };
      try {
        setItems((old) => {
          const next = [appeal, ...(old.length ? old : examples)];
          localStorage.setItem(STATIC_APPEALS_KEY, JSON.stringify(next));
          return next;
        });
        setFilter('all');
        setSearch('');
        setSuccess(true);
        setNickname('');
        setReason('');
      } catch {
        setError('Не удалось сохранить апелляцию в браузере.');
      } finally {
        setBusy(false);
      }
      return;
    }
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
              setModal(userSignedIn ? 'form' : 'login');
              return { opened: userSignedIn ? 'form' : 'login' };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Unsupported browser */
    }
    return () => lifecycle.abort();
  }, [userSignedIn]);
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
        <div className="intro-stage">
          <InteractiveGrid />
          <header className="header wrap">
            <a
              className="brand"
              href={staticMode ? './' : '/'}
              aria-label="141 — главная"
            >
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
            {userSignedIn ? (
              staticMode ? (
                <button className="login-button" onClick={signOutStatic}>
                  <span className="online-dot" />
                  {isAdmin ? 'Администратор' : 'Гость'}{' '}
                  <LogOut size="0.9375rem" />
                </button>
              ) : (
                <a
                  className="login-button"
                  href="/signout-with-chatgpt?return_to=%2F"
                  target="_top"
                >
                  <span className="online-dot" />
                  Выйти <LogOut size="0.9375rem" />
                </a>
              )
            ) : (
              <button
                className="login-button"
                onClick={() => setModal('login')}
              >
                Войти <ArrowUpRight size="1rem" />
              </button>
            )}
          </header>
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
        </div>
        <main>
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
                            onClick={() => {
                              setSlideDirection('next');
                              setRejectionReason(a.decision_reason ?? '');
                              setSelected(a);
                            }}
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
                                  {a.id.startsWith('demo-') && ' · пример'}
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
        <div className="footer-stage">
          <InteractiveGrid placement="footer" />
          <footer className="footer wrap">
            <a
              className="footer-brand"
              href={staticMode ? './' : '/'}
              aria-label="141 — главная"
            >
              141
            </a>
            <span className="footer-end">
              Сделано для сообщества <span className="lime">↗</span>
            </span>
          </footer>
        </div>
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
                <DialogTitle>
                  {staticMode ? 'Выбери режим' : 'Начнём со знакомства'}
                </DialogTitle>
                <DialogDescription>
                  {staticMode
                    ? 'Гость подаёт и просматривает заявки. Администратор принимает решения.'
                    : 'Войди, чтобы подать апелляцию и сохранить свою заявку.'}
                </DialogDescription>
                {staticMode ? (
                  <div className="role-options">
                    <button
                      className="role-option"
                      onClick={() => signInStatic('guest')}
                    >
                      <UserRound size="1.25rem" />
                      <span>
                        <strong>Войти как гость</strong>
                        <small>Подать или посмотреть апелляцию</small>
                      </span>
                      <ArrowUpRight size="1.125rem" />
                    </button>
                    <button
                      className="role-option role-option-admin"
                      onClick={() => signInStatic('admin')}
                    >
                      <ShieldCheck size="1.25rem" />
                      <span>
                        <strong>Войти как администратор</strong>
                        <small>Рассматривать заявки и выносить решения</small>
                      </span>
                      <ArrowUpRight size="1.125rem" />
                    </button>
                  </div>
                ) : (
                  <a className="primary full" href={signInUrl} target="_top">
                    Войти через ChatGPT <ArrowUpRight size="1.125rem" />
                  </a>
                )}
                <p className="form-note">
                  {staticMode
                    ? 'Роль, заявки и решения сохраняются только в этом браузере.'
                    : 'В этой версии вход работает через ChatGPT. Подключение Twitch пока не настроено; ник ты укажешь в заявке.'}
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
          <DialogContent
            className="appeal-carousel-dialog"
            showCloseButton={false}
            data-lenis-prevent
          >
            {selected && (
              <div className="appeal-carousel" data-direction={slideDirection}>
                {previousAppeal && (
                  <button
                    key={`previous-${previousAppeal.id}-${selected.id}`}
                    type="button"
                    className="carousel-side carousel-side-previous"
                    onClick={() => navigateAppeal('previous')}
                    aria-label={`Предыдущая апелляция: ${previousAppeal.nickname}`}
                  >
                    <span className="carousel-direction-label">
                      <ArrowLeft size="1rem" /> Предыдущая
                    </span>
                    <span className="carousel-side-content">
                      <Status status={previousAppeal.status} />
                      <span className="carousel-side-title">
                        {previousAppeal.nickname}
                      </span>
                      <span className="carousel-side-meta">
                        {previousAppeal.id.startsWith('demo-')
                          ? 'Демонстрационная апелляция'
                          : 'Апелляция на разбан'}{' '}
                        ·{' '}
                        {new Date(previousAppeal.created_at).toLocaleDateString(
                          'ru-RU',
                        )}
                      </span>
                      <span className="carousel-side-reason">
                        {previousAppeal.reason}
                      </span>
                    </span>
                  </button>
                )}

                <article
                  key={`${selected.id}-${slideDirection}`}
                  className={`carousel-active carousel-active-${slideDirection}`}
                >
                  <button
                    type="button"
                    className="carousel-close"
                    onClick={() => setSelected(null)}
                    aria-label="Закрыть апелляцию"
                  >
                    <X size="1.125rem" />
                  </button>
                  <Status status={selected.status} />
                  <DialogTitle>{selected.nickname}</DialogTitle>
                  <DialogDescription>
                    {selected.id.startsWith('demo-')
                      ? 'Демонстрационная апелляция'
                      : 'Апелляция на разбан'}{' '}
                    ·{' '}
                    {new Date(selected.created_at).toLocaleDateString('ru-RU')}
                  </DialogDescription>
                  <p className="full-reason">{selected.reason}</p>
                  {selected.decision && (
                    <div className="decision">
                      <span>Заключительный вердикт</span>
                      <p>{selected.decision}</p>
                      {selected.decision_reason && (
                        <p className="decision-reason">
                          Причина: {selected.decision_reason}
                        </p>
                      )}
                    </div>
                  )}
                  {selected.status === 'pending' && (
                    <p className="form-note">Заявка ожидает рассмотрения.</p>
                  )}
                  {isAdmin && (
                    <section
                      className="moderation-panel"
                      aria-label="Решение администратора"
                    >
                      <label htmlFor={`rejection-reason-${selected.id}`}>
                        Причина отказа <span>необязательно</span>
                        <textarea
                          id={`rejection-reason-${selected.id}`}
                          value={rejectionReason}
                          onChange={(event) =>
                            setRejectionReason(event.target.value)
                          }
                          rows={2}
                          maxLength={500}
                          placeholder="Укажи причину, если она нужна для итогового вердикта"
                        />
                      </label>
                      <div className="moderation-actions">
                        <button
                          type="button"
                          className="moderation-accept"
                          onClick={() => moderateSelected('accepted')}
                          disabled={selected.status === 'accepted'}
                        >
                          <Check size="1rem" /> Принять
                        </button>
                        <button
                          type="button"
                          className="moderation-reset"
                          onClick={() => moderateSelected('pending')}
                          disabled={selected.status === 'pending'}
                        >
                          <RotateCcw size="1rem" /> Отменить
                        </button>
                        <button
                          type="button"
                          className="moderation-reject"
                          onClick={() => moderateSelected('rejected')}
                          disabled={
                            selected.status === 'rejected' &&
                            rejectionReason.trim() ===
                              (selected.decision_reason ?? '')
                          }
                        >
                          <X size="1rem" /> Отклонить
                        </button>
                      </div>
                    </section>
                  )}
                </article>

                {nextAppeal && (
                  <button
                    key={`next-${nextAppeal.id}-${selected.id}`}
                    type="button"
                    className="carousel-side carousel-side-next"
                    onClick={() => navigateAppeal('next')}
                    aria-label={`Следующая апелляция: ${nextAppeal.nickname}`}
                  >
                    <span className="carousel-direction-label">
                      Следующая <ArrowRight size="1rem" />
                    </span>
                    <span className="carousel-side-content">
                      <Status status={nextAppeal.status} />
                      <span className="carousel-side-title">
                        {nextAppeal.nickname}
                      </span>
                      <span className="carousel-side-meta">
                        {nextAppeal.id.startsWith('demo-')
                          ? 'Демонстрационная апелляция'
                          : 'Апелляция на разбан'}{' '}
                        ·{' '}
                        {new Date(nextAppeal.created_at).toLocaleDateString(
                          'ru-RU',
                        )}
                      </span>
                      <span className="carousel-side-reason">
                        {nextAppeal.reason}
                      </span>
                    </span>
                  </button>
                )}

                {carouselItems.length > 1 && (
                  <div className="carousel-controls">
                    <button
                      type="button"
                      onClick={() => navigateAppeal('previous')}
                      aria-label="Предыдущая апелляция"
                    >
                      <ArrowLeft size="1.125rem" />
                    </button>
                    <span>
                      {selectedIndex + 1} / {carouselItems.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigateAppeal('next')}
                      aria-label="Следующая апелляция"
                    >
                      <ArrowRight size="1.125rem" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ReactLenis>
  );
}
