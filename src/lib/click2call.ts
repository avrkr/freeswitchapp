import { fsConfig } from "@/lib/config";
import type { Click2CallRequest } from "@/lib/types";

function sanitizeExt(value: string) {
  return value.replace(/[^\d+*#a-zA-Z-]/g, "");
}

function sanitizeVar(value: string) {
  return value.replace(/[,{}]/g, "").trim();
}

export function buildOriginateCommand(req: Click2CallRequest): string {
  const agent = sanitizeExt(req.agent);
  const destination = sanitizeExt(req.destination);
  const domain = fsConfig.domain;
  const timeout = req.timeoutSeconds ?? 30;

  const vars: string[] = [
    `originate_timeout=${timeout}`,
    `ignore_early_media=true`,
    `hangup_after_bridge=true`,
  ];

  if (req.callerIdName) {
    vars.push(`origination_caller_id_name=${sanitizeVar(req.callerIdName)}`);
  }
  if (req.callerIdNumber) {
    vars.push(`origination_caller_id_number=${sanitizeExt(req.callerIdNumber)}`);
  }

  if (req.record) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = `${fsConfig.recordingsPathOnFs}/c2c_${agent}_to_${destination}_${stamp}.wav`;
    vars.push("RECORD_STEREO=true");
    vars.push("bridge_pre_execute_bleg_app=record_session");
    vars.push(`bridge_pre_execute_bleg_data=${file}`);
  }

  const agentLeg = `user/${agent}@${domain}`;
  const destLeg = `user/${destination}@${domain}`;
  const varBlock = `{${vars.join(",")}}`;

  let dialString: string;
  switch (req.mode) {
    case "destination-first":
      dialString = `${varBlock}${destLeg} &bridge(${agentLeg})`;
      break;
    case "simultaneous":
      dialString = `${varBlock}${agentLeg}|${destLeg} &bridge(${destLeg})`;
      break;
    case "agent-first":
    default:
      dialString = `${varBlock}${agentLeg} &bridge(${destLeg})`;
      break;
  }

  // With &bridge(...), do not append "exten XML context" — that causes originate parse errors
  return `originate ${dialString}`;
}
