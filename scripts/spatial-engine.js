/**
 * scripts/spatial-engine.js — v3 8-Way Gesture OS
 *
 * UPGRADE: 8-way angular swipe (N, S, E, W, NE, NW, SE, SW),
 *          minimalist UX (no zoom/buttons), pattern-based discovery.
 */

// =============================================================================
// PROCEDURAL ROOM ENGINE — Infinite Deterministic Generation
// =============================================================================
class ProceduralRoomEngine {
  constructor() {
    this.sectors = ["Nexus", "Obsidian", "Quantum", "Aegis", "Void", "Echo", "Helios", "Apex"];
    this.departments = ["Archives", "Engineering", "Synthetics", "Logic Core", "Terminal", "Containment", "Armory", "Hub"];
    this.descriptors = ["Classified operations", "Automated drone bay", "Abandoned data sector", "High-security vault", "Processing relay", "Dormant server farm"];
  }

  getRoom(seed, overrideZ = null) {
    if (!seed || seed === '0,0' || seed === 'center' || seed === '0') {
      return { title: 'Galaxy Center', desc: 'The main nexus.', z: overrideZ !== null ? overrideZ : 0 };
    }

    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    hash = Math.abs(hash);
    
    const sector = this.sectors[hash % this.sectors.length];
    const dept = this.departments[(hash * 7) % this.departments.length];
    const desc = this.descriptors[(hash * 11) % this.descriptors.length];

    // Z depth derived from pattern complexity (length) if not overridden
    let z = overrideZ;
    if (z === null) {
      z = 0;
      if (seed.length > 20) z = -99;
      else if (seed.length > 14) z = -10;
      else if (seed.length > 7) z = -1;
    }

    if (z === 0) {
      return { title: `${sector} ${dept}`, desc: `Surface Level: ${desc}`, z };
    } else if (z < 0) {
      return { title: `${sector} ${dept} // Sub-Level ${Math.abs(z)}`, desc: `Deep Storage: ${desc}`, z };
    } else {
      return { title: `${sector} ${dept} // Tower ${z}`, desc: `Atmospheric: ${desc}`, z };
    }
  }
}

const RoomMatrix = new ProceduralRoomEngine();

// =============================================================================
// SPATIAL MATRIX — Warp Gate Engine
// =============================================================================
class SpatialMatrix {
  constructor() {
    this.windowManager = document.getElementById('window-manager');
    this.roomName  = document.getElementById('hud-room-name');
    this.roomDesc  = document.getElementById('hud-room-desc');

    // 3D global OS state
    this.currentSeed = '0,0';
    this.currentZ = 0;

    this.attachDelegatedListeners();
    this.attachWarpListener();
    
    // Spawn initial OS Nexus window
    const room = RoomMatrix.getRoom(this.currentSeed, this.currentZ);
    this.spawnWindow(room, this.currentSeed);
    this.updateHUD(room);
  }

  attachWarpListener() {
    window.addEventListener('os:pattern_locked', (e) => {
      if (e.detail && e.detail.seed) {
        this.handleWarpGate(e.detail.seed);
      }
    });
  }

  async handleWarpGate(seed) {
    this.currentSeed = seed;

    // ─── 1. INTERCEPT: Glyph Launcher Deep Links ───
    const glyphIntent = window.GlyphRegistry ? window.GlyphRegistry[seed] : null;

    if (glyphIntent) {
      // Spawn temporary handoff window
      const tempWin = this.spawnWindow({ title: glyphIntent.name, z: 0 }, seed, true);

      // Execute Native Action
      if (glyphIntent.action === "link") {
        window.location.href = glyphIntent.link;
        setTimeout(() => { window.location.href = glyphIntent.fallback; }, 1500);
      } 
      else if (glyphIntent.action === "file_picker") {
        const filePicker = document.getElementById('native-file-picker');
        if (filePicker) filePicker.click();
        
        setTimeout(() => { tempWin.remove(); }, 800);
      }
      return; 
    }

    // ─── 2. INTERNAL: Procedural Infinite Spatial Skyscraper ───
    
    const room = RoomMatrix.getRoom(seed);
    this.currentZ = room.z;

    this.spawnWindow(room, seed);
    this.updateHUD(room);
    this.dispatchNodeChanged(room);
  }

  updateHUD(room) {
    if (!room) return;
    if (this.roomName) this.roomName.textContent = room.title;
    if (this.roomDesc) this.roomDesc.textContent = room.desc;
  }

  renderNodeContent(node, seed, z) {
    const room = RoomMatrix.getRoom(seed, z);
    if (!room) return;

    let html = `<h2>${room.title}</h2><div id="room-environment" class="node-grid">`;

    // hash to generate dummy nodes based on seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    hash = Math.abs(hash);
    
    // Always provide ascend/descend nodes based on formal spec rules
    if (z <= 0) {
      html += `<button class="access-node depth-descend" data-delta="-1">[ DECRYPT : SUB-LEVEL ${Math.abs(z - 1)} ]</button>`;
    }
    if (z < 0) {
      html += `<button class="access-node depth-ascend" data-delta="1">[ AIRLOCK : RETURN TO Z-${z + 1} ]</button>`;
    }

    // Add dummy active nodes to make the room feel operational (1 to 3)
    const dummyCount = (hash % 3) + 1;
    const dummyTasks = ["EXTRACT LOGS", "SYSTEM SCAN", "SYNC TERMINAL", "BYPASS PROTOCOL", "MONITOR FEED", "DIAGNOSTIC"];
    
    for (let i = 0; i < dummyCount; i++) {
        const tIndex = (hash + i * 5) % dummyTasks.length;
        html += `<button class="access-node dummy-node">[ ${dummyTasks[tIndex]} ]</button>`;
    }

    html += `</div>`;
    node.innerHTML = html;
  }

  spawnWindow(room, seed, isTemporary = false) {
    if (!isTemporary && this.windowManager.children.length >= 2) {
      // Enforce max 2 windows, remove oldest (FIFO)
      const oldest = this.windowManager.firstElementChild;
      oldest.style.transform = 'scale(0.9)';
      oldest.style.opacity = '0';
      setTimeout(() => oldest.remove(), 300);
    }

    const win = document.createElement('div');
    win.className = 'glass-window';

    const header = document.createElement('div');
    header.className = 'window-header';
    header.innerHTML = `
      <span class="header-title">${room.title.toUpperCase()}</span>
      <span class="header-close-btn" title="Close Window">X</span>
    `;

    const body = document.createElement('div');
    body.className = 'window-body';
    
    if (isTemporary) {
      body.innerHTML = `<h2 style="color:var(--matrix-green); text-shadow:0 0 20px var(--matrix-green); border:1px solid var(--matrix-green); padding:20px; text-align:center;">[ INITIATING HANDOFF : ${room.title.toUpperCase()} ]</h2>`;
    } else {
      this.renderNodeContent(body, seed, room.z);
    }

    win.appendChild(header);
    win.appendChild(body);
    this.windowManager.appendChild(win);
    
    return win;
  }

  dispatchNodeChanged(room) {
    window.dispatchEvent(new CustomEvent('os:node_changed', {
      detail: { 
        seed: this.currentSeed,
        z: this.currentZ, 
        title: room ? room.title : 'Uncharted Sector' 
      }
    }));
  }

  // ─── Z-AXIS ELEVATOR (INTERACTIVE DEPTH) ────────────────────────────────────

  attachDelegatedListeners() {
    this.windowManager.addEventListener('click', (e) => {
      // 1. Handle Window Close
      if (e.target.classList.contains('header-close-btn')) {
        const win = e.target.closest('.glass-window');
        if (win) {
          win.style.transform = 'scale(0.9)';
          win.style.opacity = '0';
          setTimeout(() => win.remove(), 250);
        }
        return;
      }

      // 2. Handle Sub-Level Dive
      const target = e.target.closest('.depth-ascend, .depth-descend');
      if (!target) return;
      
      const delta = parseInt(target.getAttribute('data-delta'));
      if (delta) {
        const winBody = e.target.closest('.window-body');
        const headerTitle = e.target.closest('.glass-window').querySelector('.header-title');
        this.changeFloor(delta, winBody, headerTitle);
      }
    });
  }

  async changeFloor(delta, windowBody, headerTitle) {
    const targetZ = this.currentZ + delta;
    const room = RoomMatrix.getRoom(this.currentSeed, targetZ);
    if (!room) return;

    this.currentZ = targetZ;
    this.updateHUD(room);
    if (headerTitle) headerTitle.textContent = room.title.toUpperCase();

    // Visual dive within the specific window panel
    windowBody.style.transition = 'opacity 0.3s ease, transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    windowBody.style.opacity = '0';
    windowBody.style.transform = `scale(${delta < 0 ? 1.2 : 0.8})`;

    await new Promise(r => setTimeout(r, 400));
    
    this.renderNodeContent(windowBody, this.currentSeed, this.currentZ);

    windowBody.style.transition = 'none';
    windowBody.style.transform = `scale(${delta < 0 ? 0.8 : 1.2})`;

    requestAnimationFrame(() => {
      windowBody.style.transition = 'opacity 0.4s ease, transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
      windowBody.style.opacity = '1';
      windowBody.style.transform = `scale(1.0)`;
    });

    this.dispatchNodeChanged(room);
    window.dispatchEvent(new CustomEvent('os:floor_changed', { detail: { z: this.currentZ } }));
  }
}

document.addEventListener('DOMContentLoaded', () => { window.OS = new SpatialMatrix(); });
