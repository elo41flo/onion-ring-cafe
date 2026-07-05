import { useState, useEffect, useRef, useCallback } from "react";

// ---- Palette du café ----
const COLORS = {
  bg: "#2E2115",
  panel: "#3E2E1D",
  cream: "#FFF3DD",
  gold: "#E8A33D",
  goldDark: "#C9861F",
  raw: "#EDE0B8",
  perfect: "#D9931F",
  overcooked: "#8B4A1E",
  burnt: "#241612",
  sage: "#7C9070",
  coral: "#D65A4A",
  text: "#FFF3DD",
};

const BASKET_COUNT = 4;
const TRAY_MAX = 6;
const COOK_SPEED = 0.9;
const RAW_MAX = 35;
const PERFECT_MAX = 75;
const OVERCOOKED_MAX = 95;

const RECIPES = [
  { id: "classique", label: "Classique", emoji: "⚪" },
  { id: "epicee", label: "Épicée", emoji: "🌶️" },
  { id: "fromage", label: "Fromage", emoji: "🧀" },
  { id: "vegan", label: "Végane", emoji: "🌱" },
];
const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

let idCounter = 1;
const nextId = () => idCounter++;

function qualityFromProgress(p) {
  if (p < RAW_MAX) return "cru";
  if (p < PERFECT_MAX) return "parfait";
  if (p < OVERCOOKED_MAX) return "trop_cuit";
  return "brule";
}

const QUALITY_LABEL = { cru: "Cru", parfait: "Parfait", trop_cuit: "Trop cuit", brule: "Brûlé" };
const QUALITY_POINTS = { cru: 1, parfait: 3, trop_cuit: 1, brule: 0 };
const QUALITY_COLOR = {
  cru: COLORS.raw,
  parfait: COLORS.perfect,
  trop_cuit: COLORS.overcooked,
  brule: COLORS.burnt,
};

const CUSTOMER_NAMES = ["Léo", "Mina", "Théo", "Nour", "Sacha", "Iris", "Noa", "Camille", "Rayan", "Zoé"];

function makeCustomer() {
  const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  return {
    id: nextId(),
    name: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
    patience: 100,
    wants: recipe.id,
  };
}

// ---- Anneau de friture ----
function Ring({ progress, quality, recipe, onClick, empty, onChooseRecipe }) {
  if (empty) {
    return (
      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: 18,
          border: `2px dashed ${COLORS.gold}55`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 2,
          padding: 4,
        }}
      >
        {RECIPES.map((r) => (
          <button
            key={r.id}
            onClick={() => onChooseRecipe(r.id)}
            title={r.label}
            className="flavor-cell"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              borderRadius: 8,
              color: COLORS.text,
            }}
          >
            {r.emoji}
          </button>
        ))}
      </div>
    );
  }

  const color = QUALITY_COLOR[quality];
  const pct = Math.min(100, progress);
  const isDanger = quality === "trop_cuit";
  const conic = `conic-gradient(${color} ${pct * 3.6}deg, #00000033 ${pct * 3.6}deg)`;
  const recipeInfo = RECIPE_BY_ID[recipe];

  return (
    <button
      onClick={onClick}
      title="Cliquer pour sortir de la friture"
      className={`ring-wrap ${isDanger ? "ring-danger" : ""}`}
      style={{ position: "relative", width: 92, height: 92, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: conic, transition: "background 0.15s linear" }} />
      <div
        className="ring-body"
        style={{
          position: "absolute",
          inset: 8,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color})`,
          boxShadow: isDanger ? `0 0 14px 4px ${COLORS.coral}88` : `0 0 8px ${color}55`,
        }}
      >
        <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: `5px solid ${COLORS.bg}`, opacity: 0.35 }} />
        <span className="bubble b1" />
        <span className="bubble b2" />
        <span className="bubble b3" />
      </div>
      <div
        style={{
          position: "absolute",
          top: -4,
          right: -4,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: COLORS.bg,
          border: `1px solid ${COLORS.gold}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
        }}
        title={recipeInfo.label}
      >
        {recipeInfo.emoji}
      </div>
      <div style={{ position: "absolute", bottom: -22, left: 0, right: 0, fontSize: 10, color: COLORS.text, fontWeight: 600 }}>
        {Math.round(pct)}%
      </div>
    </button>
  );
}

export default function OnionRingCafe() {
  const [baskets, setBaskets] = useState(Array.from({ length: BASKET_COUNT }, () => null));
  const [tray, setTray] = useState([]);
  const [customers, setCustomers] = useState([makeCustomer()]);
  const [score, setScore] = useState(0);
  const [scoreBump, setScoreBump] = useState(false);
  const [reputation, setReputation] = useState(3);
  const [combo, setCombo] = useState(0);
  const [toast, setToast] = useState(null);
  const [running, setRunning] = useState(true);
  const toastTimeout = useRef(null);
  const isOpen = running && reputation > 0;

  const showToast = useCallback((msg, kind = "info") => {
    setToast({ msg, kind, key: nextId() });
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 1400);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const tick = setInterval(() => {
      setBaskets((prev) =>
        prev.map((b) => {
          if (!b) return b;
          const newProgress = b.progress + COOK_SPEED;
          if (newProgress >= 100 + 15) return null;
          return { ...b, progress: newProgress };
        })
      );

      setCustomers((prev) => {
        const next = [];
        for (const c of prev) {
          const p = c.patience - 0.6;
          if (p <= 0) {
            setReputation((r) => Math.max(0, r - 1));
            showToast(`${c.name} est parti·e sans commander 😤`, "bad");
            continue;
          }
          next.push({ ...c, patience: p });
        }
        return next;
      });
    }, 100);

    return () => clearInterval(tick);
  }, [isOpen, showToast]);

  useEffect(() => {
    if (!isOpen) return;
    const spawn = setInterval(() => {
      setCustomers((prev) => (prev.length >= 4 ? prev : [...prev, makeCustomer()]));
    }, 4500);
    return () => clearInterval(spawn);
  }, [isOpen]);

  const bumpScore = (amount) => {
    setScore((s) => s + amount);
    setScoreBump(true);
    setTimeout(() => setScoreBump(false), 260);
  };

  const addRing = (index, recipeId) => {
    setBaskets((prev) => {
      if (prev[index]) return prev;
      const copy = [...prev];
      copy[index] = { id: nextId(), progress: 0, recipe: recipeId };
      return copy;
    });
  };

  const pullRing = (index) => {
    setBaskets((prev) => {
      const b = prev[index];
      if (!b) return prev;
      const quality = qualityFromProgress(b.progress);

      if (quality === "brule") {
        showToast("Brûlé ! Direction la poubelle 🗑️", "bad");
        setCombo(0);
        const copy = [...prev];
        copy[index] = null;
        return copy;
      }

      setTray((t) => {
        if (t.length >= TRAY_MAX) {
          showToast("Le plateau est plein !", "bad");
          return t;
        }
        return [...t, { id: nextId(), quality, recipe: b.recipe }];
      });

      if (quality === "parfait") showToast("Parfait ! +3", "good");
      else showToast(QUALITY_LABEL[quality], "neutral");

      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
  };

  const serve = (customerId, ringId) => {
    const ring = tray.find((r) => r.id === ringId);
    const customer = customers.find((c) => c.id === customerId);
    if (!ring || !customer) return;

    setTray((t) => t.filter((r) => r.id !== ringId));
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));

    const base = QUALITY_POINTS[ring.quality];
    const matches = ring.recipe === customer.wants;

    if (matches && ring.quality === "parfait") {
      const total = base + 2 + combo;
      bumpScore(total);
      setCombo((c) => c + 1);
      showToast(`Commande parfaite ! +${total}`, "good");
    } else if (matches) {
      const total = base + 2;
      bumpScore(total);
      setCombo(0);
      showToast(`Bonne recette, cuisson à revoir (+${total})`, "neutral");
    } else {
      bumpScore(1);
      setCombo(0);
      showToast(`Ce n'est pas ce qu'iel a commandé... (+1)`, "bad");
    }
  };

  const restart = () => {
    setBaskets(Array.from({ length: BASKET_COUNT }, () => null));
    setTray([]);
    setCustomers([makeCustomer()]);
    setScore(0);
    setReputation(3);
    setCombo(0);
    setRunning(true);
  };

  return (
    <div style={{ minHeight: "100%", background: `linear-gradient(180deg, ${COLORS.bg}, #1c130c)`, color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 24, boxSizing: "border-box" }}>
      <style>{`
        @keyframes sizzle { 0% { transform: translate(0,0) scale(1); opacity: 0.7; } 50% { transform: translate(2px,-3px) scale(1.15); opacity: 1; } 100% { transform: translate(0,0) scale(1); opacity: 0.7; } }
        @keyframes shakeRing { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-2deg); } 75% { transform: rotate(2deg); } }
        @keyframes popIn { 0% { transform: scale(0.4); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes toastIn { 0% { transform: translate(-50%, 12px) scale(0.9); opacity: 0; } 100% { transform: translate(-50%, 0) scale(1); opacity: 1; } }
        @keyframes scorePulse { 0% { transform: scale(1); } 40% { transform: scale(1.28); } 100% { transform: scale(1); } }
        @keyframes patienceLow { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .ring-wrap { animation: popIn 0.25s ease-out; }
        .ring-danger { animation: shakeRing 0.35s infinite; }
        .bubble { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: ${COLORS.cream}aa; animation: sizzle 0.6s ease-in-out infinite; }
        .b1 { top: 14px; left: 20px; animation-delay: 0s; }
        .b2 { top: 40px; left: 55px; animation-delay: 0.2s; }
        .b3 { top: 55px; left: 25px; animation-delay: 0.4s; }
        .flavor-cell:hover { background: ${COLORS.gold}33 !important; transform: scale(1.1); transition: transform 0.1s; }
        .score-bump { animation: scorePulse 0.26s ease-out; display: inline-block; }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .patience-low { animation: patienceLow 0.5s infinite; }
        .customer-row:hover { border-color: ${COLORS.gold} !important; }
        .tray-ring { transition: transform 0.15s; }
        .tray-ring:hover { transform: scale(1.15); }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: COLORS.gold }}>🧅 Onion Ring Café</h1>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Prototype — friture, recettes &amp; service</div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Score</div>
            <div className={scoreBump ? "score-bump" : ""} style={{ fontSize: 22, fontWeight: 700, color: COLORS.gold }}>{score}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Combo parfait</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.sage }}>x{combo}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Réputation</div>
            <div style={{ fontSize: 18 }}>
              {"⭐".repeat(reputation)}
              <span style={{ opacity: 0.25 }}>{"⭐".repeat(3 - reputation)}</span>
            </div>
          </div>
        </div>
      </div>

      {!isOpen && (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.coral}`, borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>Le café ferme pour la journée... score final : <strong style={{ color: COLORS.gold }}>{score}</strong></div>
          <button onClick={restart} style={{ background: COLORS.gold, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", color: COLORS.bg }}>
            Rouvrir le café
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        <div style={{ background: COLORS.panel, borderRadius: 16, padding: 20 }}>
          <h3 style={{ marginTop: 0, color: COLORS.gold, fontSize: 14 }}>FRITEUSE — choisis une saveur, reclique pour sortir</h3>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingTop: 10, paddingBottom: 30 }}>
            {baskets.map((b, i) => {
              if (!b) return <Ring key={`empty-${i}`} empty onChooseRecipe={(rid) => addRing(i, rid)} />;
              const quality = qualityFromProgress(b.progress);
              return <Ring key={b.id} progress={b.progress} quality={quality} recipe={b.recipe} onClick={() => pullRing(i)} />;
            })}
          </div>

          <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.6 }}>
            🟡 Cru (0–{RAW_MAX}%) → 🟠 Parfait ({RAW_MAX}–{PERFECT_MAX}%) → 🟤 Trop cuit ({PERFECT_MAX}–{OVERCOOKED_MAX}%) → ⚫ Brûlé (perdu)
            <br />
            Recettes : {RECIPES.map((r) => `${r.emoji} ${r.label}`).join(" · ")}
          </div>

          <h3 style={{ color: COLORS.gold, fontSize: 14, marginTop: 24 }}>PLATEAU ({tray.length}/{TRAY_MAX})</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", minHeight: 60 }}>
            {tray.length === 0 && <div style={{ fontSize: 12, opacity: 0.5 }}>Vide pour l'instant</div>}
            {tray.map((r) => (
              <div
                key={r.id}
                className="tray-ring"
                style={{
                  width: 46, height: 46, borderRadius: "50%",
                  background: QUALITY_COLOR[r.quality],
                  border: `2px solid ${COLORS.bg}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, color: COLORS.bg,
                }}
                title={`${RECIPE_BY_ID[r.recipe].label} — ${QUALITY_LABEL[r.quality]}`}
              >
                {RECIPE_BY_ID[r.recipe].emoji}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.panel, borderRadius: 16, padding: 20 }}>
          <h3 style={{ marginTop: 0, color: COLORS.gold, fontSize: 14 }}>CLIENTS — clique un oignon du plateau puis un client</h3>
          <ServeArea customers={customers} tray={tray} onServe={serve} />
        </div>
      </div>

      {toast && (
        <div
          key={toast.key}
          className="toast-anim"
          style={{
            position: "fixed", bottom: 24, left: "50%",
            background: toast.kind === "good" ? COLORS.sage : toast.kind === "bad" ? COLORS.coral : COLORS.goldDark,
            color: COLORS.bg, padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function ServeArea({ customers, tray, onServe }) {
  const [selectedRing, setSelectedRing] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.6 }}>
        {selectedRing ? "Oignon sélectionné — clique un client pour servir" : "Sélectionne d'abord un oignon dans le plateau"}
      </div>

      {tray.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tray.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRing(r.id)}
              className="tray-ring"
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: QUALITY_COLOR[r.quality],
                border: selectedRing === r.id ? `3px solid ${COLORS.text}` : `2px solid ${COLORS.bg}`,
                cursor: "pointer", fontSize: 12,
              }}
              title={`${RECIPE_BY_ID[r.recipe].label} — ${QUALITY_LABEL[r.quality]}`}
            >
              {RECIPE_BY_ID[r.recipe].emoji}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {customers.length === 0 && <div style={{ fontSize: 12, opacity: 0.5 }}>Personne pour l'instant...</div>}
        {customers.map((c) => (
          <button
            key={c.id}
            onClick={() => selectedRing && onServe(c.id, selectedRing)}
            disabled={!selectedRing}
            className="customer-row"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: COLORS.bg, border: `1px solid ${COLORS.gold}44`, borderRadius: 10,
              padding: "10px 14px", cursor: selectedRing ? "pointer" : "default",
              opacity: selectedRing ? 1 : 0.6, color: COLORS.text, transition: "border-color 0.15s",
            }}
          >
            <span style={{ fontWeight: 700 }}>🧑 {c.name}</span>
            <div style={{ flex: 1, height: 6, margin: "0 12px", borderRadius: 3, background: "#00000055", overflow: "hidden" }}>
              <div
                className={c.patience <= 25 ? "patience-low" : ""}
                style={{ height: "100%", width: `${c.patience}%`, background: c.patience > 40 ? COLORS.sage : COLORS.coral, transition: "width 0.2s linear" }}
              />
            </div>
            <span style={{ fontSize: 11, opacity: 0.7 }}>
              veut {RECIPE_BY_ID[c.wants].emoji} {RECIPE_BY_ID[c.wants].label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}