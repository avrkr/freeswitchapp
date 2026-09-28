"use client";

import {
  BarChart3,
  History,
  Mic,
  Phone,
  Voicemail,
} from "lucide-react";

export type NavId = "phone" | "history" | "recordings" | "analytics";

const items: { id: NavId; label: string; icon: typeof Phone }[] = [
  { id: "phone", label: "Phone", icon: Phone },
  { id: "history", label: "Call history", icon: History },
  { id: "recordings", label: "Recordings", icon: Voicemail },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

type Props = {
  active: NavId;
  onNavigate: (id: NavId) => void;
};

export function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--rc-border)] bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-[var(--rc-border)] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--rc-primary)] text-white">
          <Mic className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--rc-text)]">CloudConnect</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--rc-muted)]">
            FreeSWITCH
          </p>
        </div>
      </div>
      <nav className="flex-1 p-3">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active === id
                ? "rc-sidebar-item-active"
                : "text-[var(--rc-muted)] hover:bg-gray-50 hover:text-[var(--rc-text)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="border-t border-[var(--rc-border)] p-4 text-xs text-[var(--rc-muted)]">
        Powered by ESL · Deepgram · MongoDB
      </div>
    </aside>
  );
}
