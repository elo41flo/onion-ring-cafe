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
  { id: "truffe", label: "Truffe", emoji: "🍄" },
  { id: "miel", label: "Miel-piment", emoji: "🍯" },
  { id: "curry", label: "Curry", emoji: "🍛" },
];
const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

// ---- Catalogue de décoration ----
const DECOR_CATALOG = {
  murs: [
    { id: "mur_noyer", label: "Brun noyer", cost: 0, color: "#4A3423" },
    { id: "mur_sauge", label: "Sauge", cost: 30, color: "#5C6E4F" },
    { id: "mur_terracotta", label: "Terracotta", cost: 30, color: "#B5613A" },
    { id: "mur_prune", label: "Prune", cost: 45, color: "#5B3A56" },
    { id: "mur_canard", label: "Bleu canard", cost: 50, color: "#1F5C5C" },
    { id: "mur_moutarde", label: "Jaune moutarde", cost: 40, color: "#B8860B" },
  ],
  sols: [
    { id: "sol_clair", label: "Bois clair", cost: 0, color: "#C89B6D" },
    { id: "sol_fonce", label: "Bois foncé", cost: 25, color: "#6B4226" },
    { id: "sol_terracotta", label: "Carreaux terracotta", cost: 35, color: "#C1663B" },
    { id: "sol_terrazzo", label: "Terrazzo", cost: 55, color: "#B7AFA3" },
  ],
  tables: [
    { id: "table_brut", label: "Bois brut", cost: 0, color: "#8B5E34" },
    { id: "table_marbre", label: "Marbre", cost: 45, color: "#D8D2C4" },
    { id: "table_nuit", label: "Bleu nuit", cost: 45, color: "#2E3A59" },
    { id: "table_rotin", label: "Rotin", cost: 35, color: "#C4A468" },
  ],
  plantes: [
    { id: "plante_aucune", label: "Aucune", cost: 0, emoji: "" },
    { id: "plante_basilic", label: "Basilic", cost: 20, emoji: "🌿" },
    { id: "plante_oranger", label: "Oranger", cost: 50, emoji: "🍊" },
    { id: "plante_cactus", label: "Cactus", cost: 15, emoji: "🌵" },
    { id: "plante_bouquet", label: "Bouquet séché", cost: 35, emoji: "💐" },
  ],
  luminaire: [
    { id: "lum_ampoule", label: "Ampoule nue", cost: 0, emoji: "💡" },
    { id: "lum_guirlande", label: "Guirlande", cost: 40, emoji: "✨" },
    { id: "lum_lanterne", label: "Lanterne", cost: 60, emoji: "🏮" },
    { id: "lum_bougies", label: "Bougies", cost: 25, emoji: "🕯️" },
  ],
  decoMurale: [
    { id: "mural_aucun", label: "Aucune", cost: 0, emoji: "" },
    { id: "mural_horloge", label: "Horloge", cost: 30, emoji: "🕐" },
    { id: "mural_tableau", label: "Tableau", cost: 45, emoji: "🖼️" },
    { id: "mural_miroir", label: "Miroir", cost: 55, emoji: "🪞" },
  ],
};
const CATEGORY_LABELS = { murs: "Murs", sols: "Sol", tables: "Tables", plantes: "Plantes", luminaire: "Éclairage", decoMurale: "Décor mural" };

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

function defaultEquipped() {
  return Object.fromEntries(Object.entries(DECOR_CATALOG).map(([cat, items]) => [cat, items[0].id]));
}
function defaultOwned() {
  return new Set(Object.values(DECOR_CATALOG).flatMap((items) => [items[0].id]));
}

// ---- Sauvegarde locale ----
const SAVE_KEY = "onion-ring-cafe-save";

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      coins: typeof data.coins === "number" ? data.coins : 20,
      owned: Array.isArray(data.owned) ? new Set(data.owned) : defaultOwned(),
      equipped: data.equipped || defaultEquipped(),
      totalServed: data.totalServed || 0,
      bestScore: data.bestScore || 0,
    };
  } catch (e) {
    console.warn("Sauvegarde illisible, on repart de zéro.", e);
    return null;
  }
}

function writeSave({ coins, owned, equipped, totalServed, bestScore }) {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ coins, owned: Array.from(owned), equipped, totalServed, bestScore })
    );
  } catch (e) {
    console.warn("Impossible de sauvegarder.", e);
  }
}

// ---- Anneau de friture ----
function Ring({ progress, quality, recipe, onClick, empty, onChooseRecipe }) {
  if (empty) {
    return (
      <div style={{ width: 100, height: 100, borderRadius: 18, border: `2px dashed ${COLORS.gold}55`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, padding: 4 }}>
        {RECIPES.map((r) => (
          <button key={r.id} onClick={() => onChooseRecipe(r.id)} title={r.label} className="flavor-cell" style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15, borderRadius: 6, color: COLORS.text }}>
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
    <button onClick={onClick} title="Cliquer pour sortir de la friture" className={`ring-wrap ${isDanger ? "ring-danger" : ""}`} style={{ position: "relative", width: 92, height: 92, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: conic, transition: "background 0.15s linear" }} />
      <div className="ring-body" style={{ position: "absolute", inset: 8, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color})`, boxShadow: isDanger ? `0 0 14px 4px ${COLORS.coral}88` : `0 0 8px ${color}55` }}>
        <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: `5px solid ${COLORS.bg}`, opacity: 0.35 }} />
        <span className="bubble b1" />
        <span className="bubble b2" />
        <span className="bubble b3" />
      </div>
      <div style={{ position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: "50%", background: COLORS.bg, border: `1px solid ${COLORS.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }} title={recipeInfo.label}>
        {recipeInfo.emoji}
      </div>
      <div style={{ position: "absolute", bottom: -22, left: 0, right: 0, fontSize: 10, color: COLORS.text, fontWeight: 600 }}>{Math.round(pct)}%</div>
    </button>
  );
}

export default function OnionRingCafe() {
  const [view, setView] = useState("cuisine"); // 'cuisine' | 'deco'

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

  // Gestion / progression — chargée depuis la sauvegarde locale si elle existe
  const initialSave = useRef(loadSave()).current;
  const [coins, setCoins] = useState(initialSave ? initialSave.coins : 20);
  const [owned, setOwned] = useState(initialSave ? initialSave.owned : defaultOwned);
  const [equipped, setEquipped] = useState(initialSave ? initialSave.equipped : defaultEquipped);
  const [totalServed, setTotalServed] = useState(initialSave ? initialSave.totalServed : 0);
  const [bestScore, setBestScore] = useState(initialSave ? initialSave.bestScore : 0);
  const [justLoaded, setJustLoaded] = useState(!!initialSave);

  // Sauvegarde automatique à chaque changement de progression
  useEffect(() => {
    writeSave({ coins, owned, equipped, totalServed, bestScore });
  }, [coins, owned, equipped, totalServed, bestScore]);

  useEffect(() => {
    if (justLoaded) {
      showToast("Progression chargée 💾", "good");
      setJustLoaded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((msg, kind = "info") => {
    setToast({ msg, kind, key: nextId() });
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 1400);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const tick = setInterval(() => {
      setBaskets((prev) => prev.map((b) => {
        if (!b) return b;
        const newProgress = b.progress + COOK_SPEED;
        if (newProgress >= 100 + 15) return null;
        return { ...b, progress: newProgress };
      }));

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

  useEffect(() => {
    setBestScore((b) => Math.max(b, score));
  }, [score]);

  const bumpScore = (amount) => {
    setScore((s) => s + amount);
    setCoins((c) => c + amount);
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
    setTotalServed((n) => n + 1);

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

  const resetProgress = () => {
    localStorage.removeItem(SAVE_KEY);
    setCoins(20);
    setOwned(defaultOwned());
    setEquipped(defaultEquipped());
    setTotalServed(0);
    setBestScore(0);
    showToast("Progression réinitialisée", "neutral");
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

  const buyDecor = (category, item) => {
    if (owned.has(item.id)) {
      setEquipped((e) => ({ ...e, [category]: item.id }));
      return;
    }
    if (coins < item.cost) {
      showToast("Pas assez de pièces pour ça...", "bad");
      return;
    }
    setCoins((c) => c - item.cost);
    setOwned((o) => new Set(o).add(item.id));
    setEquipped((e) => ({ ...e, [category]: item.id }));
    showToast(`${item.label} installé·e !`, "good");
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
        @keyframes twinkle { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
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
        .tab-btn { transition: all 0.15s; }
        .tab-btn:hover { transform: translateY(-1px); }
        .decor-card { transition: transform 0.15s, border-color 0.15s; }
        .decor-card:hover { transform: translateY(-2px); border-color: ${COLORS.gold} !important; }
        .sparkle { position: absolute; font-size: 12px; animation: twinkle 1.2s ease-in-out infinite; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: COLORS.gold }}>🧅 Onion Ring Café</h1>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Prototype — friture, recettes &amp; déco</div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Score</div>
            <div className={scoreBump ? "score-bump" : ""} style={{ fontSize: 22, fontWeight: 700, color: COLORS.gold }}>{score}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Combo</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.sage }}>x{combo}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Pièces</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.cream }}>🪙 {coins}</div>
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

      {/* Onglets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className="tab-btn"
          onClick={() => setView("cuisine")}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
            background: view === "cuisine" ? COLORS.gold : COLORS.panel,
            color: view === "cuisine" ? COLORS.bg : COLORS.text,
          }}
        >
          🍳 Cuisine
        </button>
        <button
          className="tab-btn"
          onClick={() => setView("deco")}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
            background: view === "deco" ? COLORS.gold : COLORS.panel,
            color: view === "deco" ? COLORS.bg : COLORS.text,
          }}
        >
          🎨 Déco
        </button>
      </div>

      {view === "cuisine" && !isOpen && (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.coral}`, borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>Le café ferme pour la journée... score final : <strong style={{ color: COLORS.gold }}>{score}</strong></div>
          <button onClick={restart} style={{ background: COLORS.gold, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", color: COLORS.bg }}>
            Rouvrir le café
          </button>
        </div>
      )}

      {view === "cuisine" ? (
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
                <div key={r.id} className="tray-ring" style={{ width: 46, height: 46, borderRadius: "50%", background: QUALITY_COLOR[r.quality], border: `2px solid ${COLORS.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: COLORS.bg }} title={`${RECIPE_BY_ID[r.recipe].label} — ${QUALITY_LABEL[r.quality]}`}>
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
      ) : (
        <DecorShop coins={coins} owned={owned} equipped={equipped} onBuy={buyDecor} totalServed={totalServed} bestScore={bestScore} onReset={resetProgress} />
      )}

      {toast && (
        <div key={toast.key} className="toast-anim" style={{ position: "fixed", bottom: 24, left: "50%", background: toast.kind === "good" ? COLORS.sage : toast.kind === "bad" ? COLORS.coral : COLORS.goldDark, color: COLORS.bg, padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
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
            <button key={r.id} onClick={() => setSelectedRing(r.id)} className="tray-ring" style={{ width: 40, height: 40, borderRadius: "50%", background: QUALITY_COLOR[r.quality], border: selectedRing === r.id ? `3px solid ${COLORS.text}` : `2px solid ${COLORS.bg}`, cursor: "pointer", fontSize: 12 }} title={`${RECIPE_BY_ID[r.recipe].label} — ${QUALITY_LABEL[r.quality]}`}>
              {RECIPE_BY_ID[r.recipe].emoji}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {customers.length === 0 && <div style={{ fontSize: 12, opacity: 0.5 }}>Personne pour l'instant...</div>}
        {customers.map((c) => (
          <button key={c.id} onClick={() => selectedRing && onServe(c.id, selectedRing)} disabled={!selectedRing} className="customer-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.bg, border: `1px solid ${COLORS.gold}44`, borderRadius: 10, padding: "10px 14px", cursor: selectedRing ? "pointer" : "default", opacity: selectedRing ? 1 : 0.6, color: COLORS.text, transition: "border-color 0.15s" }}>
            <span style={{ fontWeight: 700 }}>🧑 {c.name}</span>
            <div style={{ flex: 1, height: 6, margin: "0 12px", borderRadius: 3, background: "#00000055", overflow: "hidden" }}>
              <div className={c.patience <= 25 ? "patience-low" : ""} style={{ height: "100%", width: `${c.patience}%`, background: c.patience > 40 ? COLORS.sage : COLORS.coral, transition: "width 0.2s linear" }} />
            </div>
            <span style={{ fontSize: 11, opacity: 0.7 }}>veut {RECIPE_BY_ID[c.wants].emoji} {RECIPE_BY_ID[c.wants].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DecorShop({ coins, owned, equipped, onBuy, totalServed, bestScore, onReset }) {
  const wallColor = DECOR_CATALOG.murs.find((i) => i.id === equipped.murs)?.color;
  const floorColor = DECOR_CATALOG.sols.find((i) => i.id === equipped.sols)?.color;
  const tableColor = DECOR_CATALOG.tables.find((i) => i.id === equipped.tables)?.color;
  const plantEmoji = DECOR_CATALOG.plantes.find((i) => i.id === equipped.plantes)?.emoji;
  const lumEmoji = DECOR_CATALOG.luminaire.find((i) => i.id === equipped.luminaire)?.emoji;
  const muralEmoji = DECOR_CATALOG.decoMurale.find((i) => i.id === equipped.decoMurale)?.emoji;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20 }}>
      {/* Aperçu de la salle */}
      <div style={{ background: COLORS.panel, borderRadius: 16, padding: 20 }}>
        <h3 style={{ marginTop: 0, color: COLORS.gold, fontSize: 14 }}>APERÇU DE LA SALLE</h3>
        <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", height: 220, background: wallColor, transition: "background 0.3s" }}>
          {lumEmoji === "✨" && (
            <>
              <span className="sparkle" style={{ top: 10, left: 20 }}>✨</span>
              <span className="sparkle" style={{ top: 16, left: 90, animationDelay: "0.3s" }}>✨</span>
              <span className="sparkle" style={{ top: 8, left: 160, animationDelay: "0.6s" }}>✨</span>
            </>
          )}
          {lumEmoji && lumEmoji !== "✨" && (
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", fontSize: 22 }}>{lumEmoji}</div>
          )}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 70, background: floorColor, transition: "background 0.3s" }} />
          <div style={{ position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)", width: 90, height: 44, borderRadius: 6, background: tableColor, transition: "background 0.3s", boxShadow: "0 4px 8px rgba(0,0,0,0.3)" }} />
          {plantEmoji && <div style={{ position: "absolute", bottom: 34, right: 24, fontSize: 30 }}>{plantEmoji}</div>}
          {muralEmoji && <div style={{ position: "absolute", top: 40, left: 24, fontSize: 26 }}>{muralEmoji}</div>}
        </div>

        <div style={{ marginTop: 16, fontSize: 12, opacity: 0.75, lineHeight: 1.8 }}>
          <div>🧾 Clients servis : <strong style={{ color: COLORS.cream }}>{totalServed}</strong></div>
          <div>🏆 Meilleur score : <strong style={{ color: COLORS.cream }}>{bestScore}</strong></div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, opacity: 0.5 }}>💾 Sauvegardé automatiquement dans ce navigateur</div>
        <button
          onClick={onReset}
          style={{
            marginTop: 10, background: "transparent", border: `1px solid ${COLORS.coral}88`,
            color: COLORS.coral, borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer",
          }}
        >
          Réinitialiser ma progression
        </button>
      </div>

      {/* Boutique */}
      <div style={{ background: COLORS.panel, borderRadius: 16, padding: 20 }}>
        <h3 style={{ marginTop: 0, color: COLORS.gold, fontSize: 14 }}>BOUTIQUE — 🪙 {coins} pièces</h3>
        {Object.entries(DECOR_CATALOG).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{CATEGORY_LABELS[cat]}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {items.map((item) => {
                const isOwned = owned.has(item.id);
                const isEquipped = equipped[cat] === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onBuy(cat, item)}
                    className="decor-card"
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      padding: "10px 12px", minWidth: 84, borderRadius: 10, cursor: "pointer",
                      background: COLORS.bg, border: isEquipped ? `2px solid ${COLORS.gold}` : "2px solid transparent",
                      color: COLORS.text,
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: item.color || COLORS.panel, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                      {item.emoji || ""}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>
                      {isEquipped ? "Installé" : isOwned ? "Équiper" : item.cost === 0 ? "Gratuit" : `🪙 ${item.cost}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}