"use client";

interface ChatSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ChatSheet({ open, onClose }: ChatSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close chat"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <section className="glass-panel relative z-10 flex max-h-[62dvh] flex-col rounded-t-3xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgba(244,234,216,0.18)]" />
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold-dim)]">
              Table chat
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ivory)]">
              Room talk
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-full px-3 text-sm text-[var(--mute)]"
          >
            Close
          </button>
        </div>
        <div className="flex min-h-36 flex-1 flex-col items-center justify-center rounded-2xl border border-[rgba(244,234,216,0.08)] bg-black/20 px-6 text-center">
          <p className="text-sm text-[var(--ivory)]">Chat is next</p>
          <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-[var(--mute)]">
            This tray stays here so talk never covers your cards. Live messages
            will land in this sheet.
          </p>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            disabled
            placeholder="Message the table…"
            className="field flex-1 opacity-60"
          />
          <button type="button" disabled className="btn-gold px-4">
            Send
          </button>
        </div>
      </section>
    </div>
  );
}
