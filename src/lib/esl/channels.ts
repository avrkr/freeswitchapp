import type { LiveChannel } from "@/lib/types";

type FsChannelRow = Record<string, string>;

export function parseChannelsJson(raw: string): LiveChannel[] {
  if (!raw || raw.startsWith("-ERR")) return [];

  try {
    const parsed = JSON.parse(raw) as { rows?: FsChannelRow[] };
    if (!parsed.rows?.length) return [];
    return parsed.rows.map(mapRow);
  } catch {
    return [];
  }
}

function mapRow(row: FsChannelRow): LiveChannel {
  return {
    uuid: row.uuid ?? "",
    direction: row.direction ?? "",
    created: row.created ?? "",
    createdEpoch: Number(row.created_epoch ?? "0"),
    name: row.name ?? "",
    state: row.state ?? row.channel_state ?? "",
    cidName: row.cid_name ?? "",
    cidNum: row.cid_num ?? "",
    dest: row.dest ?? row.callee_num ?? "",
    application: row.application ?? "",
    applicationData: row.application_data ?? "",
    readCodec: row.read_codec ?? "",
    writeCodec: row.write_codec ?? "",
    secure: row.secure ?? "",
    accountcode: row.accountcode ?? "",
    presenceId: row.presence_id ?? "",
  };
}

export function eventToChannelPatch(event: Record<string, string>): Partial<LiveChannel> & { uuid: string } {
  return {
    uuid: event["Unique-ID"] ?? event["Channel-Call-UUID"] ?? "",
    direction: event["Call-Direction"] ?? "",
    created: event["Caller-Channel-Created-Time"] ?? "",
    createdEpoch: Number(event["Event-Date-Timestamp"] ?? "0") / 1_000_000,
    name: event["Channel-Name"] ?? "",
    state: event["Channel-Call-State"] ?? event["Answer-State"] ?? "",
    cidName: event["Caller-Caller-ID-Name"] ?? "",
    cidNum: event["Caller-Caller-ID-Number"] ?? "",
    dest: event["Caller-Destination-Number"] ?? "",
    application: event["Application"] ?? "",
    applicationData: event["Application-Data"] ?? "",
    readCodec: event["Channel-Read-Codec-Name"] ?? "",
    writeCodec: event["Channel-Write-Codec-Name"] ?? "",
    accountcode: event["variable_accountcode"] ?? "",
    presenceId: event["variable_presence_id"] ?? "",
  };
}
