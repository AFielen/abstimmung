# Portal-Startseite mit Rundlauf-Verweis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the direct SetupForm landing page on `drk-abstimmung.de` with a Portal hub that offers two cards: live "Versammlung" (`/versammlung`) and external "Rundlaufbeschluss" (`https://rundlauf.drk-abstimmung.de/`). Existing `?vote=…` URLs continue to render the VoterApp unchanged.

**Architecture:** Two new components (`LoadingSpinner`, `Portal`) plus a new `/versammlung` route, all rendered inside the existing `layout.tsx` header/footer chrome. The root `/` route becomes a thin conditional that falls back to `Portal` whenever no `?vote=` param is present. A symmetric back-link is added to the anonymous LandingPage on the rundlauf app.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4. No new dependencies. No test runner exists in either app — verification is manual (browser + `next build` + `next lint`).

**Spec:** `docs/superpowers/specs/2026-05-21-rundlauf-portal-design.md`

**Working branch:** create `feat/portal-startseite` off `main` for this work (do NOT continue on `feat/admin-voter-participation`).

---

## File Structure Overview

| File | Action | Responsibility |
|---|---|---|
| `next-app/components/LoadingSpinner.tsx` | Create | Shared Suspense fallback (DRK spinner) |
| `next-app/components/portal/Portal.tsx` | Create | Hub UI with two cards |
| `next-app/app/page.tsx` | Refactor | Router: `?vote=…` → VoterApp, else → Portal |
| `next-app/app/versammlung/page.tsx` | Create | Hosts the existing PresenterApp |
| `rundlauf-app/app/page.tsx` | Modify | Add "Sie suchen eine Live-Abstimmung?" section to `LandingPage()` |

---

## Task 0: Branch Setup

**Files:** none (git only)

- [ ] **Step 1: Confirm working tree is clean**

Run from `/root/abstimmung`:

```bash
git status --short
```

Expected: empty (or only `?? docker-compose.override.yml` which is the prod override and untracked).

If there are tracked changes, stop and ask the user how to proceed.

- [ ] **Step 2: Switch to `main` and pull**

```bash
git checkout main
git pull --ff-only
```

Expected: "Already up to date." or successful fast-forward.

- [ ] **Step 3: Create the feature branch**

```bash
git checkout -b feat/portal-startseite
```

Expected: "Switched to a new branch 'feat/portal-startseite'".

- [ ] **Step 4: Cherry-pick the spec commit onto the new branch**

The spec already lives on `feat/admin-voter-participation`. Bring just that one commit over.

```bash
git log --oneline feat/admin-voter-participation -- docs/superpowers/specs/2026-05-21-rundlauf-portal-design.md
```

Note the commit SHA (the one whose message starts with `docs: spec für Portal-Startseite`). Then:

```bash
git cherry-pick <SHA>
```

Expected: clean cherry-pick, no conflicts. Verify the spec file exists at `docs/superpowers/specs/2026-05-21-rundlauf-portal-design.md`.

---

## Task 1: Extract LoadingSpinner Component

The current `app/page.tsx` has an inline Suspense fallback spinner. We need the same spinner on `/versammlung`, so extract it now to avoid duplication.

**Files:**
- Create: `next-app/components/LoadingSpinner.tsx`

- [ ] **Step 1: Create the component**

`next-app/components/LoadingSpinner.tsx`:

```tsx
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-[var(--border)] border-t-[var(--drk)] rounded-full animate-spin" />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /root/abstimmung/next-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /root/abstimmung
git add next-app/components/LoadingSpinner.tsx
git commit -m "feat(ui): extract LoadingSpinner for shared Suspense fallback"
```

---

## Task 2: Build the Portal Component

The Portal is a Client Component (it sits inside a Client `app/page.tsx`). It renders two cards, each linking to one of the two abstimmungs-verfahren. Card 2 is a regular `<a>` because it points to another subdomain.

**Files:**
- Create: `next-app/components/portal/Portal.tsx`

- [ ] **Step 1: Create the component file**

`next-app/components/portal/Portal.tsx`:

```tsx
import Link from 'next/link';

function UsersIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ClipboardCheckIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 2h6a2 2 0 0 1 2 2v2H7V4a2 2 0 0 1 2-2z" />
      <path d="M5 6h14v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6z" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function Portal() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1
          className="text-2xl sm:text-3xl font-bold mb-2"
          style={{ color: 'var(--text)' }}
        >
          Wählen Sie Ihr Verfahren
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-light)' }}>
          Für die Versammlungs-Abstimmung oder den schriftlichen Rundlaufbeschluss.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Versammlung (internal) */}
        <Link
          href="/versammlung"
          className="drk-card portal-card group flex flex-col justify-between min-h-[200px] transition-all"
          style={{
            border: '2px solid var(--border)',
            textDecoration: 'none',
            color: 'var(--text)',
          }}
        >
          <div>
            <div className="mb-3" style={{ color: 'var(--drk)' }}>
              <UsersIcon />
            </div>
            <h2 className="text-lg font-bold mb-1">Versammlung</h2>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--drk)' }}>
              Live-Abstimmung in der Sitzung
            </p>
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>
              Echtzeit-Abstimmungen für Versammlungen. Teilnehmende stimmen per
              QR-Code direkt ab.
            </p>
          </div>
          <div
            className="flex items-center justify-end mt-4 text-sm font-medium"
            style={{ color: 'var(--drk)' }}
          >
            Starten
            <span className="ml-1.5">
              <ArrowRightIcon />
            </span>
          </div>
        </Link>

        {/* Card 2: Rundlaufbeschluss (external subdomain) */}
        <a
          href="https://rundlauf.drk-abstimmung.de/"
          className="drk-card portal-card group flex flex-col justify-between min-h-[200px] transition-all"
          style={{
            border: '2px solid var(--border)',
            textDecoration: 'none',
            color: 'var(--text)',
          }}
        >
          <div>
            <div className="mb-3" style={{ color: 'var(--drk)' }}>
              <ClipboardCheckIcon />
            </div>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-1.5">
              Rundlaufbeschluss
              <span style={{ color: 'var(--text-light)' }}>
                <ExternalLinkIcon />
              </span>
            </h2>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--drk)' }}>
              Schriftlich, asynchron
            </p>
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>
              Umlaufverfahren für Präsidien gemäß § 21 Abs. 6 der DRK-Satzung.
              Per E-Mail-Einladung, kein Passwort nötig.
            </p>
          </div>
          <div
            className="flex items-center justify-end mt-4 text-sm font-medium"
            style={{ color: 'var(--drk)' }}
          >
            Öffnen
            <span className="ml-1.5">
              <ArrowRightIcon />
            </span>
          </div>
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add hover-style for `.portal-card` to globals.css**

Append to `next-app/app/globals.css` (under the existing `.drk-card` block):

```css
/* Portal-Karten Hover */
.portal-card:hover {
  border-color: var(--drk) !important;
  transform: translateY(-2px);
  box-shadow: 0 12px 20px -4px rgba(0, 0, 0, 0.12), 0 6px 8px -4px rgba(0, 0, 0, 0.1);
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /root/abstimmung/next-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /root/abstimmung
git add next-app/components/portal/Portal.tsx next-app/app/globals.css
git commit -m "feat(portal): add Portal hub component with two-card layout"
```

---

## Task 3: Refactor `app/page.tsx` to use Portal

Replace the default `PresenterApp` fallback with `Portal`. The `?vote=…` shortcut for VoterApp stays exactly as it is today.

**Files:**
- Modify: `next-app/app/page.tsx`

- [ ] **Step 1: Rewrite `next-app/app/page.tsx`**

Replace the **entire file** with:

```tsx
'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VoterApp from '@/components/voter/VoterApp';
import Portal from '@/components/portal/Portal';
import LoadingSpinner from '@/components/LoadingSpinner';

function AppContent() {
  const searchParams = useSearchParams();
  const votePeerId = searchParams.get('vote');
  const mode = searchParams.get('mode');

  if (votePeerId) {
    return (
      <VoterApp
        presenterPeerId={votePeerId}
        transportMode={mode === 'server' ? 'server' : 'p2p'}
      />
    );
  }
  return <Portal />;
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AppContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /root/abstimmung/next-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /root/abstimmung
git add next-app/app/page.tsx
git commit -m "feat(portal): show Portal on / when no vote= query param"
```

---

## Task 4: Create `/versammlung` Route

The PresenterApp moves to its own route. The file is a thin wrapper — PresenterApp itself isn't touched.

**Files:**
- Create: `next-app/app/versammlung/page.tsx`

- [ ] **Step 1: Create the directory and file**

`next-app/app/versammlung/page.tsx`:

```tsx
'use client';
import { Suspense } from 'react';
import PresenterApp from '@/components/presenter/PresenterApp';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VersammlungPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PresenterApp />
    </Suspense>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /root/abstimmung/next-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /root/abstimmung
git add next-app/app/versammlung/page.tsx
git commit -m "feat(portal): host PresenterApp at /versammlung"
```

---

## Task 5: Back-Link from Rundlauf to Versammlung

Edit the `LandingPage()` function in `rundlauf-app/app/page.tsx` to show a small "auch verfügbar"-section. Only the anonymous landing view gets this — authenticated users do not.

**Files:**
- Modify: `rundlauf-app/app/page.tsx:121-129`

- [ ] **Step 1: Read the current `LandingPage()` to confirm the insertion point**

Open `/root/abstimmung/rundlauf-app/app/page.tsx`. Find the existing `<section className="mt-10 drk-card">` that contains the "So funktioniert es" list (lines ~121-129). The new section goes **immediately after** the closing `</section>` of that block, before the closing `</div>` of `LandingPage`.

- [ ] **Step 2: Insert the back-link section**

Locate this block:

```tsx
      <section className="mt-10 drk-card">
        <h3 className="font-bold mb-3">So funktioniert es</h3>
        <ol className="steps-list">
          <li>E-Mail-Adresse eingeben, Magic-Link erhalten.</li>
          <li>Kreisverband anlegen (wird vom Super-Admin freigeschaltet).</li>
          <li>Mitglieder per E-Mail einladen.</li>
          <li>Beschlüsse anlegen, Stimmen einsammeln, Protokoll als PDF.</li>
        </ol>
      </section>
    </div>
  );
}
```

Insert a new `<section>` between the closing `</section>` and the closing `</div>`:

```tsx
      <section className="mt-10 drk-card">
        <h3 className="font-bold mb-3">So funktioniert es</h3>
        <ol className="steps-list">
          <li>E-Mail-Adresse eingeben, Magic-Link erhalten.</li>
          <li>Kreisverband anlegen (wird vom Super-Admin freigeschaltet).</li>
          <li>Mitglieder per E-Mail einladen.</li>
          <li>Beschlüsse anlegen, Stimmen einsammeln, Protokoll als PDF.</li>
        </ol>
      </section>

      <section className="mt-6 drk-card">
        <h3 className="font-bold mb-2">Sie suchen eine Live-Abstimmung?</h3>
        <p className="text-sm mb-3" style={{ color: "var(--text-light)" }}>
          Für Echtzeit-Abstimmungen in Versammlungen (mit QR-Code für
          Teilnehmende) nutzen Sie das Schwester-Tool.
        </p>
        <a
          href="https://drk-abstimmung.de/versammlung"
          className="drk-btn-secondary inline-block"
        >
          Zur DRK Vereinsabstimmung →
        </a>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck rundlauf-app**

```bash
cd /root/abstimmung/rundlauf-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/app/page.tsx
git commit -m "feat(rundlauf): add back-link to drk-abstimmung.de on LandingPage"
```

---

## Task 6: Build Verification (both apps)

Both Next.js apps must build clean before deploy.

**Files:** none (build only)

- [ ] **Step 1: Build next-app**

```bash
cd /root/abstimmung/next-app && npm run build
```

Expected:
- "Compiled successfully"
- Build output lists both `/` and `/versammlung` as static or dynamic routes (depending on Next 16 defaults).
- No "Module not found" errors.
- No type errors.

- [ ] **Step 2: Lint next-app**

```bash
cd /root/abstimmung/next-app && npm run lint
```

Expected: no warnings or errors.

- [ ] **Step 3: Build rundlauf-app**

```bash
cd /root/abstimmung/rundlauf-app && npm run build
```

Expected: "Compiled successfully", no errors.

- [ ] **Step 4: Lint rundlauf-app**

```bash
cd /root/abstimmung/rundlauf-app && npm run lint
```

Expected: no warnings or errors.

- [ ] **Step 5: If both builds & lints are clean, no commit needed.**

Builds produce artifacts in `.next/` which are gitignored. Move on.

---

## Task 7: Local Smoke-Test (dev mode)

We don't have a test runner — verify by running the dev server and exercising the routes by hand. Caddy is NOT involved here; the dev server binds directly.

**Files:** none (manual verification)

- [ ] **Step 1: Start the next-app dev server**

```bash
cd /root/abstimmung/next-app && npm run dev
```

Expected: server listens on `http://localhost:3000`.

- [ ] **Step 2: Verify `/` shows the Portal**

In another terminal:

```bash
curl -s http://localhost:3000/ | grep -o "Wählen Sie Ihr Verfahren"
```

Expected: one match. If no match, the Portal heading didn't render — investigate.

- [ ] **Step 3: Verify `/?vote=ABC` still falls through to VoterApp (no Portal heading)**

```bash
curl -s "http://localhost:3000/?vote=ABC123" | grep -c "Wählen Sie Ihr Verfahren"
```

Expected: `0`. If non-zero, the VoterApp shortcut is broken.

- [ ] **Step 4: Verify `/versammlung` reaches the PresenterApp SetupForm**

```bash
curl -s http://localhost:3000/versammlung | grep -o "Versammlung einrichten"
```

Expected: one match (this string lives in `SetupForm.tsx`).

- [ ] **Step 5: Manually open in a browser**

Open these URLs in a browser and confirm each loads without console errors:

- `http://localhost:3000/` → Portal with two cards
- Click "Versammlung" card → navigates to `/versammlung`, shows SetupForm
- Click browser-back → back to Portal
- Hover over either card → border turns DRK-rot, card lifts slightly
- Resize window to ≤ 640px → cards stack vertically
- `http://localhost:3000/?vote=ABC123&mode=server` → VoterApp Server-Modus (no Portal)
- `http://localhost:3000/?vote=ABC123` → VoterApp P2P-Modus (no Portal)

If any of these fail, stop and debug before continuing.

- [ ] **Step 6: Stop the dev server**

`Ctrl+C` in the dev-server terminal.

- [ ] **Step 7: Test rundlauf-app**

```bash
cd /root/abstimmung/rundlauf-app && npm run dev
```

In a browser, open `http://localhost:3000/` (rundlauf will run on whatever port it picks — read the terminal). Verify:

- Anonymous user sees the new "Sie suchen eine Live-Abstimmung?" section below "So funktioniert es"
- The link `Zur DRK Vereinsabstimmung →` points to `https://drk-abstimmung.de/versammlung` (check via right-click → "Link-Adresse kopieren")
- Log in (any test user) and confirm the back-link section does **not** appear on the authenticated home view

Stop the dev server when done.

---

## Task 8: Deploy to Production

The VPS uses docker-compose. Both apps are in `abstimmung/docker-compose.yml` (services `abstimmung` and `rundlauf`).

**Files:** none (deploy only)

- [ ] **Step 1: Confirm `DB_PASSWORD` / `RUNDLAUF_DB_PASSWORD` is available**

Per project memory: before any `docker compose up` on prod, ensure DB credentials are set in env.

```bash
cd /root/abstimmung && grep -E "RUNDLAUF_DB_PASSWORD|DB_PASSWORD" .env 2>/dev/null | head
```

If empty or file missing: stop, ask user how to supply the password (do NOT run compose without it).

- [ ] **Step 2: Push the branch**

```bash
cd /root/abstimmung && git push -u origin feat/portal-startseite
```

- [ ] **Step 3: Open a PR (or fast-forward merge into main if user wants direct prod deploy)**

Ask the user which they prefer — PR with review, or direct merge (low-risk-prod preference is documented in memory, but a UI change to the landing page deserves a quick review).

If PR:
```bash
gh pr create --title "feat: portal-startseite with rundlauf link" --body "$(cat <<'EOF'
## Summary
- New Portal hub at `/` with two cards (Versammlung + Rundlaufbeschluss)
- SetupForm moves to `/versammlung`
- `?vote=…` URLs continue to render the VoterApp unchanged (QR-code compat)
- Symmetric back-link from rundlauf LandingPage to drk-abstimmung.de/versammlung

## Spec
docs/superpowers/specs/2026-05-21-rundlauf-portal-design.md

## Test plan
- [ ] `/` shows portal
- [ ] `/?vote=ABC&mode=server` shows VoterApp (regression)
- [ ] `/versammlung` shows SetupForm
- [ ] Rundlauf LandingPage (logged out) shows back-link, logged-in HomePage does not
- [ ] Mobile layout stacks cards

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: After merge to main, deploy**

```bash
cd /root/abstimmung && git checkout main && git pull --ff-only && docker compose up -d --build
```

Expected:
- `abstimmung` and `rundlauf` containers rebuild and restart
- Healthchecks pass

- [ ] **Step 5: Run server health-check**

```bash
/srv/ops/scripts/health-check.sh
```

Expected: green.

- [ ] **Step 6: Smoke-test production**

```bash
curl -sI https://drk-abstimmung.de/ | head -1
curl -s https://drk-abstimmung.de/ | grep -o "Wählen Sie Ihr Verfahren"
curl -sI https://drk-abstimmung.de/versammlung | head -1
curl -s https://drk-abstimmung.de/versammlung | grep -o "Versammlung einrichten"
curl -s "https://drk-abstimmung.de/?vote=ABC123" | grep -c "Wählen Sie Ihr Verfahren"
curl -s https://rundlauf.drk-abstimmung.de/ | grep -o "Sie suchen eine Live-Abstimmung"
```

Expected:
- HTTP 200 on `/` and `/versammlung`
- "Wählen Sie Ihr Verfahren" found on `/`
- "Versammlung einrichten" found on `/versammlung`
- Count `0` for `vote=ABC123` URL (Portal heading should NOT appear)
- "Sie suchen eine Live-Abstimmung" found on rundlauf landing

If anything fails, roll back: `docker compose down && git checkout <previous-sha> && docker compose up -d --build`.

- [ ] **Step 7: Final browser check**

Open `https://drk-abstimmung.de/` and `https://rundlauf.drk-abstimmung.de/` in a real browser. Confirm visual correctness on desktop and mobile (use DevTools device toolbar).

---

## Done Criteria

All of the following hold:

- `https://drk-abstimmung.de/` shows the Portal hub
- Clicking "Versammlung" goes to `/versammlung` which shows the existing SetupForm
- Clicking "Rundlaufbeschluss" navigates to `https://rundlauf.drk-abstimmung.de/`
- `https://drk-abstimmung.de/?vote=…` still renders the VoterApp (QR-code compat)
- `https://rundlauf.drk-abstimmung.de/` shows the back-link section when logged out
- `next build` and `next lint` pass for both apps
- Health-check is green after deploy
