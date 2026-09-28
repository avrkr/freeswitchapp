import { EventEmitter } from "events";
import { fsConfig } from "@/lib/config";
import type { FsEventPayload, LiveChannel } from "@/lib/types";
import { EslClient } from "@/lib/esl/client";
import { EslConnectionError } from "@/lib/esl/errors";
import { eventToChannelPatch, parseChannelsJson } from "@/lib/esl/channels";

const CHANNEL_EVENTS = [
  "CHANNEL_CREATE",
  "CHANNEL_ANSWER",
  "CHANNEL_HANGUP",
  "CHANNEL_BRIDGE",
  "CHANNEL_UNBRIDGE",
  "CHANNEL_HOLD",
  "CHANNEL_UNHOLD",
  "CHANNEL_PROGRESS",
  "CHANNEL_PROGRESS_MEDIA",
  "BACKGROUND_JOB",
];

class EslManager extends EventEmitter {
  private client: EslClient | null = null;
  private channels = new Map<string, LiveChannel>();
  private started = false;
  private connecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  lastError: string | null = null;

  get connected() {
    return this.client?.isConnected ?? false;
  }

  get snapshot(): LiveChannel[] {
    return [...this.channels.values()].sort(
      (a, b) => b.createdEpoch - a.createdEpoch,
    );
  }

  async start() {
    if (this.started) return;
    this.started = true;
    void this.safeEnsureClient();
    this.pollTimer = setInterval(() => {
      void this.refreshSnapshot();
    }, 4000);
    this.heartbeatTimer = setInterval(() => {
      this.broadcast({ type: "heartbeat", at: new Date().toISOString(), connected: this.connected });
    }, 15000);
  }

  private scheduleReconnect(delayMs = 5000) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.safeEnsureClient();
    }, delayMs);
  }

  private async safeEnsureClient() {
    if (this.client?.isConnected || this.connecting) return;
    this.connecting = true;
    try {
      await this.ensureClient();
    } catch (err) {
      this.client?.disconnect();
      this.client = null;
      this.lastError =
        err instanceof Error ? err.message : "ESL connection failed";
      this.broadcast({
        type: "error",
        message: this.lastError,
        connected: false,
        at: new Date().toISOString(),
      });
      const delay =
        err instanceof EslConnectionError && err.code === "acl_denied"
          ? 60_000
          : 5_000;
      this.scheduleReconnect(delay);
    } finally {
      this.connecting = false;
    }
  }

  private async ensureClient() {
    if (this.client?.isConnected) return;

    this.client = new EslClient(
      fsConfig.eslHost,
      fsConfig.eslPort,
      fsConfig.eslPassword,
    );

    this.client.on("event", (event) => {
      this.onFsEvent(event);
    });

    this.client.on("disconnect", () => {
      this.client = null;
      this.broadcast({
        type: "error",
        message: "Disconnected from FreeSWITCH ESL",
        connected: false,
        at: new Date().toISOString(),
      });
      this.scheduleReconnect(3000);
    });

    await this.client.connect();
    this.lastError = null;
    await this.client.subscribe(CHANNEL_EVENTS);
    const raw = await this.client.api("show channels as json");
    const parsed = parseChannelsJson(raw);
    this.channels = new Map(parsed.map((c) => [c.uuid, c]));
    this.broadcast({
      type: "snapshot",
      channels: this.snapshot,
      connected: true,
      at: new Date().toISOString(),
    });
  }

  private onFsEvent(event: Record<string, string>) {
    const name = event["Event-Name"];
    if (name === "CHANNEL_HANGUP" || event["Hangup-Cause"]) {
      const uuid = event["Unique-ID"];
      if (uuid) this.channels.delete(uuid);
    } else if (name === "CHANNEL_CREATE" || name === "CHANNEL_ANSWER") {
      const patch = eventToChannelPatch(event);
      if (patch.uuid) {
        const existing = this.channels.get(patch.uuid);
        this.channels.set(patch.uuid, { ...(existing ?? emptyChannel(patch.uuid)), ...patch } as LiveChannel);
      }
    } else {
      const patch = eventToChannelPatch(event);
      if (patch.uuid && this.channels.has(patch.uuid)) {
        this.channels.set(patch.uuid, { ...this.channels.get(patch.uuid)!, ...patch });
      }
    }

    this.broadcast({
      type: "event",
      event,
      channels: this.snapshot,
      connected: true,
      at: new Date().toISOString(),
    });
  }

  private broadcast(payload: FsEventPayload) {
    this.emit("broadcast", payload);
  }

  async refreshSnapshot() {
    try {
      if (!this.client?.isConnected) {
        void this.safeEnsureClient();
        return;
      }
      const raw = await this.client!.api("show channels as json");
      const parsed = parseChannelsJson(raw);
      this.channels = new Map(parsed.map((c) => [c.uuid, c]));
      this.broadcast({
        type: "snapshot",
        channels: this.snapshot,
        connected: true,
        at: new Date().toISOString(),
      });
    } catch (err) {
      this.broadcast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to refresh channels",
        connected: this.connected,
        at: new Date().toISOString(),
      });
    }
  }

  async api(command: string) {
    await this.safeEnsureClient();
    if (!this.client?.isConnected) {
      throw new Error(this.lastError ?? "Not connected to FreeSWITCH ESL");
    }
    return this.client.api(command);
  }

  async bgapi(command: string) {
    await this.safeEnsureClient();
    if (!this.client?.isConnected) {
      throw new Error(this.lastError ?? "Not connected to FreeSWITCH ESL");
    }
    return this.client.bgapi(command);
  }
}

function emptyChannel(uuid: string): LiveChannel {
  return {
    uuid,
    direction: "",
    created: "",
    createdEpoch: 0,
    name: "",
    state: "",
    cidName: "",
    cidNum: "",
    dest: "",
    application: "",
    applicationData: "",
    readCodec: "",
    writeCodec: "",
    secure: "",
    accountcode: "",
    presenceId: "",
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __fsEslManager: EslManager | undefined;
}

export function getEslManager() {
  if (!global.__fsEslManager) {
    global.__fsEslManager = new EslManager();
  }
  return global.__fsEslManager;
}
