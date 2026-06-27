import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { type BoardTier } from '../domain/health.js';
import { type AccountVM, type FeedActor, type FeedResolution, type FeedSeed } from '../domain/types.js';
import { ackEscalation, placeVoiceCall, useCockpitData, type DataSource } from '../data/useCockpitData.js';
import { INTEGRATIONS, SEED_USERS } from '../data/seed.js';

export type ThemeName = 'light' | 'dark';

export interface CockpitSettings {
  attio: boolean;
  stripe: boolean;
  twilio: boolean;
  sling: boolean;
  n8n: boolean;
  autoDispatch: boolean;
  redAlerts: boolean;
  renewalReminders: boolean;
  weeklyDigest: boolean;
  agentMode: 'Assist' | 'Autopilot';
  defaultChannel: 'Voice' | 'Email' | 'SMS';
  pulse: boolean;
}

/** A feed seed joined to its account with live status + action callbacks. */
export interface FeedItem extends FeedSeed {
  name: string;
  arrLabel: string;
  reason: string;
  actor: FeedActor;
  open: boolean;
  resolution: string;
  resColor: string;
  resDot: string;
  intentColor: string;
  intentText: string;
  call: () => void;
  email: () => void;
  sms: () => void;
  escalate: () => void;
  dismiss: () => void;
}

interface CockpitContextValue {
  accounts: AccountVM[];
  visibleAccounts: AccountVM[];
  accountById: (id: string) => AccountVM | undefined;
  source: DataSource;
  loading: boolean;
  refresh: () => Promise<void>;
  // filters
  query: string;
  setQuery: (q: string) => void;
  owner: string;
  setOwner: (o: string) => void;
  owners: string[];
  // placement (drag-to-reclassify)
  tierOf: (account: AccountVM) => BoardTier;
  moveTo: (accountId: string, tier: BoardTier) => void;
  // feed
  feedItems: FeedItem[];
  triageCount: number;
  // identity
  users: typeof SEED_USERS;
  currentUser: (typeof SEED_USERS)[number];
  setCurrentUser: (name: string) => void;
  // chrome
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  agentOpen: boolean;
  setAgentOpen: (open: boolean) => void;
  // settings
  settings: CockpitSettings;
  setSetting: <K extends keyof CockpitSettings>(key: K, value: CockpitSettings[K]) => void;
  integrations: typeof INTEGRATIONS;
  // toast
  toast: string | null;
  showToast: (message: string) => void;
}

const CockpitContext = createContext<CockpitContextValue | null>(null);

function readFlag(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : v === '1';
  } catch {
    return def;
  }
}
function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore storage failures
  }
}
function readPlacement(): Record<string, BoardTier> {
  try {
    return (JSON.parse(localStorage.getItem('sentrycs.placement.v1') ?? '{}') as Record<string, BoardTier>) ?? {};
  } catch {
    return {};
  }
}

const DEFAULT_SETTINGS: CockpitSettings = {
  attio: true,
  stripe: true,
  twilio: true,
  sling: false,
  n8n: true,
  autoDispatch: false,
  redAlerts: true,
  renewalReminders: true,
  weeklyDigest: false,
  agentMode: 'Assist',
  defaultChannel: 'Voice',
  pulse: true,
};

const TIER_LABEL: Record<BoardTier, string> = {
  red: 'Churn Risk',
  amber: 'Investigate',
  green: 'Healthy',
  pending: 'Pending',
};

export function CockpitProvider({ children }: { children: ReactNode }) {
  const { accounts, feed, source, loading, refresh } = useCockpitData();

  const [query, setQuery] = useState('');
  const [owner, setOwner] = useState('All owners');
  const [placement, setPlacement] = useState<Record<string, BoardTier>>(() => readPlacement());
  const [feedStatus, setFeedStatus] = useState<Record<string, FeedResolution>>({});
  const [feedActor, setFeedActor] = useState<Record<string, FeedActor>>({});
  const [currentUserName, setCurrentUserName] = useState(SEED_USERS[0]?.name ?? '');
  const [theme, setThemeState] = useState<ThemeName>(() => (readFlag('rick.theme.dark', false) ? 'dark' : 'light'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readFlag('rick.rail', false));
  const [agentOpen, setAgentOpenState] = useState(() => readFlag('sentrycs.agentOpen', true));
  const [settings, setSettings] = useState<CockpitSettings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply the theme to <html data-theme> so the design-system light overrides kick in.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const setTheme = useCallback((t: ThemeName) => {
    writeFlag('rick.theme.dark', t === 'dark');
    setThemeState(t);
  }, []);
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c;
      writeFlag('rick.rail', next);
      return next;
    });
  }, []);
  const setAgentOpen = useCallback((open: boolean) => {
    writeFlag('sentrycs.agentOpen', open);
    setAgentOpenState(open);
  }, []);
  const setSetting = useCallback(
    <K extends keyof CockpitSettings>(key: K, value: CockpitSettings[K]) =>
      setSettings((s) => ({ ...s, [key]: value })),
    [],
  );

  const accountById = useCallback((id: string) => accounts.find((a) => a.id === id), [accounts]);

  const owners = useMemo(
    () => ['All owners', ...Array.from(new Set(accounts.map((a) => a.owner)))],
    [accounts],
  );

  const visibleAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter(
      (a) =>
        (!q || a.name.toLowerCase().includes(q) || a.domain.toLowerCase().includes(q)) &&
        (owner === 'All owners' || a.owner === owner),
    );
  }, [accounts, query, owner]);

  const tierOf = useCallback((a: AccountVM): BoardTier => placement[a.id] ?? a.health, [placement]);

  const moveTo = useCallback(
    (accountId: string, tier: BoardTier) => {
      const account = accounts.find((a) => a.id === accountId);
      setPlacement((prev) => {
        const next = { ...prev, [accountId]: tier };
        try {
          localStorage.setItem('sentrycs.placement.v1', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      if (account) showToast(`Moved ${account.name} to ${TIER_LABEL[tier]}`);
    },
    [accounts, showToast],
  );

  const setCurrentUser = useCallback((name: string) => setCurrentUserName(name), []);
  const currentUser = useMemo(
    () => SEED_USERS.find((u) => u.name === currentUserName) ?? SEED_USERS[0]!,
    [currentUserName],
  );

  const feedItems = useMemo<FeedItem[]>(() => {
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const RESOLUTION_LABEL: Record<FeedResolution, string> = {
      call: 'Call dispatched · Twilio voice',
      email: 'Email sent · n8n',
      sms: 'SMS sent · Twilio',
      dismissed: 'Dismissed',
    };
    return feed.map((f) => {
      const account = byId.get(f.accountId);
      const name = account?.name ?? f.accountId;
      const status = feedStatus[f.id];
      const open = !status;
      const actor: FeedActor = feedActor[f.id] ?? f.actor;
      const resolve = (r: FeedResolution, message: string) => {
        setFeedStatus((s) => ({ ...s, [f.id]: r }));
        showToast(message);
      };
      return {
        ...f,
        name,
        arrLabel: account?.arrLabel ?? '',
        reason: account?.signalLine ?? f.body,
        actor,
        open,
        resolution: status ? (RESOLUTION_LABEL[status] ?? 'Resolved') : '',
        resColor: status && status !== 'dismissed' ? 'var(--rag-green-text)' : 'var(--text-tertiary)',
        resDot: status && status !== 'dismissed' ? 'var(--rag-green)' : 'var(--slate-500)',
        intentColor:
          f.intent === 'risk' ? 'var(--rag-red)' : f.intent === 'opportunity' ? 'var(--rag-green)' : 'var(--accent)',
        intentText:
          f.intent === 'risk'
            ? 'var(--rag-red-text)'
            : f.intent === 'opportunity'
              ? 'var(--rag-green-text)'
              : 'var(--accent-text)',
        call: () => {
          void placeVoiceCall(f.accountId);
          resolve('call', `Call dispatched to ${name} · Twilio voice agent`);
        },
        email: () => resolve('email', `Email sent to ${name} · via n8n`),
        sms: () => resolve('sms', `SMS sent to ${name} · via Twilio`),
        escalate: () => {
          if (f.escalationId) void ackEscalation(f.escalationId);
          setFeedActor((s) => ({ ...s, [f.id]: 'human' }));
          showToast(`Escalated to human · ${name}`);
        },
        dismiss: () => resolve('dismissed', `Signal dismissed · ${name}`),
      };
    });
  }, [feed, accounts, feedStatus, feedActor, showToast]);

  const triageCount = useMemo(() => feedItems.filter((i) => i.open).length, [feedItems]);

  const value: CockpitContextValue = {
    accounts,
    visibleAccounts,
    accountById,
    source,
    loading,
    refresh,
    query,
    setQuery,
    owner,
    setOwner,
    owners,
    tierOf,
    moveTo,
    feedItems,
    triageCount,
    users: SEED_USERS,
    currentUser,
    setCurrentUser,
    theme,
    setTheme,
    sidebarCollapsed,
    toggleSidebar,
    agentOpen,
    setAgentOpen,
    settings,
    setSetting,
    integrations: INTEGRATIONS,
    toast,
    showToast,
  };

  return <CockpitContext.Provider value={value}>{children}</CockpitContext.Provider>;
}

export function useCockpit(): CockpitContextValue {
  const ctx = useContext(CockpitContext);
  if (!ctx) throw new Error('useCockpit must be used within a CockpitProvider');
  return ctx;
}
