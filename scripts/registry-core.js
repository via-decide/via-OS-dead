/**
 * scripts/registry-core.js — VIA User App Registry
 * 
 * Maps sigil patterns to local workspace applications.
 * Handles "Day One" state and user-defined Forge bindings.
 */

window.UserRegistry = {
  // Pre-loaded "Day One" Portfolio State
  defaults: {
    // SkillHex -> Right column swipe (x=1, y=-1 to 1)
    "1,-1|1,0|1,1": {
      name: "SkillHex",
      url: "../decide.engine-tools/tools/games/skillhex-mission-control/index.html",
      icon: "🎯",
      lore: "Interactive hiring operations console."
    },
    // Alchemist -> Left column swipe (x=-1, y=-1 to 1)
    "-1,-1|-1,0|-1,1": {
      name: "Alchemist",
      url: "../VIA/alchemist_app/index.html",
      icon: "🧪",
      lore: "Swipe-based chemistry learning crucible."
    },
    // Viaco -> Horizontal center swipe (y=0, x=-1 to 1)
    "-1,0|0,0|1,0": {
      name: "Viaco",
      url: "../VIA/viadecide.html",
      icon: "💼",
      lore: "AI Agent Business Hub."
    },
    // Mars Rover -> Diagonal swipe top-left to bottom-right
    "-1,-1|0,0|1,1": {
      name: "Mars Rover",
      url: "../decide.engine-tools/mars.html",
      icon: "🚀",
      lore: "Cognitive assessment and rover simulation."
    }
  },

  init() {
    const saved = localStorage.getItem('viaos_user_registry');
    this.apps = saved ? JSON.parse(saved) : {};
    
    // Merge defaults with user apps (user overrides defaults if keys clash)
    this.merged = { ...this.defaults, ...this.apps };
    console.log("[VIA OS] Registry Initialized with", Object.keys(this.merged).length, "endpoints.");
  },

  register(pattern, appData) {
    this.apps[pattern] = appData;
    localStorage.setItem('viaos_user_registry', JSON.stringify(this.apps));
    this.merged = { ...this.defaults, ...this.apps };
    window.AppRegistry = this.merged; // keep shim in sync
    window.dispatchEvent(new CustomEvent('os:registry_updated'));
  },

  get(pattern) {
    return this.merged[pattern];
  }
};

// Auto-init on load
UserRegistry.init();

// AppRegistry shim — always reflects current merged state via getter
Object.defineProperty(window, 'AppRegistry', {
  get() { return window.UserRegistry.merged; },
  configurable: true
});
