import {
  ArrowRight,
  AudioLines,
  Check,
  Code2,
  Download,
  Eye,
  Globe2,
  LockKeyhole,
  Mic2,
  MonitorDown,
  MonitorUp,
  MousePointer2,
  Search,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";

const features = [
  { icon: Eye, title: "Understands your screen", text: "Share the window you choose. NeuraLens AI reads the visible context and answers the question you actually asked." },
  { icon: AudioLines, title: "Realtime voice conversation", text: "Natural turn detection, live transcripts, expressive speech, and interruption support make conversation feel immediate." },
  { icon: Code2, title: "Coding without code narration", text: "Complete solutions appear in chat while the voice response stays short, clear, and focused on the essential fix." },
  { icon: Globe2, title: "Current information on demand", text: "Approved web searches return concise, source-linked results without silently sending your private screen context." },
  { icon: ShieldCheck, title: "Approval before action", text: "Searches and suggested actions wait for your confirmation. Sensitive credentials and irreversible actions remain blocked." },
  { icon: MonitorUp, title: "Web and Windows", text: "Use the browser instantly or install the dedicated desktop application with native screen-sharing indicators." },
];

const flow = [
  { number: "01", title: "Share what matters", text: "Choose a screen or window. Nothing is captured until you explicitly start sharing." },
  { number: "02", title: "Ask naturally", text: "Speak as you normally would. Your words appear live and send automatically when you finish." },
  { number: "03", title: "Get a grounded answer", text: "NeuraLens AI combines the visible context, your request, and approved external knowledge." },
];

function BrandMark() {
  return <span className="landing-brand-mark"><i /><i /><i /></span>;
}

export default function LandingPage() {
  return (
    <div className="landing-root">
      <div className="landing-noise" />
      <nav className="landing-nav">
        <a className="landing-brand" href="#top" aria-label="NeuraLens AI home"><BrandMark /><span>NeuraLens AI</span></a>
        <div className="landing-nav-links"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#privacy">Privacy</a></div>
        <a className="landing-nav-cta" href="/app">Try now <ArrowRight size={15} /></a>
      </nav>

      <main>
        <section className="landing-hero" id="top">
          <div className="landing-hero-copy">
            <div className="landing-kicker"><Sparkles size={14} /> Voice-first screen intelligence</div>
            <h1>Talk to what’s<br /><span>on your screen.</span></h1>
            <p>NeuraLens AI sees the context you choose to share, listens in realtime, and gives precise answers without taking control away from you.</p>
            <div className="landing-hero-actions">
              <a className="landing-primary-button" href="/api/downloads/windows"><MonitorDown size={18} /><span><small>Download for</small>Windows</span><Download size={16} /></a>
              <a className="landing-secondary-button" href="/app">Try the web app <ArrowRight size={17} /></a>
            </div>
            <div className="landing-trust-row"><span><Check size={13} /> User-controlled sharing</span><span><Check size={13} /> Approval-first actions</span><span><Check size={13} /> Local screen reading</span></div>
          </div>

          <div className="landing-product-stage" aria-label="NeuraLens AI product preview">
            <div className="landing-orbit orbit-one" /><div className="landing-orbit orbit-two" />
            <div className="landing-product-window">
              <div className="landing-window-bar"><div><BrandMark /><strong>NeuraLens AI</strong></div><span><i />Session active</span></div>
              <div className="landing-window-body">
                <aside className="landing-screen-card">
                  <div className="landing-mini-label"><span>VISUAL CONTEXT</span><b><i /> LIVE</b></div>
                  <h3>Your screen</h3>
                  <div className="landing-screen-preview">
                    <div className="preview-toolbar"><i /><i /><i /><span /></div>
                    <div className="preview-content"><div className="preview-sidebar" /><div className="preview-main"><span /><strong /><span /><span /><div /></div></div>
                    <div className="preview-share"><Eye size={12} /> Shared only while you allow</div>
                  </div>
                  <div className="landing-screen-button"><Waves size={14} /> Screen connected</div>
                </aside>
                <section className="landing-chat-card">
                  <div className="landing-mini-label"><span>INTELLIGENCE</span><b><i /> READY</b></div>
                  <h3>Assistant</h3>
                  <div className="landing-conversation">
                    <div className="landing-user-message"><small>You</small><p>Why is this component overflowing?</p></div>
                    <div className="landing-agent-message"><div className="landing-agent-orb" /><div><small>NeuraLens AI</small><p>The card’s child has a fixed width larger than its container. I’ve pasted the responsive fix in the chat.</p><div className="landing-code-line"><Code2 size={14} /><span>styles.css</span><em>Code ready</em></div></div></div>
                  </div>
                  <div className="landing-composer"><Eye size={15} /><span>Ask about what’s on your screen</span><Mic2 size={16} /><ArrowRight size={16} /></div>
                </section>
              </div>
            </div>
            <div className="landing-floating-card card-voice"><span><Mic2 size={15} /></span><div><small>VOICE</small><strong>Listening naturally</strong></div><div className="mini-wave"><i /><i /><i /><i /></div></div>
            <div className="landing-floating-card card-private"><span><LockKeyhole size={15} /></span><div><small>PRIVACY</small><strong>Only what you share</strong></div></div>
          </div>
        </section>

        <section className="landing-proof-strip">
          <span>Built for focused work</span><i />
          <strong>Realtime voice</strong><i />
          <strong>Screen-aware answers</strong><i />
          <strong>Web search with approval</strong><i />
          <strong>Windows desktop app</strong>
        </section>

        <section className="landing-section" id="features">
          <div className="landing-section-heading"><span>CAPABILITIES</span><h2>One assistant.<br />The context to be useful.</h2><p>Designed for debugging, research, learning, and everyday browser workflows without generic answers or hidden actions.</p></div>
          <div className="landing-feature-grid">{features.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={20} /></span><h3>{title}</h3><p>{text}</p><i><ArrowRight size={15} /></i></article>)}</div>
        </section>

        <section className="landing-workflow" id="how-it-works">
          <div className="landing-workflow-visual">
            <div className="workflow-glow" />
            <div className="workflow-screen"><div className="workflow-top"><span /><span /><span /></div><div className="workflow-cursor"><MousePointer2 size={19} /></div><div className="workflow-selection"><Search size={20} /><strong>What should I fix here?</strong></div></div>
            <div className="workflow-answer"><Sparkles size={17} /><span>Reading the visible context…</span></div>
          </div>
          <div className="landing-workflow-copy"><span className="landing-label">HOW IT WORKS</span><h2>From question to useful answer in one conversation.</h2><div className="landing-flow-list">{flow.map((item) => <div key={item.number}><span>{item.number}</span><section><h3>{item.title}</h3><p>{item.text}</p></section></div>)}</div></div>
        </section>

        <section className="landing-privacy" id="privacy">
          <div><span className="landing-label">PRIVATE BY DESIGN</span><h2>Your screen is context.<br />Not a data source.</h2><p>NeuraLens AI analyzes frames only when needed, keeps provider credentials server-side, and makes external actions visible before anything happens.</p><ul><li><ShieldCheck size={17} /> Ephemeral shared-screen frames</li><li><LockKeyhole size={17} /> No passwords, OTPs, or payment data</li><li><Eye size={17} /> Visible confirmation for external actions</li></ul></div>
          <div className="landing-privacy-orb"><div className="privacy-rings"><span /><span /><span /><ShieldCheck size={38} /></div><small>TRUST LAYER</small><strong>Approval first.<br />Always.</strong></div>
        </section>

        <section className="landing-final-cta">
          <div className="cta-glow" /><BrandMark /><span>NEURALENS AI</span><h2>Your screen already has the context.<br />Now you can talk to it.</h2><p>Start instantly in the browser or install the dedicated Windows application.</p><div><a href="/api/downloads/windows"><MonitorDown size={18} /> Download for Windows</a><a href="/app">Try now <ArrowRight size={17} /></a></div>
        </section>
      </main>

      <footer className="landing-footer"><a className="landing-brand" href="#top"><BrandMark /><span>NeuraLens AI</span></a><p>Screen intelligence, under your control.</p><div><a href="#features">Features</a><a href="#privacy">Privacy</a><span>Built by Sai Kiran</span></div></footer>
    </div>
  );
}
