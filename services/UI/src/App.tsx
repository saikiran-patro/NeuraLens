import {
  Activity,
  ArrowUp,
  AudioLines,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleStop,
  Clock3,
  Code2,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Gauge,
  Globe2,
  Home,
  Laptop2,
  Library,
  LockKeyhole,
  Mic,
  MicOff,
  Moon,
  MonitorUp,
  Pause,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  SquareArrowOutUpRight,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { useDeepgramVoice } from "./agents/useDeepgramVoice";
import type {
  AppView,
  AssistantResponse,
  AssistantState,
  ChatMessage,
  HealthStatus,
  KnowledgePack,
  SuggestedAction,
  TimelineItem,
} from "./types";

const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const nowLabel = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
type ThemeMode = "light" | "dark" | "glass";

const navItems: Array<{ id: AppView; label: string; icon: typeof Home }> = [
  { id: "workspace", label: "Workspace", icon: Home },
  { id: "knowledge", label: "Knowledge", icon: Library },
  { id: "activity", label: "Activity", icon: Clock3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const stateLabels: Record<AssistantState, string> = {
  ready: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  guiding: "Guiding",
  awaiting: "Approval needed",
  acting: "Acting",
};

const greeting = "Hello, I’m NeuraLens AI. Share your screen or tell me what you’re working on, and I’ll help you with the real context in front of you.";
const suggestions = [
  { icon: MonitorUp, label: "Analyze my shared screen", text: "Analyze the screen I shared and tell me what you can verify." },
  { icon: Globe2, label: "Guide my current workflow", text: "Guide me through my current workflow safely." },
  { icon: BrainCircuit, label: "Help with a task", text: "Help me solve the task I describe, using only the context I provide." },
];

function Orb({ state = "ready", compact = false }: { state?: AssistantState; compact?: boolean }) {
  return (
    <div className={`intelligence-orb ${state} ${compact ? "compact" : ""}`} aria-label={`Assistant ${state}`}>
      <div className="orb-haze" />
      <div className="orb-surface" />
      <div className="orb-shine" />
    </div>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="NeuraLens AI">
      <div className="brand-mark"><div /></div>
      <span>NeuraLens AI</span>
    </div>
  );
}

function Sidebar({ view, setView }: { view: AppView; setView: (view: AppView) => void }) {
  return (
    <aside className="sidebar glass">
      <button className="brand-button" onClick={() => setView("workspace")} aria-label="NeuraLens AI home">
        <div className="brand-mark"><div /></div>
      </button>
      <nav aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-button ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="privacy-dot" title="Private session"><ShieldCheck size={17} /></div>
        <div className="avatar">S</div>
      </div>
    </aside>
  );
}

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button className={`toggle ${checked ? "on" : ""}`} onClick={onChange} disabled={disabled} role="switch" aria-checked={checked}>
      <span />
    </button>
  );
}

function ScreenPreview({ stream, videoRef }: { stream: MediaStream | null; videoRef: React.RefObject<HTMLVideoElement> }) {
  if (stream) {
    return <video ref={videoRef} className="screen-video" autoPlay muted playsInline />;
  }

  return (
    <div className="screen-empty" aria-label="Screen sharing is off">
      <MonitorUp size={30} strokeWidth={1.4} />
      <strong>No screen shared</strong>
      <p>Choose Share screen when you want NeuraLens AI to analyze a real window.</p>
    </div>
  );
}

function ResponseCard({
  response,
  onAction,
}: {
  response: AssistantResponse;
  onAction: (action: SuggestedAction) => void;
}) {
  const confidence = Math.round(response.confidence * 100);
  return (
    <div className="response-content">
      {response.notice && <div className="provider-notice"><Sparkles size={14} />{response.notice}</div>}
      <p className="answer-text">{response.answer}</p>

      {response.nextSteps.length > 0 && (
        <div className="next-steps">
          <span className="response-label">Recommended path</span>
          {response.nextSteps.map((step, index) => (
            <div className="step" key={`${step}-${index}`}>
              <span>{index + 1}</span><p>{step}</p>
            </div>
          ))}
        </div>
      )}

      {response.suggestedActions.map((action) => (
        <button className="action-card" key={action.id} onClick={() => onAction(action)}>
          <span className="action-icon">{action.type === "copy_patch" ? <Copy size={18} /> : <SquareArrowOutUpRight size={18} />}</span>
          <span><small>Suggested action · {action.risk} risk</small><strong>{action.label}</strong><em>{action.reason}</em></span>
          <ChevronRight size={18} />
        </button>
      ))}

      <div className="response-meta">
        <span><Gauge size={14} /> {confidence}% confidence</span>
        <span><ShieldCheck size={14} /> Approval-first</span>
        <span className="provider-chip">{response.provider === "openai" ? "Vision intelligence" : "Private local RAG"}</span>
      </div>
      {response.sources.length > 0 && (
        <div className="source-row">
          <span>Grounded in</span>
          {response.sources.map((source) => <span className="source-chip" key={`${source.pack}-${source.title}`}>{source.title}</span>)}
        </div>
      )}
    </div>
  );
}

interface WorkspaceProps {
  assistantState: AssistantState;
  messages: ChatMessage[];
  query: string;
  setQuery: (query: string) => void;
  ask: (text?: string) => Promise<void>;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  startShare: () => Promise<void>;
  stopShare: () => void;
  listening: boolean;
  voiceActive: boolean;
  voiceStatus: string;
  toggleListening: () => void | Promise<void>;
  mode: string;
  setMode: (mode: string) => void;
  lastAnalyzed: string;
  onAction: (action: SuggestedAction) => void;
  error: string;
}

function Workspace(props: WorkspaceProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.messages, props.assistantState]);
  const hasConversation = props.messages.length > 0;

  return (
    <div className="workspace-grid view-enter">
      <section className="context-column">
        <div className="panel glass context-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Visual context</span><h2>Your screen</h2></div>
            <span className={`live-label ${props.stream ? "active" : ""}`}><i />{props.stream ? "Live" : "Off"}</span>
          </div>

          <div className={`screen-frame ${props.stream ? "sharing" : ""}`}>
            <ScreenPreview stream={props.stream} videoRef={props.videoRef} />
            <div className="screen-safety"><LockKeyhole size={12} /> {props.stream ? "Shared only while you allow" : "Nothing is being captured"}</div>
            {props.stream && <div className="scan-line" />}
          </div>

          <div className="screen-actions">
            <button className={`secondary-button ${props.stream ? "danger-hover" : ""}`} onClick={props.stream ? props.stopShare : props.startShare}>
              {props.stream ? <><Pause size={16} /> Stop sharing</> : <><MonitorUp size={16} /> Share screen</>}
            </button>
            <button className="icon-button" title="Analyze screen now" onClick={() => props.ask("Analyze the current screen and tell me the next best step.")}>
              <Eye size={17} />
            </button>
          </div>

          <div className="context-facts">
            <div><span>Source</span><strong>{props.stream ? "Shared window" : "Not connected"}</strong></div>
            <div>
              <span>Task mode</span>
              <select value={props.mode} onChange={(event) => props.setMode(event.target.value)}>
                <option value="coding">Coding</option>
                <option value="web">Web task</option>
                <option value="learning">Learning</option>
                <option value="general">General</option>
              </select>
            </div>
            <div><span>Last analyzed</span><strong>{props.lastAnalyzed || "Not yet"}</strong></div>
          </div>
        </div>

        <div className="privacy-card glass-subtle">
          <div className="privacy-icon"><ShieldCheck size={18} /></div>
          <div><strong>Private by design</strong><p>Frames are analyzed only when you ask and are not stored by default.</p></div>
          <Check size={16} />
        </div>
      </section>

      <section className="panel glass conversation-panel">
        <div className="conversation-heading">
          <div><span className="eyebrow">Intelligence</span><h2>Assistant</h2></div>
          <div className={`state-pill ${props.assistantState}`}><span />{stateLabels[props.assistantState]}</div>
        </div>

        <div className={`conversation-body ${hasConversation ? "has-messages" : ""}`}>
          {!hasConversation ? (
            <div className="assistant-welcome">
              <Orb state={props.assistantState} />
              <span className="eyebrow">Screen-aware intelligence</span>
              <h1>What are we working on?</h1>
              <p>I can see what you choose to share, reason over your local knowledge, and guide the next safe step.</p>
              <div className="suggestion-grid">
                {suggestions.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return <button key={suggestion.label} onClick={() => props.ask(suggestion.text)}><Icon size={17} /><span>{suggestion.label}</span><ChevronRight size={15} /></button>;
                })}
              </div>
            </div>
          ) : (
            <div className="messages">
              {props.messages.map((message) => (
                <div className={`message-row ${message.role}`} key={message.id}>
                  {message.role === "assistant" && <Orb compact state="guiding" />}
                  <div className="message-wrap">
                    <div className="message-meta"><span>{message.role === "user" ? "You" : "NeuraLens AI"}</span><time>{message.createdAt}</time></div>
                    <div className="message-bubble">
                      {message.role === "user" ? <p>{message.text}</p> : message.response ? <ResponseCard response={message.response} onAction={props.onAction} /> : message.code ? (
                        <div className="chat-code-card">
                          {(message.code.filename || message.code.language) && <div className="chat-code-heading"><span>{message.code.filename || "Code"}</span><small>{message.code.language}</small></div>}
                          <pre><code>{message.code.content}</code></pre>
                        </div>
                      ) : <p>{message.text}</p>}
                    </div>
                  </div>
                </div>
              ))}
              {props.assistantState === "thinking" && (
                <div className="message-row assistant thinking-row"><Orb compact state="thinking" /><div className="thinking-bubble"><i /><i /><i /><span>Reading the context</span></div></div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {props.error && <div className="inline-error"><X size={14} />{props.error}</div>}
        <div className={`composer ${props.listening ? "listening" : ""}`}>
          <button className={`composer-icon ${props.stream ? "active" : ""}`} onClick={props.stream ? props.stopShare : props.startShare} title={props.stream ? "Stop screen sharing" : "Share screen"}>
            {props.stream ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <textarea
            rows={1}
            placeholder={props.listening ? "Listening…" : "Ask about what’s on your screen"}
            value={props.query}
            onChange={(event) => props.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void props.ask();
              }
            }}
          />
          <button className={`composer-icon mic-button ${props.voiceActive ? "active" : ""}`} onClick={props.toggleListening} title={props.voiceActive ? "End realtime voice conversation" : "Start realtime voice conversation"}>
            {props.voiceActive ? <CircleStop size={18} /> : <Mic size={18} />}
          </button>
          <button className="send-button" disabled={!props.query.trim() || props.assistantState === "thinking"} onClick={() => void props.ask()} aria-label="Send">
            <ArrowUp size={19} />
          </button>
          {props.voiceActive && <div className="voice-wave"><i /><i /><i /><i /><i /><span>{props.voiceStatus}</span></div>}
        </div>
        <div className="composer-caption"><LockKeyhole size={11} /> Actions are never taken without your approval</div>
      </section>
    </div>
  );
}

function KnowledgeView({ packs }: { packs: KnowledgePack[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  useEffect(() => setEnabled(Object.fromEntries(packs.map((pack) => [pack.id, true]))), [packs]);
  const activePack = packs.find((pack) => pack.id === selected);
  const filtered = packs.filter((pack) => `${pack.name} ${pack.description}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="library-view view-enter">
      <div className="view-title-row">
        <div><span className="eyebrow">Grounded intelligence</span><h1>Knowledge library</h1><p>Curated local documents that make every answer more precise.</p></div>
        <div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search packs" /></div>
      </div>
      <div className="library-layout">
        <div className="pack-grid">
          {filtered.map((pack, index) => {
            const icons = [Code2, BrainCircuit, Globe2, ShieldCheck, BookOpen];
            const Icon = icons[index % icons.length];
            return (
              <div
                className={`pack-card glass ${selected === pack.id ? "selected" : ""}`}
                key={pack.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(pack.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(pack.id);
                  }
                }}
              >
                <div className="pack-top"><span className="pack-icon"><Icon size={20} /></span><Toggle checked={enabled[pack.id] ?? true} disabled={pack.locked} onChange={() => !pack.locked && setEnabled((value) => ({ ...value, [pack.id]: !value[pack.id] }))} /></div>
                <div><span className="document-count">{pack.documents.length} documents</span><h3>{pack.name}</h3><p>{pack.description}</p></div>
                <div className="pack-footer"><span>{pack.locked ? <><LockKeyhole size={12} /> Always active</> : enabled[pack.id] ? <><Check size={12} /> Active</> : "Paused"}</span><ChevronRight size={16} /></div>
              </div>
            );
          })}
        </div>
        <aside className="document-panel glass">
          {activePack ? (
            <>
              <div className="document-panel-heading"><span className="pack-icon"><FileText size={19} /></span><div><span className="eyebrow">Contents</span><h2>{activePack.name}</h2></div></div>
              <div className="document-list">
                {activePack.documents.map((document) => (
                  <div className="document-row" key={document.file}><FileText size={17} /><div><strong>{document.title}</strong><span>{document.file}</span><p>{document.excerpt}…</p></div></div>
                ))}
              </div>
            </>
          ) : (
            <div className="document-empty"><Library size={30} /><h3>Select a knowledge pack</h3><p>Inspect the source documents used to ground NeuraLens AI responses.</p></div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ActivityView({ timeline }: { timeline: TimelineItem[] }) {
  const iconMap = { session: Play, screen: Eye, question: AudioLines, knowledge: Library, answer: Sparkles, action: Zap };
  return (
    <div className="activity-view view-enter">
      <div className="view-title-row"><div><span className="eyebrow">Transparent by default</span><h1>Session activity</h1><p>Everything NeuraLens AI saw, reasoned over, suggested, and performed.</p></div><button className="secondary-button"><FileText size={16} /> Export summary</button></div>
      <div className="activity-layout">
        <section className="timeline-panel glass">
          <div className="timeline-date"><span>Current session</span><em>{timeline.length} events</em></div>
          {timeline.length ? timeline.map((item, index) => {
            const Icon = iconMap[item.type];
            return <div className="timeline-item" key={item.id}><div className="timeline-track"><span><Icon size={15} /></span>{index < timeline.length - 1 && <i />}</div><div><time>{item.createdAt}</time><strong>{item.title}</strong><p>{item.detail}</p></div></div>;
          }) : <div className="document-empty"><Activity size={30} /><h3>No activity yet</h3><p>Ask NeuraLens AI a question to start a transparent session trail.</p></div>}
        </section>
        <aside className="session-summary glass-subtle">
          <span className="eyebrow">Session trust</span><h2>All clear</h2><div className="trust-score"><ShieldCheck size={28} /><strong>100</strong><span>/100</span></div>
          <ul><li><Check size={14} /> No sensitive data stored</li><li><Check size={14} /> No actions run silently</li><li><Check size={14} /> Screen frames remain ephemeral</li></ul>
        </aside>
      </div>
    </div>
  );
}

function SettingsView({ health, voiceOut, setVoiceOut, voiceInputStatus, theme, setTheme }: { health: HealthStatus; voiceOut: boolean; setVoiceOut: (value: boolean) => void; voiceInputStatus: string; theme: ThemeMode; setTheme: (theme: ThemeMode) => void }) {
  const [capture, setCapture] = useState(true);
  const [memory, setMemory] = useState(true);
  return (
    <div className="settings-view view-enter">
      <div className="view-title-row"><div><span className="eyebrow">Your preferences</span><h1>Settings</h1><p>Control intelligence, voice, capture, and local privacy.</p></div></div>
      <div className="settings-grid">
        <section className="settings-section glass appearance-section">
          <div className="settings-section-title"><span><Sun size={18} /></span><div><h2>Appearance</h2><p>Choose how NeuraLens AI looks</p></div></div>
          <div className="theme-picker" role="radiogroup" aria-label="Appearance theme">
            {(["light", "dark", "glass"] as ThemeMode[]).map((option) => (
              <button key={option} className={theme === option ? "active" : ""} onClick={() => setTheme(option)} role="radio" aria-checked={theme === option}>
                {option === "light" ? <Sun size={16} /> : option === "dark" ? <Moon size={16} /> : <Sparkles size={16} />}
                <span>{option}</span>
              </button>
            ))}
          </div>
          <p className="theme-description">{theme === "glass" ? "Transparent panels, layered blur, and luminous glass edges." : theme === "dark" ? "Low-light surfaces with restrained contrast and soft depth." : "Bright, clean surfaces with clear visual hierarchy."}</p>
        </section>
        <section className="settings-section glass">
          <div className="settings-section-title"><span><Sparkles size={18} /></span><div><h2>Intelligence</h2><p>Provider and response behavior</p></div></div>
          <div className="setting-row"><div><strong>Typed reasoning</strong><p>{health.provider === "openai" ? "OpenAI multimodal requests are configured" : "Private local retrieval is active"}</p></div><span className="status-value"><i className={health.provider === "openai" ? "online" : ""} />{health.provider === "openai" ? "Configured" : "Local"}</span></div>
          <div className="setting-row"><div><strong>Deepgram voice agent</strong><p>Natural listening, managed reasoning, expressive speech, and private screen context</p></div><span className="status-value"><i className={health.voiceProvider === "deepgram" ? "online" : ""} />{health.voiceProvider === "deepgram" ? "Configured" : "Not configured"}</span></div>
          <div className="setting-row"><div><strong>Voice models</strong><p>Selected from your local environment</p></div><span className="model-value">{health.voiceModel || "Unavailable"}</span></div>
          <div className="setting-note"><LockKeyhole size={15} /><span>Long-lived API keys stay server-side. Voice sessions receive a short-lived NeuraLens AI proxy token.</span></div>
        </section>
        <section className="settings-section glass">
          <div className="settings-section-title"><span><Volume2 size={18} /></span><div><h2>Voice</h2><p>Input and spoken responses</p></div></div>
          <div className="setting-row"><div><strong>Aura-2 voice output</strong><p>Natural streamed speech with immediate barge-in</p></div><Toggle checked={voiceOut} onChange={() => setVoiceOut(!voiceOut)} /></div>
          <div className="setting-row"><div><strong>Voice conversation</strong><p>Transcript, Flux turn detection, and current-screen grounding</p></div><span className="status-value"><i className={voiceInputStatus === "Ready" ? "online" : ""} />{voiceInputStatus}</span></div>
        </section>
        <section className="settings-section glass">
          <div className="settings-section-title"><span><ShieldCheck size={18} /></span><div><h2>Privacy</h2><p>Screen and memory controls</p></div></div>
          <div className="setting-row"><div><strong>Analyze only when asked</strong><p>No continuous model uploads or background capture</p></div><Toggle checked={capture} onChange={() => setCapture(!capture)} /></div>
          <div className="setting-row"><div><strong>Keep session timeline</strong><p>Store event summaries in memory for this session</p></div><Toggle checked={memory} onChange={() => setMemory(!memory)} /></div>
          <div className="setting-row"><div><strong>Screenshot storage</strong><p>Frames are discarded immediately after analysis</p></div><span className="locked-value"><LockKeyhole size={13} />Off</span></div>
        </section>
        <section className="settings-section glass about-section">
          <div className="settings-section-title"><span><BrainCircuit size={18} /></span><div><h2>NeuraLens AI</h2><p>Screen intelligence, under your control</p></div></div>
          <div className="about-orb"><Orb compact /><div><strong>{health.knowledgeDocuments || 0}</strong><span>local documents indexed</span></div></div>
          <span className="version">Prototype 0.1 · Development build</span>
        </section>
      </div>
    </div>
  );
}

function ApprovalModal({ action, onClose, onApprove, busy }: { action: SuggestedAction; onClose: () => void; onApprove: () => void; busy: boolean }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="approval-modal glass" role="dialog" aria-modal="true" aria-labelledby="approval-title">
        <button className="modal-close" onClick={onClose} disabled={busy}><X size={18} /></button>
        <div className="approval-symbol"><ShieldCheck size={24} /></div>
        <span className="eyebrow">Your approval is required</span>
        <h2 id="approval-title">{action.label}</h2>
        <p>{action.description}</p>
        <div className="approval-details">
          <div><span>Action</span><strong>{action.type.replace("_", " ")}</strong></div>
          <div><span>Risk</span><strong className={`risk-${action.risk}`}>{action.risk}</strong></div>
          <div><span>Why</span><strong>{action.reason}</strong></div>
        </div>
        <div className="safety-line"><LockKeyhole size={14} /> NeuraLens AI will do only what is shown above.</div>
        <div className="modal-actions"><button className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary-button" onClick={onApprove} disabled={busy}>{busy ? <><span className="button-spinner" />Approving</> : <><Check size={16} />Approve action</>}</button></div>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<AppView>("workspace");
  const [assistantState, setAssistantState] = useState<AssistantState>("ready");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: newId("message"), role: "assistant", text: greeting, createdAt: nowLabel() },
  ]);
  const [query, setQuery] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState("coding");
  const [lastAnalyzed, setLastAnalyzed] = useState("");
  const [pendingAction, setPendingAction] = useState<SuggestedAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [voiceOut, setVoiceOut] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("neuralens-theme");
    return saved === "dark" || saved === "glass" || saved === "light" ? saved : "glass";
  });
  const [packs, setPacks] = useState<KnowledgePack[]>([]);
  const [health, setHealth] = useState<HealthStatus>({ status: "loading", provider: "local", model: "Starting…", knowledgeDocuments: 0 });
  const [timeline, setTimeline] = useState<TimelineItem[]>([
    { id: newId("event"), type: "session", title: "Private session started", detail: "NeuraLens AI is ready. Screen sharing remains off until you choose it.", createdAt: nowLabel() },
  ]);
  const sessionId = useMemo(() => newId("session"), []);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    void Promise.all([api.health(), api.knowledge()])
      .then(([status, knowledge]) => { setHealth(status); setPacks(knowledge.packs); })
      .catch(() => setError("The local NeuraLens AI service is not reachable yet."));
  }, []);

  useEffect(() => {
    localStorage.setItem("neuralens-theme", theme);
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
  }, [theme]);


  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream, view]);

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  const addTimeline = (type: TimelineItem["type"], title: string, detail: string) => {
    setTimeline((items) => [{ id: newId("event"), type, title, detail, createdAt: nowLabel() }, ...items]);
  };

  const stopShare = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    addTimeline("screen", "Screen sharing stopped", "NeuraLens AI no longer has access to the shared window.");
  };

  const startShare = async () => {
    setError("");
    try {
      const media = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 12 }, audio: false });
      media.getVideoTracks()[0].addEventListener("ended", () => setStream(null), { once: true });
      setStream(media);
      addTimeline("screen", "Screen sharing enabled", "A window is available for on-demand analysis. Frames are not stored.");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "NotAllowedError") return;
      setError("Screen sharing is unavailable in this browser.");
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !stream) return undefined;
    const scale = Math.min(1, 1280 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  };

  const upsertVoiceMessage = (id: string, role: ChatMessage["role"], text: string) => {
    setMessages((items) => {
      const existing = items.findIndex((item) => item.id === id);
      if (existing === -1) return [...items, { id, role, text, createdAt: nowLabel() }];
      return items.map((item, index) => index === existing ? { ...item, text } : item);
    });
  };

  const realtimeVoice = useDeepgramVoice({
    enabled: voiceOut,
    getScreenFrame: captureFrame,
    onError: setError,
    onScreenRead: (detail) => addTimeline("screen", "Shared screen read for voice turn", detail),
    onCodePaste: (code, language, filename) => {
      setMessages((items) => [...items, {
        id: newId("voice_code"),
        role: "assistant",
        text: filename ? `Code for ${filename}` : "Code",
        code: { content: code, language, filename },
        createdAt: nowLabel(),
      }]);
      addTimeline("answer", "Code pasted in chat", filename || language || "Code solution");
    },
    onUserTranscript: (id, text, final) => {
      upsertVoiceMessage(id, "user", text);
      if (final) addTimeline("question", "You asked NeuraLens AI by voice", text);
    },
    onAssistantTranscript: (id, text, final) => {
      upsertVoiceMessage(id, "assistant", text);
      if (final) {
        setLastAnalyzed(nowLabel());
        addTimeline("answer", "Deepgram voice answer delivered", health.voiceModel || "Deepgram Voice Agent");
      }
    },
  });

  const voiceActive = !["off", "error"].includes(realtimeVoice.state);
  const listening = realtimeVoice.state === "listening";
  const voiceStatus = ({ off: "Off", connecting: "Connecting", ready: "Ready", listening: "Listening", thinking: "Thinking", speaking: "Speaking", error: "Error" } as const)[realtimeVoice.state];

  useEffect(() => {
    if (realtimeVoice.state === "listening") setAssistantState("listening");
    else if (realtimeVoice.state === "thinking" || realtimeVoice.state === "connecting") setAssistantState("thinking");
    else if (realtimeVoice.state === "speaking") setAssistantState("guiding");
    else if (!pendingAction) setAssistantState("ready");
  }, [realtimeVoice.state, pendingAction]);

  const ask = async (text?: string) => {
    const userText = (text || query).trim();
    if (!userText || assistantState === "thinking") return;
    setError("");
    setQuery("");
    setAssistantState("thinking");
    const screenshotBase64 = captureFrame();
    setMessages((items) => [...items, { id: newId("message"), role: "user", text: userText, createdAt: nowLabel() }]);
    addTimeline("question", "You asked NeuraLens AI", userText);
    if (screenshotBase64) addTimeline("screen", "Screen frame analyzed", "One ephemeral frame was attached to this request.");

    try {
      const response = await api.ask({ sessionId, userText, screenshotBase64, mode });
      setMessages((items) => [...items, { id: newId("message"), role: "assistant", text: response.answer, response, createdAt: nowLabel() }]);
      setLastAnalyzed(nowLabel());
      if (response.sources.length) addTimeline("knowledge", "Knowledge retrieved", response.sources.map((source) => source.title).join(", "));
      addTimeline("answer", "Guidance delivered", `${Math.round(response.confidence * 100)}% confidence · ${response.model}`);
      setAssistantState(response.suggestedActions.length ? "guiding" : "ready");
      window.setTimeout(() => setAssistantState((state) => state === "guiding" ? "ready" : state), 1200);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "NeuraLens AI could not answer that request.");
      setAssistantState("ready");
    }
  };

  const toggleListening = () => voiceActive ? realtimeVoice.stop() : realtimeVoice.start();

  const openApproval = (action: SuggestedAction) => {
    setPendingAction(action);
    setAssistantState("awaiting");
  };

  const closeApproval = () => {
    setPendingAction(null);
    setAssistantState("ready");
  };

  const approveAction = async () => {
    if (!pendingAction) return;
    setActionBusy(true);
    setAssistantState("acting");
    const needsWindow = pendingAction.type === "open_url" || pendingAction.type === "web_search";
    const openedWindow = needsWindow ? window.open("about:blank", "_blank") : null;
    try {
      const result = await api.confirmAction({ sessionId, action: pendingAction, approved: true });
      if (pendingAction.type === "open_url" && pendingAction.payload.url && /^https?:\/\//.test(pendingAction.payload.url)) {
        if (openedWindow) openedWindow.location.href = pendingAction.payload.url;
      } else if (pendingAction.type === "web_search" && pendingAction.payload.query) {
        const target = `https://www.google.com/search?q=${encodeURIComponent(pendingAction.payload.query)}`;
        if (openedWindow) openedWindow.location.href = target;
      } else if (pendingAction.type === "copy_patch" && pendingAction.payload.text) {
        await navigator.clipboard.writeText(pendingAction.payload.text);
      } else {
        openedWindow?.close();
      }
      addTimeline("action", "Approved action completed", pendingAction.label);
      setToast(result.message);
      window.setTimeout(() => setToast(""), 3200);
      closeApproval();
    } catch (actionError) {
      openedWindow?.close();
      setError(actionError instanceof Error ? actionError.message : "The action could not be completed.");
      setAssistantState("awaiting");
    } finally {
      setActionBusy(false);
    }
  };

  const screenAnalysisActive = Boolean(stream) && (assistantState === "thinking" || realtimeVoice.state === "thinking");

  return (
    <div className={`app-background theme-${theme} ${stream ? "screen-share-active" : ""} ${screenAnalysisActive ? "screen-share-analyzing" : ""}`}>
      {stream && <div className="screen-share-edge" aria-hidden="true" />}
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <div className="app-shell">
        <Sidebar view={view} setView={setView} />
        <main className="main-surface">
          <header className="topbar">
            <Brand />
            <div className="topbar-right">
              <div className="model-indicator"><span /><div><small>{health.voiceProvider === "deepgram" ? "Deepgram voice agent" : "Private intelligence"}</small><strong>{health.voiceModel || health.model}</strong></div></div>
              <div className="header-divider" />
              <button className="voice-toggle theme-cycle" onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "glass" : "light")} title={`Appearance: ${theme}. Click to switch.`}>{theme === "light" ? <Sun size={17} /> : theme === "dark" ? <Moon size={17} /> : <Sparkles size={17} />}</button>
              <button className="voice-toggle" onClick={() => setVoiceOut(!voiceOut)} title={voiceOut ? "Mute spoken responses" : "Speak responses"}>{voiceOut ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
              <button className="session-button"><i />Session active</button>
            </div>
          </header>
          <div className="page-content">
            {view === "workspace" && <Workspace assistantState={assistantState} messages={messages} query={query} setQuery={setQuery} ask={ask} stream={stream} videoRef={videoRef} startShare={startShare} stopShare={stopShare} listening={listening} voiceActive={voiceActive} voiceStatus={voiceStatus} toggleListening={toggleListening} mode={mode} setMode={setMode} lastAnalyzed={lastAnalyzed} onAction={openApproval} error={error} />}
            {view === "knowledge" && <KnowledgeView packs={packs} />}
            {view === "activity" && <ActivityView timeline={timeline} />}
            {view === "settings" && <SettingsView health={health} voiceOut={voiceOut} setVoiceOut={setVoiceOut} voiceInputStatus={voiceStatus} theme={theme} setTheme={setTheme} />}
          </div>
        </main>
      </div>
      {pendingAction && <ApprovalModal action={pendingAction} onClose={closeApproval} onApprove={approveAction} busy={actionBusy} />}
      {toast && <div className="toast"><span><Check size={15} /></span>{toast}</div>}
    </div>
  );
}

export default App;
