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

  getRoom(x, y, z) {
    if (x === 0 && y === 0 && z === 0) {
      return { title: 'Galaxy Center', desc: 'The main nexus.' };
    }

    const hash = Math.abs(x * 13 + y * 31 + z * 17);
    
    const sector = this.sectors[hash % this.sectors.length];
    const dept = this.departments[(hash * 7) % this.departments.length];
    const desc = this.descriptors[(hash * 11) % this.descriptors.length];

    if (z === 0) {
      return { 
        title: `${sector} ${dept}`, 
        desc: `Surface Level: ${desc}` 
      };
    } else if (z < 0) {
      return { 
        title: `${sector} ${dept} // Sub-Level ${Math.abs(z)}`, 
        desc: `Deep Storage: ${desc}` 
      };
    } else {
      return { 
        title: `${sector} ${dept} // Tower ${z}`, 
        desc: `Atmospheric: ${desc}` 
      };
    }
  }
}

const RoomMatrix = new ProceduralRoomEngine();

// =============================================================================
// GESTURE INTERCEPTOR — 8-Way Angular Logic
// =============================================================================
class GestureInterceptor {
  constructor(onSwipe) {
    this.onSwipe = onSwipe;
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.isTracking = false;

    this.SWIPE_THRESHOLD = 40; // px
    this.SWIPE_TIME_MAX = 800; // ms

    this.bindListeners();
  }

  bindListeners() {
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
    // Use pointer events for modern consistency same as Mars
    document.addEventListener('pointerup', (e) => this.handlePointerUp(e), { passive: true });
    document.addEventListener('pointerdown', (e) => this.handlePointerDown(e), { passive: true });
  }

  isScrollableElement(target) {
    return target.closest('.scroll-area, canvas, [data-no-swipe], #btn-conclude-mission') !== null;
  }

  handlePointerDown(e) {
    if (this.isScrollableElement(e.target)) { this.isTracking = false; return; }
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startTime = Date.now();
    this.isTracking = true;
  }

  handleTouchStart(e) {
    // Legacy support
    if (e.touches.length > 1) return;
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.startTime = Date.now();
    this.isTracking = true;
  }

  handlePointerUp(e) {
    if (!this.isTracking) return;
    this.isTracking = false;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const duration = Date.now() - this.startTime;

    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < this.SWIPE_THRESHOLD || duration > this.SWIPE_TIME_MAX) return;

    // Angle-based 8-way segmentation (0 to 360)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    let dir = '';

    // E: East, S: South, W: West, N: North, etc.
    if (angle >= -22.5 && angle < 22.5) dir = 'E';
    else if (angle >= 22.5 && angle < 67.5) dir = 'SE';
    else if (angle >= 67.5 && angle < 112.5) dir = 'S';
    else if (angle >= 112.5 && angle < 157.5) dir = 'SW';
    else if (angle >= 157.5 || angle < -157.5) dir = 'W';
    else if (angle >= -157.5 && angle < -112.5) dir = 'NW';
    else if (angle >= -112.5 && angle < -67.5) dir = 'N';
    else if (angle >= -67.5 && angle < -22.5) dir = 'NE';

    if (dir) {
      this.onSwipe(dir);
    }
  }
}

// =============================================================================
// SPATIAL MATRIX — 8-Way Navigation Engine
// =============================================================================
class SpatialMatrix {
  constructor() {
    this.canvas    = document.getElementById('spatial-canvas');
    this.minimap   = document.getElementById('os-minimap');
    this.roomName  = document.getElementById('hud-room-name');
    this.roomDesc  = document.getElementById('hud-room-desc');
    this.btnDescend = document.getElementById('btn-descend');
    this.btnAscend  = document.getElementById('btn-ascend');

    // 3D global OS state
    this.currentX = 0;
    this.currentY = 0;
    this.currentZ = 0;

    this.initMinimap();
    this.setupGestureInterceptor();
    this.updateCamera();
    this.updateHUD();
    this.updateAllNodeLabels();
    this.attachMinimapListener();
    this.attachZButtonListeners();
    this.checkZAxis();
    
    // Auto-spawn nodes for discovery (mock for v3)
    this.ensureDiscoveryNodes();
  }

  getRoomKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  getRoomAt(x, y, z) {
    return RoomMatrix.getRoom(x, y, z);
  }

  getCurrentRoom() {
    return this.getRoomAt(this.currentX, this.currentY, this.currentZ);
  }

  initMinimap() {
    this.minimap.innerHTML = '';
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        const dot = document.createElement('div');
        dot.className = 'hud-dot';
        dot.setAttribute('data-x', x);
        dot.setAttribute('data-y', y);
        if (x === this.currentX && y === this.currentY) dot.classList.add('active');
        this.minimap.appendChild(dot);
      }
    }
  }

  setupGestureInterceptor() {
    this.interceptor = new GestureInterceptor((dir) => this.handleDirectionalSwipe(dir));
  }

  handleDirectionalSwipe(dir) {
    let moveX = 0;
    let moveY = 0;

    // Map 8 directions to coordinate shifts
    switch(dir) {
      case 'N':  moveY = -1; break;
      case 'S':  moveY = 1;  break;
      case 'W':  moveX = 1;  break;
      case 'E':  moveX = -1; break;
      case 'NW': moveX = 1;  moveY = -1; break;
      case 'NE': moveX = -1; moveY = -1; break;
      case 'SW': moveX = 1;  moveY = 1;  break;
      case 'SE': moveX = -1; moveY = 1;  break;
    }

    this.requestMove(moveX, moveY);
  }

  requestMove(moveX, moveY) {
    const tx = this.currentX + moveX;
    const ty = this.currentY + moveY;

    // Procedural engine guarantees a room exists at any coordinate
    if (this.getRoomAt(tx, ty, this.currentZ)) {
      this.currentX = tx;
      this.currentY = ty;
      
      // Infinite DOM scaling — ensure node exists visually
      this.ensureNodeExists(this.currentX, this.currentY);
      
      this.updateCamera();
      this.updateHUD();
      this.updateAllNodeLabels();
      this.checkZAxis(); // Update elevator buttons
      this.dispatchNodeChanged();
    }
  }

  teleportTo(x, y, z) {
    if (!this.getRoomAt(x, y, z)) return;
    this.currentX = x;
    this.currentY = y;
    this.currentZ = z;
    this.updateCamera();
    this.updateHUD();
    this.updateAllNodeLabels();
    this.dispatchNodeChanged();
  }

  updateCamera() {
    const tx = (this.currentX * 100) - 100;
    const ty = (this.currentY * -100) - 100;
    // Zoom removed for discovery focus
    this.canvas.style.transform = `translate3d(calc(${tx}vw), calc(${ty}vh), 0) scale(1.0)`;
  }

  updateHUD() {
    const room = this.getCurrentRoom();
    if (!room) return;
    if (this.roomName) this.roomName.textContent = room.title;
    if (this.roomDesc) this.roomDesc.textContent = room.desc;
  }

  updateAllNodeLabels() {
    document.querySelectorAll('.os-node').forEach(node => {
      const nx = parseInt(node.getAttribute('data-x'));
      const ny = parseInt(node.getAttribute('data-y'));
      const room = this.getRoomAt(nx, ny, this.currentZ);
      const h2 = node.querySelector('h2');
      if (h2 && room) h2.textContent = room.title;
    });
  }

  ensureNodeExists(x, y) {
    const existing = document.querySelector(`.os-node[data-x="${x}"][data-y="${y}"]`);
    if (!existing) {
      const node = document.createElement('div');
      node.className = 'os-node discovery-node';
      node.setAttribute('data-x', x);
      node.setAttribute('data-y', y);
      node.innerHTML = `<h2>Loading...</h2>`;
      
      // Calculate dynamic VW/VH position relative to 0,0 center at 100vw, 100vh
      const top = 100 + (y * 100);
      const left = 100 + (x * 100);
      
      node.style.top = `${top}vh`;
      node.style.left = `${left}vw`;
      this.canvas.appendChild(node);
    }
  }

  ensureDiscoveryNodes() {
    // Generate initial ring around Lobby to ensure immediate visual context
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        this.ensureNodeExists(x, y);
      }
    }
  }

  dispatchNodeChanged() {
    const room = this.getCurrentRoom();
    window.dispatchEvent(new CustomEvent('os:node_changed', {
      detail: { 
        x: this.currentX, 
        y: this.currentY, 
        z: this.currentZ, 
        title: room ? room.title : 'Uncharted Sector' 
      }
    }));
  }

  // ─── Z-AXIS ELEVATOR ────────────────────────────────────────────────────────

  checkZAxis() {
    if (!this.btnAscend || !this.btnDescend) return;
    
    // In infinite procedural generation, there is always an up and down
    this.btnAscend.style.display  = 'flex';
    this.btnDescend.style.display = 'flex';
  }

  attachZButtonListeners() {
    if (this.btnAscend) {
      this.btnAscend.addEventListener('click', () => this.changeFloor(1));
    }
    if (this.btnDescend) {
      this.btnDescend.addEventListener('click', () => this.changeFloor(-1));
    }
  }

  async changeFloor(delta) {
    const targetZ = this.currentZ + delta;
    if (!this.getRoomAt(this.currentX, this.currentY, targetZ)) return;

    // Transition: scale up (dive in) or scale down (return)
    const direction = delta > 0 ? 'ascend' : 'descend';
    
    // Phase 1: Dive out of current view
    this.canvas.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease';
    this.canvas.style.opacity = '0';
    this.canvas.style.transform += delta < 0 ? ' scale(1.5)' : ' scale(0.5)';

    await new Promise(r => setTimeout(r, 600));

    // Phase 2: Swap content
    this.currentZ = targetZ;
    this.updateHUD();
    this.updateAllNodeLabels();
    this.checkZAxis();
    
    // Position for "arrival"
    this.canvas.style.transition = 'none';
    this.canvas.style.transform = `translate3d(calc(${(this.currentX * 100) - 100}vw), calc(${(this.currentY * -100) - 100}vh), 0) ${delta < 0 ? 'scale(0.5)' : 'scale(1.5)'}`;
    
    // Phase 3: Settle in
    requestAnimationFrame(() => {
      this.canvas.style.transition = 'transform 0.6s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.6s ease';
      this.canvas.style.opacity = '1';
      this.canvas.style.transform = `translate3d(calc(${(this.currentX * 100) - 100}vw), calc(${(this.currentY * -100) - 100}vh), 0) scale(1.0)`;
    });

    this.dispatchNodeChanged();
    window.dispatchEvent(new CustomEvent('os:floor_changed', { detail: { z: this.currentZ } }));
  }

  triggerResistance() {
    const tx = (this.currentX * 100) - 100;
    const ty = (this.currentY * -100) - 100;
    this.canvas.style.transform = `translate3d(calc(${tx - 2}vw), calc(${ty - 2}vh), 0) scale(1.0)`;
    setTimeout(() => {
      this.canvas.style.transform = `translate3d(calc(${tx}vw), calc(${ty}vh), 0) scale(1.0)`;
    }, 150);
  }

  attachMinimapListener() {
    window.addEventListener('os:node_changed', (event) => {
      const { x, y } = event.detail;
      this.minimap.querySelectorAll('.hud-dot').forEach(dot => dot.classList.remove('active'));
      const activeDot = this.minimap.querySelector(`[data-x="${x}"][data-y="${y}"]`);
      if (activeDot) activeDot.classList.add('active');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => { window.OS = new SpatialMatrix(); });
