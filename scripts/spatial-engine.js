/**
 * scripts/spatial-engine.js
 * PWA Spatial Operating System with Gesture Interceptor & Holographic Minimap
 *
 * PHASE 1: Holographic Minimap HUD - 3x3 dot grid representing [-1,-1] to [1,1]
 * PHASE 2: Gesture Interceptor - conflict resolution and GPU-accelerated movement
 * PHASE 3: Minimap Data Binding - real-time coordinate synchronization
 */

/**
 * GestureInterceptor: Handles touch events with conflict resolution
 * Prevents gesture clashing (scrollable areas vs. OS swipes)
 */
class GestureInterceptor {
  constructor(onSwipe) {
    this.onSwipe = onSwipe;
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.isTracking = false;

    // Thresholds for valid swipes
    this.SWIPE_THRESHOLD = 60; // pixels
    this.SWIPE_TIME_MAX = 300; // milliseconds

    this.bindListeners();
  }

  bindListeners() {
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
  }

  /**
   * TRAP 1 FIX: Conflict Resolution
   * Check if touch target is a scrollable area, canvas, or marked with data-no-swipe
   */
  isScrollableElement(target) {
    return target.closest('.scroll-area, canvas, [data-no-swipe]') !== null;
  }

  handleTouchStart(e) {
    // TRAP 1: Prevent OS swipes on scrollable elements
    if (this.isScrollableElement(e.target)) {
      this.isTracking = false;
      return;
    }

    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.startTime = Date.now();
    this.isTracking = true;
  }

  handleTouchMove(e) {
    // Only prevent default if we're tracking an OS swipe
    if (this.isTracking && !this.isScrollableElement(e.target)) {
      // We could add live resistance logic here for 1:1 finger tracking
      // For now, we wait for touchend to trigger the snappy cubic-bezier transition
    }
  }

  handleTouchEnd(e) {
    if (!this.isTracking) return;
    this.isTracking = false;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - this.startX;
    const deltaY = endY - this.startY;
    const duration = Date.now() - this.startTime;

    // TRAP 2 FIX: Hardware Acceleration threshold checks
    if (duration > this.SWIPE_TIME_MAX) return; // Swipe took too long
    if (Math.abs(deltaX) < this.SWIPE_THRESHOLD && Math.abs(deltaY) < this.SWIPE_THRESHOLD) return; // Swipe too small

    // Determine dominant axis
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX < 0) this.onSwipe(-1, 0); // Swipe Left -> Move Right
      else this.onSwipe(1, 0);              // Swipe Right -> Move Left
    } else {
      // Vertical swipe
      if (deltaY > 0) this.onSwipe(0, -1); // Swipe Down -> Move Up
      else this.onSwipe(0, 1);              // Swipe Up -> Move Down
    }
  }
}

/**
 * SpatialMatrix: Core OS state and camera management
 */
class SpatialMatrix {
  constructor() {
    this.canvas = document.getElementById('spatial-canvas');
    this.minimap = document.getElementById('os-minimap');

    // Global OS State
    this.currentX = 0;
    this.currentY = 0;

    // Grid boundaries
    this.minCoord = -1;
    this.maxCoord = 1;

    // Valid nodes in the spatial grid
    this.validNodes = new Set([
      '0,0',   // Center: Home / Agent Commons
      '0,-1',  // Up: Search & Files
      '-1,0',  // Left: Media & Movies
      '1,0'    // Right: Games & Logic
    ]);

    // Initialize UI and gesture handling
    this.initMinimap();
    this.setupGestureInterceptor();
    this.updateCamera();
    this.attachMinimapListener();
  }

  /**
   * Initialize the 3x3 minimap grid
   */
  initMinimap() {
    this.minimap.innerHTML = '';

    // Create 3x3 dot grid for coordinates [-1,-1] to [1,1]
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        const dot = document.createElement('div');
        dot.className = 'hud-dot';
        dot.setAttribute('data-x', x);
        dot.setAttribute('data-y', y);

        // Mark the current active position
        if (x === this.currentX && y === this.currentY) {
          dot.classList.add('active');
        }

        this.minimap.appendChild(dot);
      }
    }
  }

  /**
   * Setup the gesture interceptor
   */
  setupGestureInterceptor() {
    this.interceptor = new GestureInterceptor((moveX, moveY) => {
      this.requestMove(moveX, moveY);
    });
  }

  /**
   * Request a movement in the spatial grid
   */
  requestMove(moveX, moveY) {
    const targetX = this.currentX + moveX;
    const targetY = this.currentY + moveY;

    // Boundary validation
    if (this.validNodes.has(`${targetX},${targetY}`)) {
      this.currentX = targetX;
      this.currentY = targetY;
      this.updateCamera();
      this.dispatchNodeChanged();
    } else {
      // Hit a wall - trigger resistance feedback
      this.triggerResistance();
    }
  }

  /**
   * Update camera position with GPU-accelerated CSS
   * Use translate3d for hardware acceleration and cubic-bezier for snappy physics
   */
  updateCamera() {
    const translateX = (this.currentX * 100) - 100;
    const translateY = (this.currentY * -100) - 100;

    this.canvas.style.transform = `translate3d(calc(${translateX}vw), calc(${translateY}vh), 0)`;
  }

  /**
   * Dispatch custom event when node changes
   * PHASE 3: This triggers minimap data binding
   */
  dispatchNodeChanged() {
    window.dispatchEvent(new CustomEvent('os:node_changed', {
      detail: {
        x: this.currentX,
        y: this.currentY
      }
    }));
  }

  /**
   * Resistance feedback when hitting boundaries
   */
  triggerResistance() {
    const baseTx = (this.currentX * 100) - 100;
    const baseTy = (this.currentY * -100) - 100;

    // Micro-bounce animation
    this.canvas.style.transform = `translate3d(calc(${baseTx - 2}vw), calc(${baseTy - 2}vh), 0)`;
    setTimeout(() => {
      this.canvas.style.transform = `translate3d(calc(${baseTx}vw), calc(${baseTy}vh), 0)`;
    }, 150);
  }

  /**
   * PHASE 3: Minimap Data Binding
   * Listen for os:node_changed and update the minimap dots
   */
  attachMinimapListener() {
    window.addEventListener('os:node_changed', (event) => {
      const { x, y } = event.detail;

      // Remove active class from all dots
      this.minimap.querySelectorAll('.hud-dot').forEach(dot => {
        dot.classList.remove('active');
      });

      // Apply active class to the current coordinate dot
      const activeDot = this.minimap.querySelector(`[data-x="${x}"][data-y="${y}"]`);
      if (activeDot) {
        activeDot.classList.add('active');
      }
    });
  }
}

/**
 * Boot the Operating System when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  window.OS = new SpatialMatrix();
});
