"use client";

import { useEffect, useState } from "react";
import { Sidebar, type NavId } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { PhoneWorkspace } from "@/components/phone/PhoneWorkspace";
import { HistoryWorkspace } from "@/components/history/HistoryWorkspace";
import { RecordingsWorkspace } from "@/components/recordings/RecordingsWorkspace";
import { AnalyticsWorkspace } from "@/components/analytics/AnalyticsWorkspace";

export function AppShell() {
  const [nav, setNav] = useState<NavId>("phone");
  const [integrations, setIntegrations] = useState({
    esl: false,
    mongodb: false,
    deepgram: false,
  });

  useEffect(() => {
    const load = () => {
      void fetch("/api/integrations/status")
        .then((r) => r.json())
        .then(
          (d: {
            esl?: { connected?: boolean };
            mongodb?: { configured?: boolean };
            deepgram?: { configured?: boolean };
          }) => {
            setIntegrations({
              esl: Boolean(d.esl?.connected),
              mongodb: Boolean(d.mongodb?.configured),
              deepgram: Boolean(d.deepgram?.configured),
            });
          },
        )
        .catch(() => undefined);
    };
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--rc-bg)]">
      <Sidebar active={nav} onNavigate={setNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar integrations={integrations} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {nav === "phone" ? <PhoneWorkspace eslConnected={integrations.esl} /> : null}
          {nav === "history" ? <HistoryWorkspace /> : null}
          {nav === "recordings" ? <RecordingsWorkspace /> : null}
          {nav === "analytics" ? <AnalyticsWorkspace /> : null}
        </main>
      </div>
    </div>
  );
}
