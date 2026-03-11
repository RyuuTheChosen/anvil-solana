import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  link?: { label: string; href: string };
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, link?: Toast["link"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string, link?: Toast["link"]) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message, link }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-slide-up flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-lg ${
              t.type === "success"
                ? "border-pump-green/20 bg-pump-green/[0.08] text-pump-green"
                : t.type === "error"
                  ? "border-red-500/20 bg-red-500/[0.08] text-red-400"
                  : "border-pump-border bg-pump-card/90 text-pump-text"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {t.type === "success" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : t.type === "error" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.message}</p>
              {t.link && (
                <a href={t.link.href} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-xs underline opacity-80 hover:opacity-100">
                  {t.link.label}
                </a>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} className="mt-0.5 shrink-0 opacity-50 transition-opacity hover:opacity-100">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
