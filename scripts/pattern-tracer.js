/**
 * scripts/pattern-tracer.js
 * Pattern Trace Input Engine - Android Lock Screen Pattern Implementation
 *
 * PHASE 2: Gesture handlers with critical propagation bypass
 * PHASE 3: Touchmove logic with elementFromPoint and SVG line drawing
 * PHASE 4: Pattern submission and event dispatch
 */

class PatternTracer {
  constructor() {
    this.minimapContainer = document.getElementById('os-minimap');
    this.traceCanvas = document.getElementById('trace-canvas');

    // PHASE 2: State
    this.isTracing = false;
    this.patternSequence = [];
    this.activeLines = [];
    this.lastNode = null;

    // SVG reference for drawing
    this.svgNS = 'http://www.w3.org/2000/svg';

    this.bindTraceListeners();
  }

  /**
   * PHASE 2: Bind trace listeners to the minimap container
   * CRITICAL: stopPropagation and preventDefault to prevent OS spatial swipes
   */
  bindTraceListeners() {
    this.minimapContainer.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.handleTraceStart(e);
    }, { passive: false });

    this.minimapContainer.addEventListener('touchmove', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.handleTraceMove(e);
    }, { passive: false });

    this.minimapContainer.addEventListener('touchend', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.handleTraceEnd(e);
    }, { passive: false });
  }

  /**
   * PHASE 3: Handle trace start
   * Check if target is a .map-node, begin tracing
   */
  handleTraceStart(e) {
    const target = e.target.closest('.map-node');
    if (!target) return;

    this.isTracing = true;
    this.patternSequence = [];
    this.activeLines = [];
    this.lastNode = null;

    // Clear previous trace
    this.clearTrace();

    // Add first node to sequence
    const coord = target.getAttribute('data-coord');
    this.patternSequence.push(coord);
    this.lastNode = target;
    target.classList.add('active-node');
  }

  /**
   * PHASE 3: Handle trace move
   * Use elementFromPoint to detect hovered nodes, draw SVG lines
   */
  handleTraceMove(e) {
    if (!this.isTracing) return;

    const touch = e.touches[0];

    // Use elementFromPoint to find what's under the finger
    const elementUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
    const hoveredNode = elementUnderFinger?.closest('.map-node');

    if (hoveredNode) {
      const coord = hoveredNode.getAttribute('data-coord');

      // Only add if not already in sequence
      if (!this.patternSequence.includes(coord)) {
        this.patternSequence.push(coord);
        hoveredNode.classList.add('active-node');

        // Draw line from last node to this node
        if (this.lastNode) {
          this.drawLineBetweenNodes(this.lastNode, hoveredNode);
        }

        this.lastNode = hoveredNode;
      }
    }

    // (Optional) Draw dynamic line from last node to current finger position
    this.drawDynamicLine(touch.clientX, touch.clientY);
  }

  /**
   * PHASE 3: Draw SVG line between two DOM nodes
   * Calculate center points using getBoundingClientRect
   */
  drawLineBetweenNodes(fromNode, toNode) {
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const minimapRect = this.minimapContainer.getBoundingClientRect();

    // Calculate center points relative to minimap
    const fromX = (fromRect.left - minimapRect.left) + fromRect.width / 2;
    const fromY = (fromRect.top - minimapRect.top) + fromRect.height / 2;
    const toX = (toRect.left - minimapRect.left) + toRect.width / 2;
    const toY = (toRect.top - minimapRect.top) + toRect.height / 2;

    // Create SVG line element
    const line = document.createElementNS(this.svgNS, 'line');
    line.setAttribute('x1', fromX);
    line.setAttribute('y1', fromY);
    line.setAttribute('x2', toX);
    line.setAttribute('y2', toY);
    line.setAttribute('class', 'trace-line');

    this.traceCanvas.appendChild(line);
    this.activeLines.push(line);
  }

  /**
   * PHASE 3: Draw dynamic line from last locked node to current finger
   * Updates on every frame for smooth visual feedback
   */
  drawDynamicLine(fingerX, fingerY) {
    if (!this.lastNode) return;

    // Remove existing dynamic line
    const dynamicLine = this.traceCanvas.querySelector('[data-dynamic="true"]');
    if (dynamicLine) dynamicLine.remove();

    const lastRect = this.lastNode.getBoundingClientRect();
    const minimapRect = this.minimapContainer.getBoundingClientRect();

    const fromX = (lastRect.left - minimapRect.left) + lastRect.width / 2;
    const fromY = (lastRect.top - minimapRect.top) + lastRect.height / 2;
    const toX = fingerX - minimapRect.left;
    const toY = fingerY - minimapRect.top;

    // Create dynamic line
    const line = document.createElementNS(this.svgNS, 'line');
    line.setAttribute('x1', fromX);
    line.setAttribute('y1', fromY);
    line.setAttribute('x2', toX);
    line.setAttribute('y2', toY);
    line.setAttribute('class', 'trace-line');
    line.setAttribute('data-dynamic', 'true');
    line.style.opacity = '0.6';

    this.traceCanvas.appendChild(line);
  }

  /**
   * PHASE 4: Handle trace end
   * Submit pattern, dispatch event, clear after delay
   */
  handleTraceEnd(e) {
    if (!this.isTracing) return;
    this.isTracing = false;

    // Only submit if pattern has more than 1 node
    if (this.patternSequence.length > 1) {
      const patternSeed = this.patternSequence.join('|');
      console.log('Pattern locked:', patternSeed);

      // Dispatch custom event with pattern seed
      document.dispatchEvent(new CustomEvent('os:pattern_locked', {
        detail: { seed: patternSeed, length: this.patternSequence.length }
      }));
    }

    // Clear trace UI after 500ms delay so user sees the final shape
    setTimeout(() => {
      this.clearTrace();
    }, 500);
  }

  /**
   * Clear trace SVG lines and reset active nodes
   */
  clearTrace() {
    // Remove all SVG lines
    this.activeLines.forEach(line => line.remove());
    this.activeLines = [];

    // Remove dynamic line
    const dynamicLine = this.traceCanvas.querySelector('[data-dynamic="true"]');
    if (dynamicLine) dynamicLine.remove();

    // Remove active-node class from all nodes
    this.minimapContainer.querySelectorAll('.map-node.active-node').forEach(node => {
      node.classList.remove('active-node');
    });

    // Reset state
    this.patternSequence = [];
    this.lastNode = null;
  }
}

/**
 * Boot Pattern Tracer when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  window.PatternTracer = new PatternTracer();
});
