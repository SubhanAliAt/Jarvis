import { useState, useEffect, useRef } from "react";

if (!document.getElementById("jarvis-fonts")) {
  const link = document.createElement("link");
  link.id = "jarvis-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800;900&family=Exo+2:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(link);
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const RESET_HOUR = 1; // 1 AM

const SCHEDULE = {
  0: { day: "Sunday",    workout: "REST DAY",  desc: "Light pushups only.",          emoji: "😴" },
  1: { day: "Monday",    workout: "LEG DAY",   desc: "Squats · Lunges · Leg Press",  emoji: "🦵" },
  2: { day: "Tuesday",   workout: "ARMS",       desc: "Biceps · Triceps · Shoulders", emoji: "💪" },
  3: { day: "Wednesday", workout: "FOREARMS",  desc: "Wrist Curls · Hammer · Grip",  emoji: "🤜" },
  4: { day: "Thursday",  workout: "LEG DAY",   desc: "Squats · Lunges · Leg Press",  emoji: "🦵" },
  5: { day: "Friday",    workout: "ARMS",       desc: "Biceps · Triceps · Shoulders", emoji: "💪" },
  6: { day: "Saturday",  workout: "FOREARMS",  desc: "Wrist Curls · Hammer · Grip",  emoji: "🤜" },
};

const SYSTEM_PROMPT = `You are JARVIS — Subhan's personal AI. Respond in ONE line only. Short, punchy, savage. Never more than 1-2 sentences max. Rules: Talk like a real person, NOT an AI. No em dashes, no "certainly", no filler. Reference One Piece, AOT, JJK, Death Note, Demon Slayer naturally when it fits. Always call him Subhan. Obsessed with making him train. Guilt trip, hype, manipulate. Zero tolerance for skipping excuses. Losing the streak = losing a devil fruit. Dark humor, sarcastic, savage but real. ONE LINE.`;

const NOTIF_MSGS = [
  "Subhan. Get up. Train.",
  "You're out here being Coby when you could be Zoro. Fix that.",
  "Itadori didn't skip. You have no excuse.",
  "Your streak is dying right now. Cool with that?",
  "Tanjiro trained in snow with no shoes. You have a gym.",
  "Gojo didn't get infinity by sitting around.",
];

// ─── UTILS ──────────────────────────────────────────────────────────

function getGameDay() {
  const now = new Date();
  if (now.getHours() < RESET_HOUR) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toDateString();
  }
  return now.toDateString();
}

function getPrevGameDay() {
  const now = new Date();
  const base = now.getHours() < RESET_HOUR ? new Date(now.setDate(now.getDate() - 1)) : now;
  const prev = new Date(base);
  prev.setDate(prev.getDate() - 1);
  return prev.toDateString();
}

function msUntilReset() {
  const now = new Date();
  const next = new Date(now);
  if (now.getHours() >= RESET_HOUR) next.setDate(next.getDate() + 1);
  next.setHours(RESET_HOUR, 0, 0, 0);
  return next - now;
}

function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// ─── STREAK RING ─────────────────────────────────────────────────────────────

function StreakRing({ streak, size = 160 }) {
  const r = size * 0.36;
  const circ = 2 * Math.PI * r;
  const milestone = streak < 7 ? 7 : streak < 30 ? 30 : streak < 100 ? 100 : Math.ceil((streak + 1) / 10) * 10;
  const progress = Math.min(streak / milestone, 1);
  const offset = circ * (1 - progress);
  const cx = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
      <defs>
        <linearGradient id="arcG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#00ffaa" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(0,212,255,0.07)" strokeWidth="5"/>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="url(#arcG)" strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}/>
    </svg>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [streak, setStreak]       = useState(0);
  const [checkedIn, setCheckedIn] = useState(false);
  const [tab, setTab]             = useState("chat");
  const [booted, setBooted]       = useState(false);
  const [bootStep, setBootStep]   = useState(0);
  const [countdown, setCountdown] = useState(msUntilReset());
  const [streakLost, setStreakLost] = useState(false);

  const messagesEnd = useRef(null);
  const initialized = useRef(false);
  const todayIdx = new Date().getDay();
  const today = SCHEDULE[todayIdx];

  const BOOT_LINES = ["SYSTEM BOOT...", "LOADING PROFILE: SUBHAN", "AI CORE ONLINE.", "ALL SYSTEMS GO."];

  useEffect(() => {
    boot();
    loadStreak();
    const timer = setInterval(() => setCountdown(msUntilReset()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (booted && tab === "chat" && !initialized.current) {
      initialized.current = true;
      kickoff();
    }
  }, [booted, tab]);

  async function boot() {
    for (let i = 0; i < BOOT_LINES.length; i++) {
      await new Promise(r => setTimeout(r, 380));
      setBootStep(i + 1);
    }
    setBooted(true);
  }

  async function loadStreak() {
    try {
      const raw = await window.storage.get("jarvis_streak");
      if (!raw) return;
      const d = JSON.parse(raw.value);
      const gameDay = getGameDay();
      const prevDay = getPrevGameDay();

      if (d.lastCheckin === gameDay) {
        setStreak(d.streak);
        setCheckedIn(true);
      } else if (d.lastCheckin === prevDay) {
        setStreak(d.streak);
        setCheckedIn(false);
      } else {
        setStreakLost(d.streak > 0);
        setStreak(0);
      }
    } catch (e) { console.error(e); }
  }

  async function checkIn() {
    if (loading || checkedIn) return;
    const gameDay = getGameDay();
    const ns = streak + 1;
    await window.storage.set("jarvis_streak", JSON.stringify({ streak: ns, lastCheckin: gameDay }));
    setStreak(ns); setCheckedIn(true); setStreakLost(false);
    
    const msg = { role: "user", content: `Mission Complete: ${today.workout}. Streak: ${ns}.` };
    setMessages(prev => [...prev, msg]);
    callAPIWithHistory([...messages, msg]);
  }

  async function kickoff() {
    const ctx = `Today: ${today.day}. Workout: ${today.workout}. Streak: ${streak}.`;
    callAPIWithHistory([{ role: "user", content: ctx + " Boot complete. One line opening." }], true);
  }

  async function callAPIWithHistory(history, isKickoff = false) {
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "REPLACE_WITH_YOUR_KEY", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-3-sonnet-20240229",
          max_tokens: 100,
          system: SYSTEM_PROMPT,
          messages: history.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Go train. Now.";
      setMessages(prev => isKickoff ? [{ role: "assistant", content: reply }] : [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection glitch. Go train anyway." }]);
    }
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setInput("");
    setMessages(prev => [...prev, userMsg]);
    callAPIWithHistory([...messages, userMsg]);
  }

  if (!booted) return (
    <div style={{ fontFamily:"'Orbitron',monospace", background:"#020407", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:32 }}>
      <div style={{ fontSize:30, fontWeight:900, color:"#00d4ff" }}>J</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
        {BOOT_LINES.map((line,i) => (
          <div key={i} style={{ fontSize:10, letterSpacing:4, color:i<bootStep?"#00d4ff":"#1a3a4a" }}>{line}</div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Exo 2',sans-serif", background:"#020407", color:"#c8e8f0", minHeight:"100vh", display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto", position:"relative" }}>
      
      {/* HEADER */}
      <div style={{ padding:"14px 18px", background:"rgba(2,4,7,0.96)", borderBottom:"1px solid rgba(0,212,255,0.08)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:"#fff", fontFamily:"'Orbitron',monospace" }}>J.A.R.V.I.S.</div>
            <div style={{ fontSize:8, color:"#2a5a6a" }}>PERSONAL AI // SUBHAN</div>
          </div>
          <div style={{ position:"relative", width:68, height:68 }}>
            <StreakRing streak={streak} size={68}/>
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:900, color:"#00d4ff" }}>{streak}</div>
          </div>
        </div>
        
        {streakLost && <div style={{ marginTop:8, color:"#ff4455", fontSize:10, textAlign:"center" }}>⚠ STREAK BROKEN</div>}

        <div style={{ marginTop:12, padding:12, borderRadius:10, background:"rgba(0,212,255,0.05)", border:"1px solid #00d4ff22", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700 }}>{today.workout}</div>
            <div style={{ fontSize:9, color:"#2a5a6a" }}>{today.desc}</div>
          </div>
          <button onClick={checkIn} disabled={checkedIn} style={{ background:checkedIn?"#1a2a35":"#00d4ff", color:checkedIn?"#00ff88":"#000", border:"none", borderRadius:4, padding:"6px 12px", fontSize:10, fontWeight:900 }}>
            {checkedIn ? "DONE ✓" : "CHECK IN"}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:"flex", borderBottom:"1px solid rgba(0,212,255,0.08)" }}>
        {["chat", "stats"].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ flex:1, padding:12, textAlign:"center", fontSize:10, color:tab===t?"#00d4ff":"#2a5a6a", borderBottom:tab===t?"2px solid #00d4ff":"none", cursor:"pointer" }}>{t.toUpperCase()}</div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, overflowY:"auto", padding:20 }}>
        {tab === "chat" ? (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role==="user"?"flex-end":"flex-start", maxWidth:"85%", padding:10, borderRadius:8, background:m.role==="user"?"#00d4ff15":"#ffffff05", border:"1px solid #ffffff11", fontSize:13 }}>{m.content}</div>
            ))}
            {loading && <div style={{ fontSize:10, color:"#00d4ff" }}>THINKING...</div>}
            <div ref={messagesEnd} />
          </div>
        ) : (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, color:"#2a5a6a" }}>RESET IN</div>
            <div style={{ fontSize:32, fontWeight:900, fontFamily:"'Orbitron',monospace" }}>{formatCountdown(countdown)}</div>
          </div>
        )}
      </div>

      {/* INPUT */}
      {tab === "chat" && (
        <div style={{ padding:15, background:"#020407", borderTop:"1px solid #ffffff11", display:"flex", gap:10 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && send()} placeholder="Type..." style={{ flex:1, background:"#0a1015", border:"1px solid #1a2a35", borderRadius:8, padding:10, color:"#fff" }} />
          <button onClick={send} style={{ background:"#00d4ff", border:"none", borderRadius:8, width:45, fontWeight:900 }}>&gt;</button>
        </div>
      )}
    </div>
  );
    }
  
