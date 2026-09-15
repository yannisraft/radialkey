import { useEffect, useMemo, useState } from "react";
import { ActivationSection } from "./components/ActivationSection";
import { AppearanceSection } from "./components/AppearanceSection";
import { ContentEditor } from "./components/ContentEditor";
import { LayoutSection } from "./components/LayoutSection";
import { PreviewPlayground } from "./components/PreviewPlayground";
import { Section } from "./components/Section";
import { createDefaultProfile } from "../storage/defaults";
import { getActiveProfile, loadSettings, saveSettings } from "../storage/settings";
import type { ExtensionSettings, WheelProfile } from "../wheel/wheel-types";

const NAV = [
  { id: "activation", label: "Activation" },
  { id: "layout", label: "Wheel layout" },
  { id: "content", label: "Wheel content" },
  { id: "appearance", label: "Appearance" },
  { id: "preview", label: "Preview" },
] as const;

export function OptionsApp() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [section, setSection] = useState<(typeof NAV)[number]["id"]>("activation");

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!settings) return;
    const handle = window.setTimeout(() => {
      void saveSettings(settings);
    }, 120);
    return () => window.clearTimeout(handle);
  }, [settings]);

  const profile = useMemo(
    () => (settings ? getActiveProfile(settings) : createDefaultProfile()),
    [settings],
  );

  if (!settings) {
    return (
      <div className="main">
        <p className="hint">Loading RadialKey settings…</p>
      </div>
    );
  }

  const update = (patch: Partial<ExtensionSettings>) =>
    setSettings({ ...settings, ...patch });

  const updateProfile = (next: WheelProfile) => {
    update({
      profiles: settings.profiles.map((item) => (item.id === next.id ? next : item)),
    });
  };

  return (
    <div className="app">
      <nav className="nav" aria-label="Settings">
        <div className="brand">
          <img
            className="brand-mark"
            src={
              typeof chrome !== "undefined" && chrome.runtime?.getURL
                ? chrome.runtime.getURL("icons/icon48.png")
                : "/icons/icon48.png"
            }
            alt=""
            width={36}
            height={36}
          />
          <div>
            <strong>RadialKey</strong>
            <small>Radial writing wheel</small>
          </div>
        </div>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={section === item.id ? "is-active" : undefined}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <main className="main">
        {section === "activation" ? (
          <Section
            title="Activation"
            description="The wheel only appears while you are writing, and never hijacks ordinary right-click. Shift+V pins the wheel on screen for styling (press again to hide)."
          >
            <ActivationSection
              value={settings.activation}
              onChange={(activation) => update({ activation })}
            />
          </Section>
        ) : null}
        {section === "layout" ? (
          <Section
            title="Wheel layout"
            description="Tune the gesture zones. Distance from the center reveals category children."
          >
            <LayoutSection
              value={settings.wheel}
              onChange={(wheel) => update({ wheel })}
            />
          </Section>
        ) : null}
        {section === "content" ? (
          <Section
            title="Wheel content"
            description="Categories are generic actions. Emoji and snippets are just the first use case."
          >
            <label className="field" style={{ marginBottom: 16 }}>
              Active profile
              <select
                value={settings.activeProfileId}
                onChange={(event) => update({ activeProfileId: event.target.value })}
              >
                {settings.profiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <ContentEditor
              profile={profile}
              onChange={updateProfile}
              onReset={() =>
                updateProfile({ ...profile, items: createDefaultProfile().items })
              }
            />
          </Section>
        ) : null}
        {section === "appearance" ? (
          <Section
            title="Appearance"
            description="Glass, charcoal, and motion — keep the wheel readable without covering X."
          >
            <AppearanceSection
              value={settings.appearance}
              onChange={(appearance) => update({ appearance })}
            />
          </Section>
        ) : null}
        {section === "preview" ? (
          <Section
            title="Preview playground"
            description="This is the same radial component and gesture engine used on x.com."
          >
            <PreviewPlayground settings={settings} />
          </Section>
        ) : null}
      </main>
    </div>
  );
}
