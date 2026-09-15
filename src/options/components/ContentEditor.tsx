import type { WheelItem, WheelProfile } from "../../wheel/wheel-types";
import { EmojiPickerButton, isPlainEmojiItem } from "./EmojiPickerButton";

interface Props {
  profile: WheelProfile;
  onChange: (profile: WheelProfile) => void;
  onReset: () => void;
}

function createItem(kind: "emoji" | "snippet"): WheelItem {
  const id = crypto.randomUUID();
  if (kind === "emoji") {
    return {
      id,
      label: "✨",
      icon: "✨",
      action: { type: "insert-text", value: "✨" },
    };
  }
  return {
    id,
    label: "New snippet",
    icon: "✍️",
    action: { type: "insert-text", value: "New snippet" },
  };
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const item = next.splice(from, 1)[0];
  if (item === undefined) return list;
  next.splice(to, 0, item);
  return next;
}

export function ContentEditor({ profile, onChange, onReset }: Props) {
  const updateItems = (items: WheelItem[]) => onChange({ ...profile, items });

  const updateCategory = (index: number, patch: Partial<WheelItem>) => {
    updateItems(
      profile.items.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        if (patch.icon && item.action.value === (item.icon ?? item.label)) {
          next.action = { type: "insert-text", value: patch.icon };
        }
        return next;
      }),
    );
  };

  const updateChild = (index: number, childIndex: number, child: WheelItem) => {
    const children = [...(profile.items[index]?.children ?? [])];
    children[childIndex] = child;
    updateCategory(index, { children });
  };

  return (
    <div>
      {profile.items.map((category, index) => (
        <article
          key={category.id}
          className="category"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", String(index));
            event.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const from = Number(event.dataTransfer.getData("text/plain"));
            if (Number.isFinite(from) && from !== index) {
              updateItems(move(profile.items, from, index));
            }
          }}
        >
          <header>
            <button
              type="button"
              className="ghost"
              aria-label="Move category up"
              disabled={index === 0}
              onClick={() => updateItems(move(profile.items, index, index - 1))}
            >
              ↑
            </button>
            <button
              type="button"
              className="ghost"
              aria-label="Move category down"
              disabled={index === profile.items.length - 1}
              onClick={() => updateItems(move(profile.items, index, index + 1))}
            >
              ↓
            </button>
            <EmojiPickerButton
              value={category.icon ?? "✦"}
              label={`${category.label} icon`}
              onPick={(emoji) => updateCategory(index, { icon: emoji })}
            />
            <input
              type="text"
              value={category.label}
              aria-label="Category name"
              onChange={(event) => updateCategory(index, { label: event.target.value })}
            />
            <button
              type="button"
              className="ghost"
              aria-label={`Remove ${category.label}`}
              onClick={() =>
                updateItems(profile.items.filter((item) => item.id !== category.id))
              }
            >
              Remove
            </button>
          </header>
          <div className="children">
            {(category.children ?? []).map((child, childIndex) => {
              const emojiItem = isPlainEmojiItem(child.icon, child.action.value);
              return (
                <div key={child.id} className="chip" draggable={false}>
                  <EmojiPickerButton
                    value={child.icon ?? child.label}
                    label={emojiItem ? "Choose emoji" : `${child.label} icon`}
                    onPick={(emoji) => {
                      if (emojiItem) {
                        updateChild(index, childIndex, {
                          ...child,
                          label: emoji,
                          icon: emoji,
                          action: { type: "insert-text", value: emoji },
                        });
                        return;
                      }
                      updateChild(index, childIndex, { ...child, icon: emoji });
                    }}
                  />
                  {emojiItem ? null : (
                    <input
                      value={child.action.value}
                      aria-label="Snippet text"
                      style={{ width: 120 }}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateChild(index, childIndex, {
                          ...child,
                          label: value,
                          action: { type: "insert-text", value },
                        });
                      }}
                    />
                  )}
                  <button
                    type="button"
                    className="ghost"
                    aria-label="Move item left"
                    onClick={() => {
                      const children = move(
                        category.children ?? [],
                        childIndex,
                        childIndex - 1,
                      );
                      updateCategory(index, { children });
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    aria-label="Move item right"
                    onClick={() => {
                      const children = move(
                        category.children ?? [],
                        childIndex,
                        childIndex + 1,
                      );
                      updateCategory(index, { children });
                    }}
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    aria-label="Remove item"
                    onClick={() => {
                      const children = (category.children ?? []).filter(
                        (item) => item.id !== child.id,
                      );
                      updateCategory(index, { children });
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={() =>
                updateCategory(index, {
                  children: [...(category.children ?? []), createItem("emoji")],
                })
              }
            >
              Add emoji
            </button>
            <button
              type="button"
              className="btn"
              onClick={() =>
                updateCategory(index, {
                  children: [...(category.children ?? []), createItem("snippet")],
                })
              }
            >
              Add text snippet
            </button>
          </div>
        </article>
      ))}
      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={() =>
            updateItems([
              ...profile.items,
              {
                id: crypto.randomUUID(),
                label: "New",
                icon: "✦",
                action: { type: "insert-text", value: "✦" },
                children: [],
              },
            ])
          }
        >
          Add category
        </button>
        <button type="button" className="btn" onClick={onReset}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
