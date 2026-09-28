import path from "path";
import { fsConfig } from "@/lib/config";
import type { Click2CallRequest } from "@/lib/types";

function sanitizeExt(value: string) {
  return value.replace(/[^\d+*#a-zA-Z-]/g, "");
}

export function buildOriginateCommand(req: Click2CallRequest): string {
  const agent = sanitizeExt(req.agent);
  const destination = sanitizeExt(req.destination);
  const domain = fsConfig.domain;
  const context = req.context ?? "default";
  const timeout = req.timeoutSeconds ?? 30;

  const vars: string[] = [
    `originate_timeout=${timeout}`,
    `ignore_early_media=true`,
    `hangup_after_bridge=true`,
  ];

  if (req.callerIdName) vars.push(`origination_caller_id_name=${req.callerIdName}`);
  if (req.callerIdNumber) vars.push(`origination_caller_id_number=${req.callerIdNumber}`);

  if (req.record) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path
      .join(fsConfig.recordingsDir, `c2c_${agent}_to_${destination}_${stamp}.wav`)
      .replace(/\\/g, "/");
    vars.push("RECORD_STEREO=true");
    vars.push(`execute_on_answer=record_session ${file}`);
  }

  const agentLeg = `user/${agent}@${domain}`;
  const destLeg = `user/${destination}@${domain}`;

  let dialString: string;
  switch (req.mode) {
    case "destination-first":
      dialString = `{${vars.join(",")}}${destLeg} &bridge(${agentLeg})`;
      break;
    case "simultaneous":
      dialString = `{${vars.join(",")}}${agentLeg}|:${destLeg}`;
      break;
    case "agent-first":
    default:
      dialString = `{${vars.join(",")}}${agentLeg} &bridge(${destLeg})`;
      break;
  }

  return `originate ${dialString} ${destination} XML ${context}`;
}
