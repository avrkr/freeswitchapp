import net from "net";
import { EventEmitter } from "events";
import { errorFromEslGreeting } from "@/lib/esl/errors";

export type EslMessage = {
  headers: Record<string, string>;
  body: string;
};

function parseHeaders(block: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return headers;
}

export class EslClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private buffer = "";
  private authenticated = false;
  private connectPromise: Promise<void> | null = null;
  private readonly waiters: Array<(msg: EslMessage) => void> = [];

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly password: string,
  ) {
    super();
  }

  get isConnected() {
    return this.authenticated && this.socket !== null && !this.socket.destroyed;
  }

  connect(): Promise<void> {
    if (this.isConnected) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      this.socket = socket;

      const fail = (err: Error) => {
        this.connectPromise = null;
        this.cleanup(false);
        reject(err);
      };

      socket.once("error", fail);

      socket.on("data", (chunk) => {
        this.buffer += chunk.toString("utf8");
        this.drainBuffer();
      });

      socket.on("close", () => {
        this.authenticated = false;
        this.connectPromise = null;
        this.emit("disconnect");
      });

      socket.once("connect", () => {
        this.waitForMessage(15000)
          .then((authRequest) => {
            if (authRequest.headers["Content-Type"] !== "auth/request") {
              throw errorFromEslGreeting(authRequest, this.host);
            }
            this.sendRaw(`auth ${this.password}`);
            return this.waitForMessage(15000);
          })
          .then((authReply) => {
            if (!authReply.headers["Reply-Text"]?.startsWith("+OK")) {
              throw new Error(authReply.headers["Reply-Text"] ?? "ESL authentication failed");
            }
            this.authenticated = true;
            socket.off("error", fail);
            resolve();
          })
          .catch(fail);
      });
    });

    return this.connectPromise;
  }

  disconnect() {
    this.cleanup(true);
  }

  private cleanup(destroySocket: boolean) {
    this.authenticated = false;
    this.connectPromise = null;
    if (destroySocket && this.socket && !this.socket.destroyed) {
      this.socket.destroy();
    }
    this.socket = null;
    this.buffer = "";
    this.waiters.splice(0).forEach((w) =>
      w({
        headers: { "Reply-Text": "-ERR connection closed" },
        body: "",
      }),
    );
  }

  private sendRaw(payload: string) {
    if (!this.socket || this.socket.destroyed) {
      throw new Error("ESL socket not connected");
    }
    this.socket.write(`${payload}\n\n`);
  }

  private drainBuffer() {
    while (true) {
      const msg = this.tryTakeMessage();
      if (!msg) break;
      this.dispatch(msg);
    }
  }

  private dispatch(msg: EslMessage) {
    const contentType = msg.headers["Content-Type"] ?? "";
    if (contentType === "text/event-plain" || contentType === "text/event-json") {
      this.emit("event", this.parseEventBody(msg.body));
      return;
    }

    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(msg);
      return;
    }

    this.emit("message", msg);
  }

  private tryTakeMessage(): EslMessage | null {
    const headerEnd = this.buffer.indexOf("\n\n");
    if (headerEnd === -1) return null;

    const headerBlock = this.buffer.slice(0, headerEnd);
    const headers = parseHeaders(headerBlock);
    const contentLength = Number(headers["Content-Length"] ?? "0");
    const totalLength = headerEnd + 2 + contentLength;
    if (this.buffer.length < totalLength) return null;

    const body = this.buffer.slice(headerEnd + 2, totalLength);
    this.buffer = this.buffer.slice(totalLength);
    return { headers, body };
  }

  private waitForMessage(timeoutMs: number): Promise<EslMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.indexOf(onMessage);
        if (idx >= 0) this.waiters.splice(idx, 1);
        reject(new Error("ESL response timeout"));
      }, timeoutMs);

      const onMessage = (msg: EslMessage) => {
        clearTimeout(timer);
        resolve(msg);
      };

      this.waiters.push(onMessage);
      this.drainBuffer();
    });
  }

  private parseEventBody(body: string): Record<string, string> {
    const event: Record<string, string> = {};
    for (const line of body.split("\n")) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      event[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return event;
  }

  private async nextNonEvent(timeoutMs: number): Promise<EslMessage> {
    while (true) {
      const msg = await this.waitForMessage(timeoutMs);
      const type = msg.headers["Content-Type"] ?? "";
      if (type === "text/event-plain" || type === "text/event-json") {
        this.emit("event", this.parseEventBody(msg.body));
        continue;
      }
      return msg;
    }
  }

  async api(command: string): Promise<string> {
    if (!this.isConnected) await this.connect();

    this.sendRaw(`api ${command}`);
    const reply = await this.nextNonEvent(20000);
    if (reply.headers["Reply-Text"]?.startsWith("-ERR")) {
      throw new Error(reply.headers["Reply-Text"]);
    }

    if (reply.headers["Content-Type"] === "api/response") {
      return reply.body.trim();
    }

    const body = await this.nextNonEvent(20000);
    if (body.headers["Reply-Text"]?.startsWith("-ERR")) {
      throw new Error(body.headers["Reply-Text"]);
    }
    return body.body.trim();
  }

  async bgapi(command: string): Promise<string> {
    if (!this.isConnected) await this.connect();

    this.sendRaw(`bgapi ${command}`);
    const reply = await this.nextNonEvent(30000);
    const text = reply.headers["Reply-Text"] ?? "";
    if (text.startsWith("-ERR")) {
      throw new Error(text);
    }
    return text;
  }

  async subscribe(events: string[]): Promise<void> {
    if (!this.isConnected) await this.connect();
    this.sendRaw(`event plain ${events.join(" ")}`);
    const reply = await this.nextNonEvent(10000);
    if (!reply.headers["Reply-Text"]?.startsWith("+OK")) {
      throw new Error(reply.headers["Reply-Text"] ?? "Failed to subscribe to ESL events");
    }
  }
}

export function createEslClient(host: string, port: number, password: string) {
  return new EslClient(host, port, password);
}
