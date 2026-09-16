export const manifest = {
  manifest_version: 3,
  name: "RadialKey",
  version: "0.1.21",
  description: "A fast, customizable radial writing and reaction wheel for X.com.",
  permissions: ["storage"],
  host_permissions: [
    "https://x.com/*",
    "https://www.x.com/*",
    "https://twitter.com/*",
    "https://www.twitter.com/*",
  ],
  background: {
    service_worker: "background.js",
    type: "module",
  },
  options_page: "src/options/index.html",
  action: {
    default_title: "RadialKey Settings",
    default_icon: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
  content_scripts: [
    {
      matches: [
        "https://x.com/*",
        "https://www.x.com/*",
        "https://twitter.com/*",
        "https://www.twitter.com/*",
      ],
      js: ["content.js"],
      run_at: "document_idle",
    },
  ],
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
} as const;
