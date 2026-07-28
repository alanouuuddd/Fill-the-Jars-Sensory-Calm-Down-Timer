(() => {
  const NUM_JARS = 8;
  const JAR_W = 90, JAR_H = 135, GAP = 14;
  const FILL_TOP = 9, FILL_BOTTOM = 134;
  const OVERLAY_H = 44;
  const TOTAL_W = NUM_JARS * JAR_W + (NUM_JARS - 1) * GAP;
  const FALL_MS = 750;
  const FLOW_SPEED = 1;
  const DRIP_INTERVAL = 900 / FLOW_SPEED;

  const JAR_COLORS = [
    "oklch(0.70 0.19 25)",   // red-orange
    "oklch(0.75 0.17 55)",   // orange
    "oklch(0.85 0.16 95)",   // yellow
    "oklch(0.75 0.17 140)",  // green
    "oklch(0.72 0.15 190)",  // teal/cyan
    "oklch(0.68 0.16 250)",  // blue
    "oklch(0.65 0.18 290)",  // purple
    "oklch(0.70 0.19 330)",  // pink/magenta
  ];

  const withAlpha = (color, alpha) => color.replace(")", ` / ${alpha})`);

  const jarX = (i) => i * (JAR_W + GAP) + JAR_W / 2;

  const rowOuter = document.getElementById("rowOuter");
  const jarsRow = document.getElementById("jarsRow");
  const spout = document.getElementById("spout");
  const dropsLayer = document.getElementById("dropsLayer");
  const ring = document.getElementById("ring");
  const splashLayer = document.getElementById("splashLayer");
  const setupCard = document.getElementById("setupCard");
  const resetButton = document.getElementById("resetButton");
  const startButton = document.getElementById("startButton");
  const minutesInput = document.getElementById("minutesInput");
  const secondsInput = document.getElementById("secondsInput");

  rowOuter.style.width = `${TOTAL_W}px`;
  rowOuter.style.height = `${OVERLAY_H + JAR_H}px`;

  let phase = "setup";
  let activeIndex = 0;
  let dropsLanded = 0;
  let totalDropsPerJar = 1;
  let dripTimer = null;

  const jars = [];

  function buildJars() {
    for (let i = 0; i < NUM_JARS; i++) {
      const color = JAR_COLORS[i];

      const wrap = document.createElement("div");
      wrap.className = "jar";

      const glow = document.createElement("div");
      glow.className = "jar-glow";
      glow.style.background = color;

      const clip = document.createElement("div");
      clip.className = "jar-clip";

      const water = document.createElement("div");
      water.className = "jar-water";
      water.style.background = `linear-gradient(180deg, ${withAlpha(color, 0.85)}, ${color})`;
      water.style.boxShadow = `inset 0 0 18px ${withAlpha(color, 0.9)}`;

      const wave = document.createElement("div");
      wave.className = "jar-wave";
      wave.style.background = `radial-gradient(ellipse at center, ${withAlpha(color, 0.6)} 40%, transparent 60%) repeat-x`;
      wave.style.animationDuration = `${3.5 / FLOW_SPEED}s`;

      const highlight = document.createElement("div");
      highlight.className = "jar-highlight";

      water.appendChild(wave);
      clip.appendChild(water);
      clip.appendChild(highlight);

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "jar-outline");
      svg.setAttribute("width", JAR_W);
      svg.setAttribute("height", JAR_H);
      svg.setAttribute("viewBox", `0 0 ${JAR_W} ${JAR_H}`);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M28,0 L62,0 L62,10 C62,19 69,19 78,26 L82,110 C82,123 82,135 69,135 L21,135 C8,135 8,123 8,110 L13,26 C21,19 28,19 28,10 Z");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "rgba(255,255,255,0.55)");
      path.setAttribute("stroke-width", "2.5");
      svg.appendChild(path);

      const badge = document.createElement("div");
      badge.className = "jar-badge";
      badge.style.background = color;
      badge.style.boxShadow = `0 0 10px ${color}, 0 3px 8px rgba(0,0,0,0.4)`;
      badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`;

      wrap.appendChild(glow);
      wrap.appendChild(clip);
      wrap.appendChild(svg);
      wrap.appendChild(badge);
      jarsRow.appendChild(wrap);

      jars.push({ progress: 0, filled: false, glow, water, badge });
    }
  }

  function setJarProgress(i, progress) {
    const jar = jars[i];
    jar.progress = progress;
    jar.filled = progress >= 1;
    const heightPct = Math.min(100, progress * 100);
    jar.glow.style.height = `${heightPct}%`;
    jar.glow.style.opacity = heightPct > 0 ? "0.65" : "0";
    jar.water.style.height = `${heightPct}%`;
    jar.badge.classList.toggle("visible", jar.filled);
  }

  function resetJars() {
    for (let i = 0; i < NUM_JARS; i++) setJarProgress(i, 0);
  }

  function spawnDrop(idx) {
    const p = jars[idx].progress;
    const waterY = FILL_BOTTOM - p * (FILL_BOTTOM - FILL_TOP);
    const endY = Math.max(FILL_TOP + 6, waterY) + OVERLAY_H;

    const drop = document.createElement("div");
    drop.className = "drop";
    drop.style.left = `${jarX(idx)}px`;
    drop.style.background = JAR_COLORS[idx];
    drop.style.setProperty("--end", `${endY}px`);
    dropsLayer.appendChild(drop);

    setTimeout(() => {
      drop.remove();
      if (phase !== "running") return;
      dropsLanded += 1;
      const np = Math.min(1, dropsLanded / totalDropsPerJar);
      setJarProgress(idx, np);
      if (np >= 1) {
        if (idx >= NUM_JARS - 1) {
          completeFill();
        } else {
          activeIndex = idx + 1;
          dropsLanded = 0;
          updateSpout();
        }
      }
    }, FALL_MS);
  }

  function updateSpout() {
    spout.style.left = `${jarX(activeIndex)}px`;
  }

  function startDripping() {
    clearInterval(dripTimer);
    dripTimer = setInterval(() => {
      if (phase !== "running") return;
      spawnDrop(activeIndex);
    }, DRIP_INTERVAL);
  }

  function onStart() {
    const minutes = Math.max(0, Math.min(180, Number(minutesInput.value) || 0));
    const seconds = Math.max(0, Math.min(59, Number(secondsInput.value) || 0));
    const duration = Math.max(1, minutes * 60 + seconds);
    const segDuration = duration / NUM_JARS;
    totalDropsPerJar = Math.max(1, Math.round((segDuration * 1000) / DRIP_INTERVAL));

    phase = "running";
    activeIndex = 0;
    dropsLanded = 0;
    resetJars();
    dropsLayer.innerHTML = "";
    splashLayer.innerHTML = "";

    setupCard.hidden = true;
    resetButton.hidden = true;
    ring.hidden = true;
    spout.hidden = false;
    updateSpout();

    startDripping();
  }

  function completeFill() {
    clearInterval(dripTimer);
    phase = "complete";
    spout.hidden = true;

    ring.hidden = false;
    ring.style.left = "50%";
    ring.style.borderColor = JAR_COLORS[NUM_JARS - 1];
    ring.style.border = `2px solid ${JAR_COLORS[NUM_JARS - 1]}`;
    // restart the animation
    ring.style.animation = "none";
    void ring.offsetWidth;
    ring.style.animation = "";

    const cx = TOTAL_W / 2;
    for (let i = 0; i < 18; i++) {
      const angle = (Math.random() * 160 - 80) * (Math.PI / 180);
      const dist = 40 + Math.random() * 60;
      const sx = Math.sin(angle) * dist;
      const sy = -Math.abs(Math.cos(angle) * dist) - Math.random() * 20;
      const size = 6 + Math.random() * 6;
      const color = JAR_COLORS[i % JAR_COLORS.length];

      const drop = document.createElement("div");
      drop.className = "splash-drop";
      drop.style.left = `${cx}px`;
      drop.style.top = `${OVERLAY_H + 20}px`;
      drop.style.width = `${size}px`;
      drop.style.height = `${size}px`;
      drop.style.marginLeft = `-${size / 2}px`;
      drop.style.background = color;
      drop.style.boxShadow = `0 0 10px ${color}`;
      drop.style.setProperty("--sx", `${sx}px`);
      drop.style.setProperty("--sy", `${sy + 60}px`);
      drop.style.setProperty("--dur", `${(0.7 + Math.random() * 0.3).toFixed(2)}s`);
      drop.style.setProperty("--delay", `${(Math.random() * 0.15).toFixed(2)}s`);
      splashLayer.appendChild(drop);
    }

    setTimeout(() => {
      splashLayer.innerHTML = "";
    }, 1400);

    setTimeout(() => {
      resetButton.hidden = false;
    }, 600);
  }

  function onReset() {
    clearInterval(dripTimer);
    phase = "setup";
    activeIndex = 0;
    dropsLanded = 0;
    resetJars();
    dropsLayer.innerHTML = "";
    splashLayer.innerHTML = "";
    ring.hidden = true;
    spout.hidden = true;
    resetButton.hidden = true;
    setupCard.hidden = false;
  }

  buildJars();
  startButton.addEventListener("click", onStart);
  resetButton.addEventListener("click", onReset);
})();
