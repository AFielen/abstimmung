# KI-Agenten-Schnittstelle — DRK Vereinsabstimmung

Dieses Dokument beschreibt, wie ein KI-Assistent die DRK Vereinsabstimmung programmatisch steuern kann.

---

## Architektur-Uebersicht

Die Abstimmungsapp unterstuetzt zwei Transport-Modi:

### P2P-Modus (WebRTC via PeerJS)

Direkte Verbindung zwischen Presenter und Voter. Kein Server noetig (ausser fuer Signaling).

```
┌─────────────┐    PeerJS     ┌──────────────┐
│  Presenter   │◄────────────►│    Voter      │
│  (Host)      │   WebRTC     │  (Teilnehmer) │
│              │  DataChannel  │              │
└─────────────┘               └──────────────┘
```

### Server-Modus (WebSocket-Relay)

Alle Daten laufen ueber den Signal-Server. Funktioniert auch hinter Firewalls/NAT.

```
┌─────────────┐   WebSocket   ┌──────────────┐   WebSocket   ┌──────────────┐
│  Presenter   │◄────────────►│ Signal-Server │◄────────────►│    Voter      │
│  (Host)      │              │  (WS-Relay)   │              │  (Teilnehmer) │
└─────────────┘               └──────────────┘               └──────────────┘
```

Ein KI-Agent kann:
1. **Als Presenter** agieren: Versammlung erstellen, Abstimmungen steuern, Ergebnisse auswerten
2. **Als Voter** agieren: An Abstimmungen teilnehmen (z.B. fuer automatisierte Tests)

---

## Verbindungsaufbau

### P2P-Modus: PeerJS initialisieren

```typescript
import Peer from "peerjs";

// Neuen Peer erstellen (mit eigenem Signaling-Server)
const peer = new Peer({
  host: "signal.example.de",  // oder localhost
  port: 9000,
  path: "/peerjs",
  secure: true,  // true bei HTTPS
});

peer.on("open", (id) => {
  console.log("Meine Peer-ID:", id);
  // Diese ID wird im QR-Code/URL als ?vote=<id> verwendet
});
```

### P2P-Modus: Als Voter verbinden

```typescript
const conn = peer.connect(presenterPeerId);

conn.on("open", () => {
  // Registrierung senden
  conn.send({
    type: "register",
    deviceId: "agent-" + Date.now(),
    fingerprintId: null,
  });
});

conn.on("data", (msg) => {
  // Nachrichten vom Presenter empfangen
  handleHostMessage(msg);
});
```

### Server-Modus: WebSocket-Verbindung

```typescript
// Als Voter im Server-Modus
const ws = new WebSocket("wss://signal.example.de/ws");

ws.onopen = () => {
  // Raum beitreten (roomId aus URL ?vote=<roomId>&mode=server)
  ws.send(JSON.stringify({ type: "join-room", roomId: "ABC123" }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case "room-joined":
      // Erfolgreich beigetreten, jetzt registrieren
      ws.send(JSON.stringify({
        type: "voter-msg",
        data: {
          type: "register",
          deviceId: "agent-" + Date.now(),
          fingerprintId: null,
        },
      }));
      break;

    case "host-data":
      // Nachrichten vom Presenter empfangen
      handleHostMessage(msg.data);
      break;
  }
};

// Nachrichten an den Presenter senden
function sendToHost(voterMsg: any) {
  ws.send(JSON.stringify({ type: "voter-msg", data: voterMsg }));
}
```

---

## Nachrichtenprotokoll

### Vom Presenter (Host) an Voter

| type | Beschreibung | Felder |
|------|--------------|--------|
| `vote-started` | Neue Abstimmung gestartet | `topic`, `description`, `voteType`, `options`, `voteRoundId`, `timerSeconds`, `mode` |
| `vote-closed` | Abstimmung geschlossen | `result` (VoteResult-Objekt) |
| `vote-cancelled` | Abstimmung abgebrochen | — |
| `vote-confirmed` | Stimme erfolgreich registriert | — |
| `already-voted` | Doppelabstimmung erkannt | — |
| `waiting` | Warten auf naechste Abstimmung | `mode` |
| `session-ended` | Versammlung beendet | — |
| `redirect` | Weiterleitung (z.B. Danke-Seite) | `url` |
| `timer-update` | Timer aktualisiert | `seconds` |
| `sk-result` | Stimmkarten-Code validiert | `valid`, `reason?`, `options?`, `voteType?`, `topic?` |
| `sk-vote-result` | Stimmkarten-Stimme registriert | `success`, `reason?` |
| `pong` | Heartbeat-Antwort | — |

### Vom Voter an Presenter (Host)

| type | Beschreibung | Felder |
|------|--------------|--------|
| `register` | Geraet registrieren | `deviceId`, `fingerprintId` |
| `cast-vote` | Stimme abgeben (Offener Modus) | `option`, `deviceId`, `fingerprintId` |
| `sk-validate` | Stimmkarten-Code validieren | `code` |
| `sk-cast-vote` | Stimme abgeben (Stimmkarten-Modus) | `code`, `option` |
| `ping` | Heartbeat-Anfrage | — |

### WebSocket-Relay Wire Protocol (Server-Modus)

Nachrichten zwischen Client und Signal-Server:

| type (Client → Server) | Beschreibung | Felder |
|------------------------|--------------|--------|
| `create-room` | Raum erstellen (Host) | — |
| `join-room` | Raum beitreten (Voter) | `roomId` |
| `host-msg` | Broadcast an alle Voter | `data` |
| `host-msg-to` | Nachricht an einzelnen Voter | `connectionId`, `data` |
| `voter-msg` | Nachricht an Host | `data` |

| type (Server → Client) | Beschreibung | Felder |
|------------------------|--------------|--------|
| `room-created` | Raum erstellt | `roomId` |
| `room-joined` | Raum beigetreten | `connectionId` |
| `voter-connected` | Voter verbunden (an Host) | `connectionId` |
| `voter-disconnected` | Voter getrennt (an Host) | `connectionId` |
| `host-data` | Nachricht vom Host (an Voter) | `data` |
| `voter-data` | Nachricht vom Voter (an Host) | `connectionId`, `data` |
| `error` | Fehlermeldung | `message` |

---

## TypeScript-Typen

```typescript
type SessionMode = "open" | "stimmkarten";
type TransportMode = "p2p" | "server";
type VoteType = "yes-no" | "custom";
type VoteOutcome = "accepted" | "rejected" | "tie" | "custom-winner";

interface VoteResult {
  topic: string;
  description: string;
  type: VoteType;
  options: string[];
  votes: Record<string, number>;    // z.B. { "Ja": 5, "Nein": 3, "Enthaltung": 2 }
  totalCast: number;
  totalVoters: number;
  notVoted: number;
  outcome: VoteOutcome;
  winner?: string;                   // Nur bei custom-winner
  startedAt: Date | string | null;
  closedAt: Date | string;
}
```

---

## Beispiel: Agent als Voter (Offener Modus, P2P)

```typescript
import Peer from "peerjs";

async function voteAsAgent(presenterPeerId: string, voteOption: string) {
  const peer = new Peer({
    host: "signal.example.de",
    port: 9000,
    path: "/peerjs",
    secure: true,
  });

  return new Promise((resolve, reject) => {
    peer.on("open", () => {
      const conn = peer.connect(presenterPeerId);

      conn.on("open", () => {
        // 1. Registrieren
        conn.send({
          type: "register",
          deviceId: `agent-${Date.now()}`,
          fingerprintId: null,
        });
      });

      conn.on("data", (msg: any) => {
        switch (msg.type) {
          case "vote-started":
            // 2. Abstimmen
            conn.send({
              type: "cast-vote",
              option: voteOption,
              deviceId: `agent-${Date.now()}`,
              fingerprintId: null,
            });
            break;

          case "vote-confirmed":
            console.log("Stimme erfolgreich abgegeben!");
            break;

          case "vote-closed":
            // 3. Ergebnis auswerten
            const result = msg.result;
            console.log(`Ergebnis: ${result.outcome}`);
            console.log(`Stimmen:`, result.votes);
            resolve(result);
            break;

          case "session-ended":
            peer.destroy();
            break;
        }
      });
    });

    peer.on("error", reject);
  });
}
```

## Beispiel: Agent als Voter (Server-Modus)

```typescript
async function voteViaServer(roomId: string, voteOption: string) {
  const ws = new WebSocket("wss://signal.example.de/ws");

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join-room", roomId }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "room-joined":
          // 1. Registrieren
          ws.send(JSON.stringify({
            type: "voter-msg",
            data: {
              type: "register",
              deviceId: `agent-${Date.now()}`,
              fingerprintId: null,
            },
          }));
          break;

        case "host-data":
          handleHostData(msg.data);
          break;

        case "error":
          reject(new Error(msg.message));
          break;
      }
    };

    function handleHostData(data: any) {
      switch (data.type) {
        case "vote-started":
          // 2. Abstimmen
          ws.send(JSON.stringify({
            type: "voter-msg",
            data: {
              type: "cast-vote",
              option: voteOption,
              deviceId: `agent-${Date.now()}`,
              fingerprintId: null,
            },
          }));
          break;

        case "vote-confirmed":
          console.log("Stimme erfolgreich abgegeben!");
          break;

        case "vote-closed":
          resolve(data.result);
          break;

        case "session-ended":
          ws.close();
          break;
      }
    }
  });
}
```

## Beispiel: Agent als Voter (Stimmkarten-Modus)

```typescript
conn.on("data", (msg: any) => {
  switch (msg.type) {
    case "vote-started":
      // 1. Code validieren
      conn.send({ type: "sk-validate", code: "K4F-9M2" });
      break;

    case "sk-result":
      if (msg.valid) {
        // 2. Stimme mit Code abgeben
        conn.send({
          type: "sk-cast-vote",
          code: "K4F-9M2",
          option: "Ja",
        });
      } else {
        console.error("Code ungueltig:", msg.reason);
      }
      break;

    case "sk-vote-result":
      if (msg.success) {
        console.log("Stimmkarten-Stimme registriert!");
      }
      break;
  }
});
```

---

## Abstimmungsoptionen

### Ja/Nein-Abstimmung (Standard)

Erlaubte Werte fuer `option`:
- `"Ja"`
- `"Nein"`
- `"Enthaltung"`

### Eigene Optionen

Bei `voteType: "custom"` werden die erlaubten Werte im `vote-started`-Event unter `options` mitgeliefert. Der Agent muss einen der angegebenen Werte verwenden.

---

## Heartbeat / Keep-Alive

Die App sendet alle 15 Sekunden einen Heartbeat. Ein KI-Agent sollte ebenfalls regelmaessig pingen:

### P2P-Modus

```typescript
setInterval(() => {
  if (conn.open) {
    conn.send({ type: "ping" });
  }
}, 15000);
```

### Server-Modus

```typescript
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "voter-msg",
      data: { type: "ping" },
    }));
  }
}, 15000);
```

---

## Ergebnis-Auswertung

Ein `VoteResult` enthaelt alle Informationen zur Auswertung:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `topic` | string | Abstimmungsthema |
| `votes` | `Record<string, number>` | Stimmenverteilung (z.B. `{ "Ja": 5, "Nein": 3 }`) |
| `totalCast` | number | Abgegebene Stimmen |
| `totalVoters` | number | Stimmberechtigte gesamt |
| `notVoted` | number | Nicht abgestimmt |
| `outcome` | string | `accepted`, `rejected`, `tie`, oder `custom-winner` |
| `winner` | string? | Gewinner-Option (nur bei `custom-winner`) |

### Outcome-Logik

- **accepted:** Ja > Nein (bei yes-no)
- **rejected:** Nein > Ja (bei yes-no)
- **tie:** Gleichstand
- **custom-winner:** Option mit den meisten Stimmen (bei custom)

---

## Tipps fuer KI-Agenten

1. **Immer zuerst registrieren** — Ohne `register`-Nachricht wird der Agent nicht als Teilnehmer gezaehlt
2. **Heartbeat implementieren** — Ohne regelmaessiges Ping/Pong wird die Verbindung nach 60 Sekunden bereinigt
3. **Auf `vote-started` warten** — Nicht vorzeitig abstimmen, sonst wird die Stimme ignoriert
4. **`vote-confirmed` abwarten** — Erst nach Bestaetigung ist die Stimme registriert
5. **Stimmkarten-Modus:** Immer zuerst `sk-validate`, dann `sk-cast-vote`
6. **Ergebnisse:** `vote-closed` enthaelt das vollstaendige VoteResult
7. **Session-Ende:** Bei `session-ended` die Verbindung sauber trennen
8. **Server-Modus:** Alle Voter-Messages in `{ type: "voter-msg", data: ... }` wrappen
9. **Transport-Wahl:** P2P fuer beste Privacy, Server-Modus wenn WebRTC blockiert ist

---

## Quellcode-Referenz

| Datei | Beschreibung |
|-------|--------------|
| `next-app/lib/types.ts` | Alle TypeScript-Typen (HostMessage, VoterMessage, etc.) |
| `next-app/lib/signal-config.ts` | Signal-Server URL-Erkennung |
| `next-app/hooks/useHostTransport.ts` | PeerJS Host-Logik (init, broadcast, sendTo) |
| `next-app/hooks/useVoterTransport.ts` | PeerJS Client-Logik (connect, send) |
| `next-app/hooks/useServerHostTransport.ts` | WebSocket Host-Logik (init, broadcast, sendTo) |
| `next-app/hooks/useServerVoterTransport.ts` | WebSocket Client-Logik (connect, send) |
| `next-app/components/presenter/PresenterApp.tsx` | Presenter-Logik (Message-Handling) |
| `next-app/components/voter/VoterApp.tsx` | Voter-Logik (Message-Handling) |
| `server/src/ws-relay.ts` | WebSocket Room-Relay |
| `server/src/index.ts` | Signal-Server Einstiegspunkt |
| `next-app/lib/fingerprint.ts` | Browser-Fingerprinting |
| `next-app/lib/token.ts` | Token-Generierung (XXX-XXX Format) |
