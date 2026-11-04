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
  return <div className="studio-toast-viewport" aria-live="polite">
    {items.map(item => <div key={item.id} className={"studio-toast " + (item.variant === "destructive" ? "danger" : "")}>
      <button type="button" className="studio-toast-close" onClick={() => setItems(current => current.filter(x => x.id !== item.id))}>×</button>
      {item.title && <strong>{item.title}</strong>}
      {item.description && <p>{item.description}</p>}
    </div>)}
  </div>;
}
