import React, { useEffect, useState } from "react";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};
type ToastItem = ToastInput & { id: number };

const listeners = new Set<(item: ToastItem) => void>();
let nextId = 1;

export function useToast() {
  const toast = (input: ToastInput) => {
    const item = { id: nextId++, ...input };
    listeners.forEach(listener => listener(item));
    return { id: item.id };
  };
  return { toast };
}

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const listener = (item: ToastItem) => {
      setItems(current => [...current, item].slice(-4));
      window.setTimeout(() => setItems(current => current.filter(x => x.id !== item.id)), 4800);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  if (!items.length) return null;
  return React.createElement(
    "div",
    { className: "studio-toast-viewport", "aria-live": "polite" },
    ...items.map(item =>
      React.createElement(
        "div",
        { key: item.id, className: "studio-toast " + (item.variant === "destructive" ? "danger" : "") },
        React.createElement("button", {
          type: "button",
          className: "studio-toast-close",
          onClick: () => setItems(current => current.filter(x => x.id !== item.id))
        }, "×"),
        item.title ? React.createElement("strong", null, item.title) : null,
        item.description ? React.createElement("p", null, item.description) : null
      )
    )
  );
}
