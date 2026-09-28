# FreeSWITCH Dashboard (Next.js)

Web control panel for your local FreeSWITCH install: **live calls** (ESL events), **call control** (hangup, hold, transfer), **recordings**, **CDR**, and **click2call**.

## Requirements

- Node.js 20+
- FreeSWITCH with `mod_event_socket` listening on port **8021** (default password `ClueCon` in `freeswitchlocal/conf/autoload_configs/event_socket.conf.xml`)
- SIP extensions registered (e.g. `100` / `200` from directory config)

## Setup

```bash
cd freeswitchapp
cp .env.local.example .env.local
# Edit FS_ESL_HOST / FS_DOMAIN if FreeSWITCH runs on another host (WSL, Docker, etc.)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

| Area | Description |
|------|-------------|
| Live calls | SSE stream from ESL + periodic `show channels as json` sync |
| Call control | Hangup, hold/unhold, blind transfer |
| Recordings | Lists WAV/MP3/OGG under `FS_RECORDINGS_DIR`, in-browser playback |
| CDR | Reads `Master.csv` from mod_cdr_csv |
| Click2Call | `bgapi originate` with agent-first, destination-first, or simultaneous modes; optional stereo record |

## Click2Call example

Agent **100** calls extension **200** (agent rings first, then bridge):

1. Open **Click2Call** tab
2. Agent `100`, Destination `200`, enable **Record call**
3. Ensure both phones are registered to FreeSWITCH

## Notes

- If the app runs on Windows but FreeSWITCH runs in WSL/Linux, set `FS_ESL_HOST` to the WSL IP and ensure port 8021 is reachable.
- Create the recordings folder if missing: `freeswitchlocal/recordings`
- CDR appears after completed calls once `mod_cdr_csv` writes `log/cdr-csv/Master.csv`
