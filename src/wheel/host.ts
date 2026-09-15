export interface ExtensionHost {
  root: ShadowRoot;
  mount: HTMLElement;
  host: HTMLElement;
  shield: HTMLElement;
}

const HOST_ATTR = "data-radialx-host";

function applyHostFrame(host: HTMLElement): void {
  host.setAttribute("aria-hidden", "true");
  host.style.display = "block";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "2147483646";
}

export function setHostBlocking(host: ExtensionHost, blocking: boolean): void {
  host.host.style.pointerEvents = blocking ? "auto" : "none";
  host.shield.classList.toggle("is-on", blocking);
}

export function ensureHost(parent: ParentNode = document.documentElement): ExtensionHost {
  const existing = parent.querySelector(`[${HOST_ATTR}]`);
  if (existing instanceof HTMLElement && existing.shadowRoot) {
    const mount = existing.shadowRoot.querySelector(".rx-mount");
    if (mount instanceof HTMLElement) {
      const found = existing.shadowRoot.querySelector(".rx-shield");
      let shield: HTMLElement;
      if (found instanceof HTMLElement) {
        shield = found;
      } else {
        shield = document.createElement("div");
        shield.className = "rx-shield";
        existing.shadowRoot.prepend(shield);
      }
      applyHostFrame(existing);
      return { host: existing, root: existing.shadowRoot, mount, shield };
    }
  }

  const host = document.createElement("div");
  host.setAttribute(HOST_ATTR, "");
  applyHostFrame(host);
  const root = host.attachShadow({ mode: "open" });
  const shield = document.createElement("div");
  shield.className = "rx-shield";
  const mount = document.createElement("div");
  mount.className = "rx-mount";
  root.append(shield, mount);
  parent.appendChild(host);
  return { host, root, mount, shield };
}
