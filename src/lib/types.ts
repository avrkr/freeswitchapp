export type LiveChannel = {
  uuid: string;
  direction: string;
  created: string;
  createdEpoch: number;
  name: string;
  state: string;
  cidName: string;
  cidNum: string;
  dest: string;
  application: string;
  applicationData: string;
  readCodec: string;
  writeCodec: string;
  secure: string;
  accountcode: string;
  presenceId: string;
};

export type CdrEntry = {
  callerIdName: string;
  callerIdNumber: string;
  destinationNumber: string;
  context: string;
  startStamp: string;
  answerStamp: string;
  endStamp: string;
  duration: string;
  billsec: string;
  hangupCause: string;
  uuid: string;
  blegUuid: string;
  accountcode: string;
  readCodec: string;
  writeCodec: string;
};

export type RecordingEntry = {
  name: string;
  relativePath: string;
  size: number;
  modifiedAt: string;
  extension: string;
};

export type Click2CallMode = "agent-first" | "destination-first" | "simultaneous";

export type Click2CallRequest = {
  agent: string;
  destination: string;
  mode: Click2CallMode;
  record: boolean;
  callerIdName?: string;
  callerIdNumber?: string;
  timeoutSeconds?: number;
  context?: string;
};

export type FsEventPayload = {
  type: "snapshot" | "event" | "heartbeat" | "error";
  channels?: LiveChannel[];
  event?: Record<string, string>;
  message?: string;
  connected?: boolean;
  at: string;
};
