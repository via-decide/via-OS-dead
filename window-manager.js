// window-manager.js
// Via-OS Window Manager

class WindowManager {
  constructor() {
    this.stack = document.getElementById("window-manager");
    this.windows = {};
    this.zIndex = 100;

    if (!this.stack) {
      console.error("window-manager container missing in HTML");
      return;
    }
  }

  openTool(zoneId, toolId) {
    const id = `${zoneId}-${toolId}`;

    if (this.windows[id]) {
      this.focusWindow(id);
      return;
    }

    const toolUrl = `/decide.engine-tools/tools/${zoneId}/${toolId}/index.html`;

    const win = document.createElement("div");
    win.className = "os-window";
    win.style.zIndex = ++this.zIndex;

    // header
    const header = document.createElement("div");
    header.className = "window-header";

    const title = document.createElement("span");
    title.textContent = `${toolId}`;

    const close = document.createElement("button");
    close.textContent = "✕";

    close.onclick = () => {
      win.remove();
      delete this.windows[id];
    };

    header.appendChild(title);
    header.appendChild(close);

    // iframe content
    const frame = document.createElement("iframe");
    frame.src = toolUrl;
    frame.className = "window-frame";

    // sandbox security
    frame.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-forms allow-popups"
    );

    win.appendChild(header);
    win.appendChild(frame);

    this.stack.appendChild(win);

    this.windows[id] = win;

    this.makeDraggable(win, header);
  }

  focusWindow(id) {
    const win = this.windows[id];
    if (!win) return;

    win.style.zIndex = ++this.zIndex;
  }

  makeDraggable(win, header) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener("mousedown", (e) => {
      dragging = true;
      offsetX = e.clientX - win.offsetLeft;
      offsetY = e.clientY - win.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;

      win.style.left = e.clientX - offsetX + "px";
      win.style.top = e.clientY - offsetY + "px";
    });

    document.addEventListener("mouseup", () => {
      dragging = false;
    });
  }
}

window.WM = new WindowManager();
