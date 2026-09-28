import type { EslMessage } from "@/lib/esl/client";

export class EslConnectionError extends Error {
  constructor(
    message: string,
    readonly code: "acl_denied" | "auth_failed" | "timeout" | "unknown",
  ) {
    super(message);
    this.name = "EslConnectionError";
  }
}

export function errorFromEslGreeting(msg: EslMessage, host: string): EslConnectionError {
  const type = msg.headers["Content-Type"] ?? "";
  if (type === "text/rude-rejection") {
    const detail = msg.body.trim() || "Access denied";
    return new EslConnectionError(
      `FreeSWITCH rejected ESL from this PC (${detail}). On ${host}, remove or fix event_socket ACL, then run: reloadacl — reload mod_event_socket`,
      "acl_denied",
    );
  }
  return new EslConnectionError(
    `Unexpected ESL response (${type || "empty"}). Expected auth/request.`,
    "unknown",
  );
}
