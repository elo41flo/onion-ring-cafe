import { useState, useEffect, useRef, useCallback } from "react";

// ---- Palette du café ----
// Amande brûlée / friture chaude, pas le combo crème+terracotta par défaut
const COLORS = {
  bg: "#2E2115",        // brun noyer profond (fond du comptoir)
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
const COOK_SPEED = 0.9; // % par tick (100ms)
const RAW_MAX = 35;
const PERFECT_MAX = 75;
const OVERCOOKED_MAX = 95;

let idCounter = 1;
const nextId = () => idCounter++;

function qualityFromProgress(p) {
  if (p < RAW_MAX) return "cru";
  if (p < PERFECT_MAX) return "parfait";
  if (p < OVERCOOKED_MAX) return "trop_cuit";
  return "brule";
}

const QUALITY_LABEL = {
  cru: "Cru",
  parfait: "Parfait",
  trop_cuit: "Trop cuit",
  brule: "Brûlé",
};

const QUALITY_POINTS = {
  cru: 1,
  parfait: 3,
  trop_cuit: 1,
  brule: 0,
};

const QUALITY_COLOR = {
  cru: COLORS.raw,
  parfait: COLORS.perfect,
  trop_cuit: COLORS.overcooked,
  brule: COLORS.burnt,
};

const CUSTOMER_NAMES = [
  "Léo", "Mina", "Théo", "Nour", "Sacha", "Iris", "Noa", "Camille", "Rayan", "Zoé",
];

function makeCustomer() {
  return {
    id: nextId(),
    name: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
    patience: 100,
    wants: "parfait", // ce que le client espère, sert juste à l'affichage/bonus
  };
}

function Ring({ progress, quality, onClick, empty }) {
  if (empty) {
    return (
      <button
        onClick={onClick}
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          border: `2px dashed ${COLORS.gold}55`,
          background: "transparent",
          color: `${COLORS.gold}88`,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        + oignon
      </button>
    );
  }

  const color = QUALITY_COLOR[quality];
  const pulse = quality === "trop_cuit";

  return (
    <button
      onClick={onClick}
      title="Cliquer pour sortir de la friture"
      style={{
        position: "relative",
        width: 88,
        height: 88,
        borderRadius: "50%",
        border: `4px solid ${color}`,
        background: `radial-gradient(circle at 35% 30%, ${color}cc, ${color})`,
        cursor: "pointer",
        boxShadow: pulse ? `0 0 14px 4px ${COLORS.coral}88` : `0 0 8px ${color}66`,
        transition: "box-shadow 0.3s",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 8,
          borderRadius: "50%",
          border: `6px solid ${COLORS.bg}`,
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -22,
          left: 0,
          right: 0,
          fontSize: 10,
          color: COLORS.text,
          fontWeight: 600,
          letterSpacing: 0.3,
        }}
      >
        {Math.min(100, Math.round(progress))}%
      </div>
    </button>
  );
}

export default function OnionRingCafe() {
  const [baskets, setBaskets] = useState(
    Array.from({ length: BASKET_COUNT }, () => null)
  );
  const [tray, setTray] = useState([]);
  const [customers, setCustomers] = useState([makeCustomer()]);
  const [score, setScore] = useState(0);
  const [reputation, setReputation] = useState(3);
  const [combo, setCombo] = useState(0);
  const [toast, setToast] = useState(null);
  const [running, setRunning] = useState(true);
  const toastTimeout = useRef(null);

  const showToast = useCallback((msg, kind = "info") => {
    setToast({ msg, kind });
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 1400);
  }, []);

  // Boucle de jeu
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      // Cuisson
      setBaskets((prev) =>
        prev.map((b) => {
          if (!b) return b;
          const newProgress = b.progress + COOK_SPEED;
          if (newProgress >= 100 + 15) {
            // ring carbonisé, perdu automatiquement
            return null;
          }
          return { ...b, progress: newProgress };
        })
      );

      // Patience des clients
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
  }, [running, showToast]);

  // Arrivée de nouveaux clients
  useEffect(() => {
    if (!running) return;
    const spawn = setInterval(() => {
      setCustomers((prev) => {
        if (prev.length >= 4) return prev;
        return [...prev, makeCustomer()];
      });
    }, 4500);
    return () => clearInterval(spawn);
  }, [running]);

  const addRing = (index) => {
    setBaskets((prev) => {
      if (prev[index]) return prev;
      const copy = [...prev];
      copy[index] = { id: nextId(), progress: 0 };
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
        return [...t, { id: nextId(), quality }];
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
    if (!ring) return;

    setTray((t) => t.filter((r) => r.id !== ringId));
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));

    const base = QUALITY_POINTS[ring.quality];
    const bonus = ring.quality === "parfait" ? combo : 0;
    setScore((s) => s + base + bonus);

    if (ring.quality === "parfait") {
      setCombo((c) => c + 1);
      showToast(`Client ravi ! +${base + bonus}`, "good");
    } else {
      setCombo(0);
      showToast(`Servi (+${base})`, "neutral");
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

  const [running, setRunning] = useState(true);
const isOpen = running && reputation > 0;

  return (
    <div
      style={{
        minHeight: "100%",
        background: `linear-gradient(180deg, ${COLORS.bg}, #1c130c)`,
        color: COLORS.text,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: COLORS.gold }}>
            🧅 Onion Ring Café
          </h1>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Prototype — module friture &amp; service
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Score</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.gold }}>
              {score}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Combo parfait</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.sage }}>
              x{combo}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Réputation</div>
            <div style={{ fontSize: 18 }}>
              {"⭐".repeat(reputation)}
              <span style={{ opacity: 0.25 }}>
                {"⭐".repeat(3 - reputation)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!running && (
        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.coral}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            Le café ferme pour la journée... score final :{" "}
            <strong style={{ color: COLORS.gold }}>{score}</strong>
          </div>
          <button
            onClick={restart}
            style={{
              background: COLORS.gold,
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 700,
              cursor: "pointer",
              color: COLORS.bg,
            }}
          >
            Rouvrir le café
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        {/* Friture */}
        <div
          style={{
            background: COLORS.panel,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h3 style={{ marginTop: 0, color: COLORS.gold, fontSize: 14 }}>
            FRITEUSE — clique pour ajouter, reclique pour sortir
          </h3>
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              paddingTop: 10,
              paddingBottom: 30,
            }}
          >
            {baskets.map((b, i) => {
              if (!b) {
                return (
                  <Ring key={i} empty onClick={() => addRing(i)} />
                );
              }
              const quality = qualityFromProgress(b.progress);
              return (
                <Ring
                  key={b.id}
                  progress={b.progress}
                  quality={quality}
                  onClick={() => pullRing(i)}
                />
              );
            })}
          </div>

          <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.6 }}>
            🟡 Cru (0–{RAW_MAX}%) → 🟠 Parfait ({RAW_MAX}–{PERFECT_MAX}%) → 🟤
            Trop cuit ({PERFECT_MAX}–{OVERCOOKED_MAX}%) → ⚫ Brûlé (perdu)
          </div>

          <h3 style={{ color: COLORS.gold, fontSize: 14, marginTop: 24 }}>
            PLATEAU ({tray.length}/{TRAY_MAX})
          </h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", minHeight: 60 }}>
            {tray.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.5 }}>Vide pour l'instant</div>
            )}
            {tray.map((r) => (
              <div
                key={r.id}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: QUALITY_COLOR[r.quality],
                  border: `2px solid ${COLORS.bg}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: COLORS.bg,
                }}
                title={QUALITY_LABEL[r.quality]}
              >
                {r.quality === "parfait" ? "★" : ""}
              </div>
            ))}
          </div>
        </div>

        {/* Clients */}
        <div
          style={{
            background: COLORS.panel,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h3 style={{ marginTop: 0, color: COLORS.gold, fontSize: 14 }}>
            CLIENTS — clique un oignon du plateau puis un client
          </h3>
          <ServeArea customers={customers} tray={tray} onServe={serve} />
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              toast.kind === "good"
                ? COLORS.sage
                : toast.kind === "bad"
                ? COLORS.coral
                : COLORS.goldDark,
            color: COLORS.bg,
            padding: "8px 18px",
            borderRadius: 20,
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
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
        {selectedRing
          ? "Oignon sélectionné — clique un client pour servir"
          : "Sélectionne d'abord un oignon dans le plateau"}
      </div>

      {tray.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tray.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRing(r.id)}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: QUALITY_COLOR[r.quality],
                border:
                  selectedRing === r.id
                    ? `3px solid ${COLORS.text}`
                    : `2px solid ${COLORS.bg}`,
                cursor: "pointer",
              }}
              title={QUALITY_LABEL[r.quality]}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {customers.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.5 }}>Personne pour l'instant...</div>
        )}
        {customers.map((c) => (
          <button
            key={c.id}
            onClick={() => selectedRing && onServe(c.id, selectedRing)}
            disabled={!selectedRing}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: COLORS.bg,
              border: `1px solid ${COLORS.gold}44`,
              borderRadius: 10,
              padding: "10px 14px",
              cursor: selectedRing ? "pointer" : "default",
              opacity: selectedRing ? 1 : 0.6,
              color: COLORS.text,
            }}
          >
            <span style={{ fontWeight: 700 }}>🧑 {c.name}</span>
            <div
              style={{
                flex: 1,
                height: 6,
                margin: "0 12px",
                borderRadius: 3,
                background: "#00000055",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${c.patience}%`,
                  background:
                    c.patience > 40 ? COLORS.sage : COLORS.coral,
                  transition: "width 0.2s linear",
                }}
              />
            </div>
            <span style={{ fontSize: 11, opacity: 0.7 }}>espère un ★</span>
          </button>
        ))}
      </div>
    </div>
  );
}