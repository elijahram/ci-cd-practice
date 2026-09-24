# CI/CD Todo Demo — a hands-on CI/CD training lab

This repository is a **deliberately tiny** React + TypeScript todo app wrapped in a **complete, real
CI/CD pipeline**. The app is boring on purpose. The pipeline is the lesson.

```
Developer writes code → Pull Request → CI checks → Merge → Build ONE artifact
→ Deploy to Development → Test Development → Soak (wait / promote / abort) → Deploy to Production
```

Nothing in the pipeline is faked: the checks, coverage enforcement, builds, artifacts, deployments,
health checks, and Playwright runs against the live sites are all real.

| Environment | URL (example)                      | Hosted by                          |
| ----------- | ---------------------------------- | ---------------------------------- |
| Development | `https://cicd-demo-dev.vercel.app` | Vercel project **`cicd-demo-dev`** |
| Production  | `https://cicd-demo.vercel.app`     | Vercel project **`cicd-demo`**     |

> Vercel picks the exact domain when you create each project. If `cicd-demo.vercel.app` is already
> taken by someone else, you'll get something like `cicd-demo-elijahram.vercel.app`. The pipeline
> discovers the real domain automatically, and you can always find it in the Vercel dashboard under
> the project's **Domains**.

The app shows a colored **environment badge** (DEVELOPMENT / PRODUCTION / LOCAL) and, in the footer,
the **commit it was built from**. Open both sites after a release and you'll see the same commit in
both: that's "build once, promote the same artifact" made visible.

---

## Contents

1. [Tech stack](#tech-stack)
2. [Run it locally](#run-it-locally)
3. [Project layout](#project-layout)
4. [The whole pipeline in one diagram](#the-whole-pipeline-in-one-diagram)
5. [Setup guide (step by step)](#setup-guide-step-by-step)
6. [Hands-on labs: break things on purpose](#hands-on-labs-break-things-on-purpose)
7. [Understanding the CI/CD Pipeline](#understanding-the-cicd-pipeline)
8. [Workflow reference](#workflow-reference)
9. [GitHub Environments, secrets, variables and permissions](#github-environments-secrets-variables-and-permissions)
10. [How This Differs From a Real Production System](#how-this-differs-from-a-real-production-system)
11. [Troubleshooting](#troubleshooting)

---

## Tech stack

| Tool                           | Job in this project                                              |
| ------------------------------ | ---------------------------------------------------------------- |
| React + TypeScript             | The app                                                          |
| Vite                           | Dev server and production build (`dist/`)                        |
| ESLint                         | Code quality checks                                              |
| Prettier                       | Code formatting                                                  |
| Vitest + React Testing Library | Unit tests + 100% coverage enforcement                           |
| Playwright                     | End-to-end (E2E) browser tests, locally and against live sites   |
| GitHub Actions                 | Runs the whole pipeline                                          |
| GitHub Environments            | `development` and `production`, with their own secrets/variables |
| Vercel (Hobby plan)            | Free hosting for both environments                               |

---

## Run it locally

Requires Node.js 22 (see `.nvmrc`) and Git.

```bash
npm install                 # first time only (CI uses `npm ci`, explained below)
npx playwright install chromium   # first time only, downloads the E2E test browser

npm run dev                 # start the app at http://localhost:5173
npm run lint                # ESLint
npm run format              # Prettier: FIX formatting in all files
npm run format:check        # Prettier: only CHECK formatting (what CI runs)
npm run test                # unit tests (Vitest + React Testing Library)
npm run test:coverage       # unit tests + coverage report; fails below 100%
npm run build               # type-check + production build into dist/
npm run test:e2e            # Playwright E2E tests against the built app (run build first!)
npm run test:e2e:smoke      # only the small @smoke test (what Production runs)
```

`npm run test:e2e` serves the **built** `dist/` folder with `vite preview`, so run `npm run build`
first. After `npm run test:coverage`, open `coverage/index.html` in a browser to see line-by-line
coverage.

---

## Project layout

```
cicd-demo/
├── src/
│   ├── App.tsx               # the whole todo app
│   ├── environment.ts        # figures out Dev/Prod/Local from the URL + build info
│   ├── main.tsx              # mounts <App /> into index.html
│   ├── index.css
│   ├── *.test.ts(x)          # unit tests (Vitest + React Testing Library)
│   └── setupTests.ts
├── tests/e2e/                # Playwright tests
│   ├── todo.spec.ts          # full user journey (PR + Development)
│   ├── smoke.spec.ts         # tiny @smoke test (Production)
│   └── helpers.ts
├── scripts/
│   ├── fingerprint.sh        # SHA-256 of the whole build → proves "same artifact"
│   ├── health-check.sh       # HTTP 200 check with retries
│   ├── wait-for-release.sh   # waits until a site serves a specific commit
│   ├── release-status.sh     # reads/writes the "release-control" commit status
│   ├── deploy-vercel.sh      # uploads the prebuilt artifact to a Vercel project (no rebuild)
│   └── environment-url.sh    # finds the current Development URL from GitHub's deployment history
├── .github/
│   ├── actions/setup-project/action.yml   # shared "setup Node + npm ci" steps
│   └── workflows/
│       ├── ci-checks.yml            # reusable: lint → format → tests → coverage → build → E2E
│       ├── pr-checks.yml            # Phase 2: runs ci-checks on every Pull Request
│       ├── release-pipeline.yml     # Phases 3-6: main → Dev → soak → Prod
│       ├── deploy-production.yml    # reusable: deploy + smoke-test Production
│       ├── promote-early.yml        # Option 2: 🚀 Promote Development to Production NOW
│       └── abort-release.yml        # Option 3: 🛑 Abort Development Release
├── vite.config.ts            # Vite + Vitest + 100% coverage thresholds
├── playwright.config.ts
├── eslint.config.js
├── .prettierrc.json
└── vercel.json               # safety net: stops Vercel from auto-building on git push
```

---

## The whole pipeline in one diagram

```mermaid
flowchart TD
    dev["👩‍💻 Developer"] --> branch["Feature branch<br/>feature/my-change"]
    branch --> pr["Pull Request into main"]

    subgraph CI ["Phase 2 · Pull Request checks (pr-checks.yml)"]
        lint["Lint Code<br/>(ESLint)"] --> fmt["Check Formatting<br/>(Prettier)"]
        fmt --> unit["Run Unit Tests<br/>(Vitest + RTL)"]
        unit --> cov["Check 100% Coverage"]
        cov --> build1["Build Application"]
        build1 --> e2e1["Run E2E Tests<br/>(Playwright)"]
        e2e1 --> green["All Checks Passed<br/>✅ safe to merge"]
    end

    pr --> lint
    green --> merge["Merge to main"]

    subgraph REL ["Phases 3-6 · Release Pipeline (release-pipeline.yml)"]
        ci2["CI checks again on main"] --> artifact["Build ONE artifact<br/>react-build-artifact"]
        artifact --> ddev["Deploy Development"]
        ddev --> hdev["Development health check"]
        hdev --> pwdev["Playwright against Development"]
        pwdev --> soak{"1-hour soak window"}
        soak -- "🚀 Promote Early" --> prod
        soak -- "🛑 Abort" --> stop["STOP<br/>Production untouched"]
        soak -- "No action" --> wait["Wait 1 hour"]
        wait --> hdev2["Development health check"]
        hdev2 --> prod["Deploy Production<br/>(same artifact, no rebuild)"]
        prod --> hprod["Production health check"]
        hprod --> smoke["Production smoke test"]
        smoke --> done["✅ Successful release"]
    end

    merge --> ci2
```

---

## Setup guide (step by step)

You need Git, Node.js 22, a GitHub account and a free Vercel account. Replace `<your-username>`
with your GitHub username.

> **Coming from the GitHub Pages version of this project?** You no longer need the
> `cicd-demo-dev` **GitHub** repository or the `DEV_PAGES_DEPLOY_TOKEN` secret. Delete the secret
> (Settings → Environments → development), turn off Pages (Settings → Pages), and delete the
> `cicd-demo-dev` GitHub repo if you like. Then follow steps 2–6 below.

### 1. Create the GitHub repository

github.com → **+** (top right) → **New repository**

- Name: `cicd-demo`. **Public** is recommended: public repos get unlimited free GitHub Actions
  minutes, which matters because the soak job keeps a runner busy for an hour.
- Do **not** add a README, .gitignore or license (the repo must be empty).

### 2. Create the two Vercel projects

Sign up at [vercel.com](https://vercel.com) (the free **Hobby** plan is enough). Then, in a terminal:

```bash
npm install -g vercel     # the Vercel command-line tool
vercel login              # opens your browser to log in

vercel project add cicd-demo-dev    # the DEVELOPMENT site
vercel project add cicd-demo        # the PRODUCTION site
```

> ⚠️ **Do not click "Import Git Repository" in the Vercel dashboard.** That would connect Vercel to
> GitHub, and Vercel would then build and deploy _every push by itself_, skipping all of our checks,
> the soak window, and the "build once" rule. In this project **GitHub Actions is in charge** and
> Vercel is only the host. (`vercel.json` also turns Git deployments off as a safety net.)

**Why two Vercel projects?** Each project has one stable public "production domain" that always
points at its latest deployment. Using one project for Development and one for Production gives us
two real, public URLs, and lets us upload the **same files** to both.

(Vercel also has its own "Preview → Promote to Production" feature, but promoting a preview
deployment **rebuilds** it, which breaks the build-once rule we're here to learn. Preview URLs are
also password-protected by default, so Playwright couldn't open them without extra setup.)

**Get the IDs the pipeline needs.** Link a scratch folder to each project and read the IDs it
writes:

```bash
mkdir -p ~/vercel-ids && cd ~/vercel-ids

vercel link --yes --project cicd-demo-dev
cat .vercel/project.json        # {"projectId":"prj_AAA...","orgId":"team_XXX..."}

rm -rf .vercel
vercel link --yes --project cicd-demo
cat .vercel/project.json        # {"projectId":"prj_BBB...","orgId":"team_XXX..."}
```

Write down three values: `orgId` (the same for both), the **dev** `projectId`, and the **prod**
`projectId`. (You can also find them in the Vercel dashboard: Project → **Settings** → **General** →
_Project ID_, and Team **Settings** → **General** → _Team ID_.) You can delete `~/vercel-ids`
afterwards.

### 3. Create a Vercel token

GitHub Actions needs a token to deploy on your behalf.

1. vercel.com → your avatar → **Account Settings** → **Tokens** (or go to
   `vercel.com/account/settings/tokens`).
2. **Create Token**:
   - Name: `github-actions-cicd-demo`
   - Scope: your team (the one that owns the two projects)
   - Expiration: 90 days (or whatever you prefer)
3. Copy the token (you won't see it again).

**Why a token, and why is it a secret?** Anyone who holds it can deploy to (or delete) projects in
that Vercel team. So it lives only in GitHub **Secrets**, which are encrypted, never shown again in
the UI, and automatically hidden (`***`) in workflow logs. Vercel tokens can't be limited to a single
project, so the smallest scope available is: one team, with an expiry date. For stricter separation,
create **two** tokens (one per environment) so either can be revoked on its own.

### 4. Configure GitHub: environments, secret and variables

In **`cicd-demo`** on GitHub:

**a) Repository variable** (shared by both environments): Settings → **Secrets and variables** →
**Actions** → **Variables** tab → **New repository variable**

| Name            | Value                                |
| --------------- | ------------------------------------ |
| `VERCEL_ORG_ID` | the `orgId` (`team_...`) from step 2 |

**b) `development` environment**: Settings → **Environments** → **New environment** → `development`
(if it already exists, click it)

- **Environment secrets** → **Add environment secret**: `VERCEL_TOKEN` = the token from step 3
- **Environment variables** → **Add environment variable**: `VERCEL_PROJECT_ID` = the **dev**
  `projectId`

**c) `production` environment**: **New environment** → `production`

- **Environment secrets** → `VERCEL_TOKEN` = the token (or your second token)
- **Environment variables** → `VERCEL_PROJECT_ID` = the **prod** `projectId`
- **Deployment branches and tags** → change "No restriction" to **Selected branches and tags** →
  **Add deployment branch or tag rule** → `main`. Now only code on `main` can ever reach Production.

**This is what GitHub Environments are for.** Both deploy jobs run the _same_ script
(`scripts/deploy-vercel.sh`) with the _same_ artifact. The only difference is which environment the
job uses, and therefore which `VERCEL_PROJECT_ID` it receives: dev project or prod project.

Optional environment variable in either environment: `APP_URL` (e.g.
`https://cicd-demo-dev.vercel.app/`) if you ever want to force a specific URL instead of letting the
pipeline discover it.

### 5. Configure GitHub Actions

In `cicd-demo` → Settings → Actions → General:

- **Actions permissions:** "Allow all actions and reusable workflows" (the default).
- **Workflow permissions:** "**Read repository contents and packages permissions**" (read-only).
  Our workflows ask for extra permissions only on the specific jobs that need them (see
  [permissions](#github-action-permissions-least-privilege)).

### 6. Push the project

From the project folder on your computer:

```bash
npm install
git init -b main
git add .
git commit -m "Initial commit: CI/CD demo"
git remote add origin https://github.com/<your-username>/cicd-demo.git
git push -u origin main
```

(Already pushed the GitHub Pages version? Copy the new files over your folder, then
`git add -A && git commit -m "Deploy with Vercel" && git push`. Branch protection isn't set up yet,
so you can push straight to `main` this once.)

The push to `main` starts the **Release Pipeline** (Actions tab). Watch it run CI, deploy to the
Development Vercel project, test it, and start the soak.

### 7. Configure branch protection

This stops anyone from merging code into `main` unless CI is green.

`cicd-demo` → Settings → **Rules** → **Rulesets** → **New ruleset** → **New branch ruleset**:

- Ruleset name: `protect-main`, Enforcement status: **Active**
- Target branches → **Add target** → **Include default branch**
- ✅ **Require a pull request before merging** (set required approvals to **0** if you work alone;
  you can't approve your own PR)
- ✅ **Require status checks to pass** → **Add checks** → type `All Checks Passed` → select
  **`CI / All Checks Passed`**
  - ✅ **Require branches to be up to date before merging** (recommended)
- ✅ **Block force pushes**
- **Create**

> The check only appears in the search box after it has run at least once, which happens when you
> open your first PR (step 9). If you can't find it yet, come back after step 10.

(Classic alternative: Settings → Branches → **Add classic branch protection rule** for `main` with
the same options.)

**Why require only one check?** `All Checks Passed` is a "gate" job that depends on every other CI
job and **fails unless all of them succeeded**. Requiring just the gate means you won't have to
update branch protection when a check is added or renamed.

### 8. Open your first feature branch

```bash
git checkout main
git pull
git checkout -b feature/add-todo-counter
```

Make a small, visible change. For example, in `src/index.css` change the `.env-development`
background color from `#bf8700` to `#8250df` (purple). Then:

```bash
# optional local checks (CI will enforce them anyway)
npm run lint && npm run format:check && npm run test:coverage && npm run build && npm run test:e2e

git add .
git commit -m "Make the Development badge purple"
git push -u origin feature/add-todo-counter
```

### 9. Open a Pull Request

GitHub shows a **Compare & pull request** banner. Click it (base: `main` ← compare:
`feature/add-todo-counter`) → **Create pull request**.

### 10. Watch CI execute

On the PR, click **Details** next to a check (or open the **Actions** tab → **Pull Request
Checks**). You'll see the graph:

```
Lint Code → Check Formatting → Run Unit Tests → Check 100% Coverage → Build Application → Run E2E Tests → All Checks Passed
```

Click any job to watch its live log. The run's **Summary** page shows the coverage table and the
`react-build-artifact` you can download.

### 11. Merge the Pull Request

When everything is green, click **Merge pull request**. Merging pushes to `main`, which starts the
**Release Pipeline**.

### 12. Watch Development deploy

Actions → **Release Pipeline** → the newest run. The graph shows:

```
CI on main (all 7 jobs again) → Deploy Development → Test Development → Development Soak → Production
```

**Deploy Development** uploads the artifact to the `cicd-demo-dev` Vercel project, then waits until
the live site reports the new commit in `/release.json`. **Test Development** runs a health check and the full
Playwright suite against the real URL.

### 13. Open the Development URL

Click the URL on the **Deploy Development** box in the workflow graph (or find it in Vercel →
`cicd-demo-dev` → **Domains**, e.g. `https://cicd-demo-dev.vercel.app`). You should see the yellow
**DEVELOPMENT** badge, and the footer shows the commit from your merge. You can also watch the new
deployment appear in the Vercel dashboard under **Deployments**.

### 14. Test it manually

Add, complete and delete some todos. Resize the browser to phone width. This is exactly what the
soak window is for: a human looking at the real deployed app. Meanwhile, the **Development Soak**
job logs a countdown every minute.

> **Tip while learning:** 60 minutes is a long time to wait. Add a **repository variable**
> `SOAK_MINUTES` = `5` (Settings → Secrets and variables → Actions → **Variables** tab → New
> repository variable). Delete it later to go back to 60.

### 15. Promote early

Actions → left sidebar → **🚀 Promote Development to Production NOW** → **Run workflow** → type
`PROMOTE` → **Run workflow**.

It identifies the release currently in Development, checks it's healthy and not aborted, and deploys
the **same artifact** to Production. The run summary says **EARLY MANUAL PROMOTION**. Within a
minute, the **Development Soak** job in the Release Pipeline notices and ends with _"Release was
already promoted EARLY"_.

### 16. Abort a future release

Make another feature branch and PR, then merge it. When the Release Pipeline reaches **Development
Soak**:

Actions → **🛑 Abort Development Release** → **Run workflow** → reason: `Layout broken on mobile` →
**Run workflow**.

Within a minute the soak job stops, and a green **Release Aborted (Production skipped)** job appears.
The Production job is **skipped**. The commit on `main` shows a red ✗ labelled
`release-control — ABORTED by @you: Layout broken on mobile`. Production still runs the previous
release.

### 17. Let another release promote automatically

Merge one more PR and do **nothing**. After the soak window (60 min, or your `SOAK_MINUTES`) the
soak job:

1. checks the release wasn't aborted,
2. health-checks Development and confirms it still serves this release,
3. hands off to **Deploy Production** → **Production Smoke Test**.

The summary says **AUTOMATIC PROMOTION after the Development soak window**.

### 18. Open the Production URL

Click the URL on the **Deploy Production** box (or Vercel → `cicd-demo` → **Domains**). Green
**PRODUCTION** badge, and the footer shows **the same commit and run number** as Development. Same
artifact, two environments.

---

## Hands-on labs: break things on purpose

Do each on its own feature branch, open a PR, watch the pipeline turn red, then fix it and watch it
turn green. **Never merge a red PR** (branch protection won't let you).

| Lab                  | What to change                                                                                                                                                                     | Job that fails        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1. Break linting     | In `App.tsx` add `const unused = 1;` inside `App()`                                                                                                                                | Lint Code             |
| 2. Break formatting  | Change `const remaining = ` to `const   remaining   = ` and **don't** run `npm run format`                                                                                         | Check Formatting      |
| 3. Break a unit test | In `App.tsx` change the word `remaining` in `{remaining === 1 ? 'todo' : 'todos'} remaining` to `left`                                                                             | Run Unit Tests        |
| 4. Reduce coverage   | Add an untested function to `environment.ts`: `export function unused() { return 1; }`                                                                                             | Check 100% Coverage   |
| 5. Break an E2E test | In `tests/e2e/todo.spec.ts` change `{ name: 'Add' }` to `{ name: 'Save' }`                                                                                                         | Run E2E Tests         |
| 6. Break the build   | In `App.tsx` add `const title: number = 'CI/CD Todo Demo';` and use it: `<h1>{title}</h1>` (lint and unit tests still pass; the TypeScript type check in `npm run build` does not) | Build Application     |
| 7. Fix everything    | Undo your changes (`git checkout main -- .`), commit, push                                                                                                                         | Nothing, all green ✅ |

Notice that each failure **stops everything after it**: when lint fails, tests never even start. Also
notice that **nothing gets deployed** from any PR, even a green one.

Then practice the release decisions: [promote early](#15-promote-early),
[abort](#16-abort-a-future-release), and [automatic promotion](#17-let-another-release-promote-automatically).

---

## Understanding the CI/CD Pipeline

### What is Continuous Integration?

**Continuous Integration (CI)** means every time a developer tries to _integrate_ their changes into
the shared code (`main`), a machine automatically checks that the changes are safe. Humans forget
to run tests; CI never forgets.

```
Feature Branch → Pull Request → Automated Checks → Merge
```

- **Feature branch:** your own copy of the code to work on (`feature/add-todo-counter`). `main` is
  untouched while you work.
- **Pull Request (PR):** "I'd like to merge my branch into `main`." Teammates review it, and CI
  checks it.
- **Automated checks:** GitHub Actions runs `pr-checks.yml` on every PR and every new push to it.
- **Merge:** allowed only when checks are green (enforced by branch protection).

`main` is the **production branch**: whatever is on `main` is on its way to users. Protecting it is
the whole point.

**Local checks vs CI:** You _can_ run `npm run lint`, `npm run test`, etc. locally before pushing,
and it's a good habit because it's faster feedback. But it's **optional**. GitHub Actions runs the
same checks on every PR, and branch protection **enforces** them. You can't forget.

### Why each check exists

| Check                | Question it answers                                 |
| -------------------- | --------------------------------------------------- |
| **ESLint**           | Does the code contain known bugs or bad patterns?   |
| **Prettier**         | Is the code formatted the team's way?               |
| **Unit tests**       | Does each piece of app behavior work?               |
| **Coverage**         | Did the tests actually execute all of the code?     |
| **Build**            | Can the app be turned into deployable files at all? |
| **Playwright (E2E)** | Does the finished app work in a real browser?       |

They're ordered cheapest/fastest first, so obvious problems fail in seconds instead of after a slow
browser test.

#### ESLint

ESLint checks **code quality**. It reads your code without running it and catches certain bugs or
bad coding patterns before code is merged: unused variables, a React hook called inside an `if`
(which causes subtle bugs), `any` types that defeat TypeScript, and more. Config:
`eslint.config.js`. The CI pipeline fails if linting fails (`--max-warnings 0` makes even warnings
fail).

#### Prettier

Prettier is the project **formatter**: quotes, semicolons, indentation, line length. It keeps code
formatting consistent across developers so code reviews focus on logic, not on spacing arguments,
and diffs don't fill up with whitespace changes.

- `npm run format` **rewrites** files into the standard format.
- `npm run format:check` only **checks** (never edits). CI runs this and fails if any file doesn't
  match. The fix is always: run `npm run format`, commit.

ESLint and Prettier don't fight because `eslint-config-prettier` turns off ESLint's formatting rules.
ESLint handles quality, Prettier handles formatting.

### Unit tests (Vitest + React Testing Library)

**Unit tests** check individual pieces of application behavior **quickly and in isolation**. They
don't open a real browser or a real website. Vitest runs them in a simulated browser (jsdom), and
React Testing Library lets tests interact with components the way a user would: find the input by
its label, type, click the button.

Example from `src/App.test.tsx`:

```tsx
it('adds a todo and clears the input', async () => {
  const { input, addTodo } = setup(); // render <App /> in the simulated browser
  await addTodo('Learn CI/CD'); // type into the input and click "Add"

  expect(within(list).getByText('Learn CI/CD')).toBeInTheDocument();
  expect(input).toHaveValue('');
  expect(screen.getByTestId('remaining')).toHaveTextContent('1 todo remaining');
});
```

All 13 unit tests run in a couple of seconds, which is why they run before the slower checks.

### Coverage

**Coverage** measures _which parts of the code were executed_ while the unit tests ran:

| Metric         | Meaning                                                          | Example in this app                                                       |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Statements** | % of individual statements executed                              | `setText('')` ran at least once                                           |
| **Branches**   | % of decision paths taken (both sides of every `if`, `?:`, `??`) | `remaining === 1 ? 'todo' : 'todos'`: tests must hit **both** 1 and not-1 |
| **Functions**  | % of functions called at least once                              | `addTodo`, `toggleTodo`, `deleteTodo`, `getEnvironment`...                |
| **Lines**      | % of source lines executed                                       | similar to statements, counted per line                                   |

The thresholds are configured explicitly in `vite.config.ts`:

```ts
thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 }
```

If any number drops below 100, `npm run test:coverage` exits with an error and the **Check 100%
Coverage** job fails.

**Why 100% here?** This project exists for learning, and the app is tiny, so 100% is realistic. It
also makes [Lab 4](#hands-on-labs-break-things-on-purpose) instantly visible. **Real production
systems do not necessarily require 100% coverage.** Many teams pick 70-90% because the last few
percent often cost more than they're worth.

**100% coverage does NOT mean there are no bugs.** Coverage proves code _ran_ during a test, not that
the test _checked the right thing_. A test that renders the app and asserts nothing can still produce
100% coverage. Coverage also can't tell you about a broken mobile layout, a typo in the UI, or a
feature that was never written.

### Playwright (E2E tests)

**End-to-end (E2E) tests** use a **real browser** (Chromium) and interact with the **complete,
built app** like a real user:

```
open website → type todo → click "Add" → verify todo appears → check it → delete it → verify it's gone
```

See `tests/e2e/todo.spec.ts`. In this project Playwright runs **three times** per release:

| When              | Against                                            | Tests                        |
| ----------------- | -------------------------------------------------- | ---------------------------- |
| Before merge (PR) | the built artifact served locally (`vite preview`) | full suite                   |
| After Dev deploy  | the **real Development URL**                       | full suite                   |
| After Prod deploy | the **real Production URL**                        | only the small `@smoke` test |

When testing a deployed site, the tests also assert that the page shows the **expected commit** and
the **expected environment badge**, so they can't accidentally pass against an old cached version.

**Unit vs E2E: why both?**

|               | Unit tests (Vitest + RTL)                  | E2E tests (Playwright)                               |
| ------------- | ------------------------------------------ | ---------------------------------------------------- |
| What runs     | one component/function in a fake browser   | the whole built app in a real browser                |
| Speed         | milliseconds per test                      | seconds per test                                     |
| When it fails | points at the exact broken piece           | tells you "the user journey is broken", less precise |
| Catches       | logic bugs, edge cases (empty input, etc.) | build/bundling problems, wiring, real browser issues |

Unit tests are fast and precise, so you can have many. E2E tests are slower but prove the real thing
works. Teams use lots of unit tests and a few important E2E journeys (the "testing pyramid").

### Build

`npm run build` does two things:

1. `tsc -b`: TypeScript type-checks the whole project (a type error fails the build).
2. `vite build`: Vite converts the source application (TypeScript, JSX, CSS, imports) into
   **static production files** inside `dist/`: minified, bundled, with content-hashed file names.

```
dist/
├── index.html
├── favicon.svg
├── release.json          ← added by CI: commit, run, fingerprint
└── assets/
    ├── index-BEPWsjes.js ← all of React + your app, minified
    └── index-beAIC1-w.css
```

**Those files are what actually get deployed.** Browsers never see `App.tsx`; they get `dist/`.

`vite.config.ts` sets `base: './'` so every asset URL is **relative**. The identical `dist/` works
on any host or path: both Vercel sites, `vite preview`, or a sub-folder.

**Deploying without rebuilding on Vercel:** Vercel normally builds your source code on its own
servers. We don't let it. `scripts/deploy-vercel.sh` puts the artifact's files into Vercel's
[Build Output API](https://vercel.com/docs/build-output-api) layout (`.vercel/output/static/`) and
runs `vercel deploy --prebuilt --prod`, which uploads those exact files. Vercel runs no `npm
install` and no `npm run build`.

### Build artifacts

A **build artifact** is the output of a build, saved and versioned so later steps can use it.

```
Source code                      Build artifact
src/                             dist/
  App.tsx          npm run         index.html
  environment.ts   ─────────►      assets/index-<hash>.js
  main.tsx          build          assets/index-<hash>.css
  index.css                        release.json
```

The **Build Application** job uploads `dist/` as a GitHub Actions artifact named
**`react-build-artifact`**, attached to that workflow run (download it from the run's Summary page).
Every later stage **downloads** it instead of building again.

#### Build once, promote the same artifact

This is one of the most important ideas in CD.

❌ **Don't:**

```
Build → Development → Build again → Production
```

The second build might differ: a dependency published a new patch version, a different Node
version, a different environment variable. Then Production runs something **nobody tested**.

✅ **Do:**

```
              Build
                ↓
          Build Artifact
             /     \
            ↓       ↓
          DEV  →  PROD
```

Production must receive **the exact files that were tested in Development**. This project proves it
with a **fingerprint**: `scripts/fingerprint.sh` computes one SHA-256 hash over every file in the
build. The hash is computed at build time, **re-checked before every deploy** (the deploy fails on a
mismatch), and finally compared against what the live Production site serves. Change one byte and
the fingerprint changes.

It's also why the app can't have "this is Development" baked in at build time. Instead,
`src/environment.ts` looks at the host name at runtime (`cicd-demo-dev…` = Development,
`cicd-demo…` = Production) to decide which badge to show.

### Continuous Delivery / Continuous Deployment

CI ends at "the code on `main` is valid." **CD** is everything after: getting that code to users
safely.

```
main → build → development → verification → production
```

- **Continuous Delivery:** every change is automatically built, tested and deployed to a
  pre-production environment, so it's **always ready** to release. A **human decides** when it
  goes to Production.
- **Continuous Deployment:** every change that passes all automated checks goes to Production
  **automatically**, with no human decision.

This project demonstrates both: if nobody acts, the release goes out on its own after the soak
(continuous deployment); **Promote Early** and **Abort** let a human make the call (continuous
delivery).

### The Development environment

Companies deploy to a **Development / Staging** environment before Production because tests on a
build server aren't the same as the app **actually deployed** on real infrastructure: real URLs,
real CDN, real hosting config. Deploying to Development first gives:

- **automated systems** a chance to test the real deployed app (health check + Playwright against the
  live Dev URL), and
- **humans** a chance to look at it, click around, try it on a phone.

If anything is wrong, only the team sees it, not users.

### The soak period

A **soak period** is a deliberate waiting period where a release "soaks" in an environment before
moving on. Many real problems only show up over time or with humans looking: slow memory leaks,
errors that only happen occasionally, something that "just looks wrong".

Here, after Development passes automated testing, the release stays in Development for **1 hour**.
During that hour anyone can open the Development URL and test manually. Then one of three things
happens:

```
                 Start 1-hour soak
        ┌───────────────┼────────────────┐
  Promote Early       Abort          No action
        ↓               ↓                ↓
    Production        STOP          wait 1 hour
                                         ↓
                                   Dev health check
                                         ↓
                                     Production
```

**How it works:** the soak job, the Promote workflow and the Abort workflow are separate runs, so they
need a shared place to record decisions. We use a GitHub **commit status** called `release-control`
on the release commit, the same mechanism that shows ✓/✗ next to commits:

| Status     | Meaning                                                       |
| ---------- | ------------------------------------------------------------- |
| 🟡 pending | soaking in Development                                        |
| 🔴 failure | **aborted** by a developer (or superseded by a newer release) |
| 🟢 success | promoted to / live in Production                              |
| 🔴 error   | a Production deployment or smoke test failed                  |

The soak job checks it every minute. You can see it next to the commit on GitHub.

If another PR is merged during the soak, the new release replaces the old one in Development. The
old release's soak job notices ("superseded") and **won't** promote. We never promote something
that isn't what people are currently testing.

### Promote early

If Development has been tested thoroughly and everything looks right, waiting the rest of the hour
is pointless. **🚀 Promote Development to Production NOW** (a `workflow_dispatch` workflow, i.e. a
manual "Run workflow" button) promotes it immediately. It:

1. identifies the release currently in Development (finds the Dev URL in GitHub's deployment
   history for the `development` environment, then reads `/release.json` from that site),
2. verifies Development is healthy,
3. confirms the release isn't aborted (or already promoted),
4. downloads the **same artifact** from the original pipeline run,
5. deploys it to Production without rebuilding,
6. labels the run **EARLY MANUAL PROMOTION**.

### Abort release

Automated tests can't detect every possible problem. Example: **all tests pass, but the layout
looks broken on mobile.** No unit test or E2E test checked the layout at phone width.

A developer notices this in Development and runs **🛑 Abort Development Release** with a reason. The
release is marked aborted, the soak job stops, Production is **not** touched, and the pipeline shows
a **Release Aborted (Production skipped)** job, so it's clear the stop was intentional and not a
random failure. The team then fixes the issue on a new branch and opens another PR, which goes
through the whole pipeline again.

### Automatic promotion

If nobody aborts or promotes early, then after 1 hour:

```
Check release wasn't aborted → Development health check → Production deployment
```

happens automatically, deploying the **same artifact** (no rebuild).

### Production smoke test

After deploying to Production we still test it, with a small **smoke test**: the app loads, the
heading exists, a user can add one todo. Why, if Development already passed everything?

- The **deployment itself** could have failed or been partial even though Development worked
  (wrong project settings, a hosting outage, a domain problem, an expired token).
- Production is a **different Vercel project** with its own settings and domain. Development
  working doesn't prove Production is configured correctly.

The smoke test is intentionally **small and non-destructive**: in a real system you don't want to
create fake orders or spam real users. (Here todos live only in browser memory, so it's harmless.)

**If the Production smoke test fails:** the job turns red, the release gets a `release-control`
**error** status, and the summary explains what happened. Real companies often **roll back
automatically** (re-deploy the previous good version). This project doesn't, to keep things simple.
To roll back by hand, Vercel has **Instant Rollback**: Vercel dashboard → `cicd-demo` project →
**Instant Rollback** on the Production Deployment tile (on the free Hobby plan you can go back to the
immediately previous deployment). It points the production domain back at the old deployment in
seconds, without rebuilding. Then fix the bug in a new PR.

> After an Instant Rollback, Vercel stops moving the production domain to new deployments until you
> click **Undo Rollback** on the same tile. Until then, the next pipeline run will fail at "Wait for
> Production to serve this release". Real teams have to remember this too.

### GitHub Environments

A **GitHub Environment** (`development`, `production`) is a named deployment target in your repo.
Each one can have:

- its own **secrets** (e.g. `VERCEL_TOKEN`),
- its own **variables** (e.g. `VERCEL_PROJECT_ID`: the dev project in `development`, the prod
  project in `production`),
- **protection rules** (Production accepts deployments only from `main`; you could also add
  required reviewers or a wait timer),
- a **deployment history** with URLs (repo main page → **Deployments**).

**Why companies separate Development and Production:** Production is where real users and real
data are. Separate environments mean mistakes in Development hurt nobody, credentials for one can't
touch the other, and stricter rules can be applied where the stakes are highest.

### GitHub Action permissions (least privilege)

Every workflow run gets a `GITHUB_TOKEN`. By default it can have broad access. If a malicious
dependency or a compromised third-party action runs in your workflow, it can do anything that token
allows. So we give each job **only what it needs**:

- workflows start with `permissions: {}` (nothing) or `contents: read`,
- then individual jobs add what they need:

| Permission          | Used by                              | Why                                            |
| ------------------- | ------------------------------------ | ---------------------------------------------- |
| `contents: read`    | almost all jobs                      | check out the code                             |
| `actions: read`     | Deploy Production                    | download an artifact from another workflow run |
| `statuses: write`   | Soak, Deploy/Smoke Production, Abort | read/write the `release-control` commit status |
| `statuses: read`    | Promote Early                        | read the `release-control` status              |
| `deployments: read` | Promote Early, Abort                 | find the current Development URL               |

Deploying to Vercel needs **no** extra GitHub permissions: it uses the `VERCEL_TOKEN` secret, which
only the jobs running in the `development` or `production` environment can read.

PR workflows get **read-only** access, which is part of why PRs can never deploy.

---

## Workflow reference

| Workflow file           | Name in Actions tab                        | Trigger                       |
| ----------------------- | ------------------------------------------ | ----------------------------- |
| `pr-checks.yml`         | Pull Request Checks                        | PR into `main` opened/updated |
| `release-pipeline.yml`  | Release Pipeline                           | push to `main` (merge)        |
| `promote-early.yml`     | 🚀 Promote Development to Production NOW   | manual (Run workflow)         |
| `abort-release.yml`     | 🛑 Abort Development Release               | manual (Run workflow)         |
| `ci-checks.yml`         | _(reusable, called by the two above)_      | `workflow_call`               |
| `deploy-production.yml` | _(reusable, called by pipeline + promote)_ | `workflow_call`               |

Job names you'll see in the graph: **Lint Code, Check Formatting, Run Unit Tests, Check 100%
Coverage, Build Application** (its _Create Build Artifact_ step uploads `react-build-artifact`),
**Run E2E Tests, All Checks Passed, Deploy Development, Test Development, Development Soak, Release
Aborted (Production skipped), Deploy Production, Production Smoke Test**.

Every workflow file is heavily commented. Reading them top to bottom is a good next step.

---

## GitHub Environments, secrets, variables and permissions

Everything you configure, in one place:

| What                | Where (in the `cicd-demo` GitHub repo)                     | Required? | Value                                         |
| ------------------- | ---------------------------------------------------------- | --------- | --------------------------------------------- |
| `VERCEL_ORG_ID`     | Settings → Secrets and variables → Actions → **Variables** | **Yes**   | Vercel team ID (`team_...`)                   |
| `VERCEL_TOKEN`      | Settings → Environments → **development** → secrets        | **Yes**   | Vercel token                                  |
| `VERCEL_PROJECT_ID` | Settings → Environments → **development** → variables      | **Yes**   | ID of the `cicd-demo-dev` Vercel project      |
| `VERCEL_TOKEN`      | Settings → Environments → **production** → secrets         | **Yes**   | Vercel token (same or a second one)           |
| `VERCEL_PROJECT_ID` | Settings → Environments → **production** → variables       | **Yes**   | ID of the `cicd-demo` Vercel project          |
| `APP_URL`           | either environment → variables                             | No        | force a URL instead of auto-discovering it    |
| `SOAK_MINUTES`      | Settings → Secrets and variables → Actions → **Variables** | No        | default `60`; use `5` while learning (max 60) |
| `DEV_URL`           | Settings → Secrets and variables → Actions → **Variables** | No        | override the Dev URL for Promote/Abort        |

You can store `VERCEL_TOKEN` once as a **repository** secret instead (Settings → Secrets and
variables → Actions → **Secrets** → New repository secret). It works, but then every workflow in
the repo can read it. Environment secrets are stricter.

---

## How This Differs From a Real Production System

Real companies use more (and bigger) tools:

- **Hosting / infrastructure:** AWS, Azure, Google Cloud, Vercel (like here), Netlify, **Docker**
  containers, **Kubernetes** clusters.
- **Vercel's own workflow:** many teams let Vercel's Git integration build every branch as a
  _preview deployment_ and use Vercel's staged production deployments plus **Promote** instead of a
  second project. We use two projects + GitHub Actions so every step is visible and the artifact is
  built exactly once.
- **Pipeline tools:** GitHub Actions (like here), Jenkins, GitLab CI, CircleCI.
- **Deployment tools:** **ArgoCD** (GitOps: the cluster syncs itself to what's in Git),
  **Spinnaker** (multi-stage cloud deployments with approvals).
- **GitHub Environments** with required reviewers and wait timers, instead of our custom
  promote/abort workflows.
- **Feature flags:** ship code turned _off_, then turn it on for some users without deploying.
- **Canary deployments:** send the new version to 1% of users, watch the metrics, then 10%, then 100%.
- **Blue/green deployments:** run the old (blue) and new (green) versions side by side and switch
  traffic instantly; switching back is an instant rollback.
- **Automatic rollback:** if error rates spike after a deploy, return to the previous version
  automatically.
- **Observability platforms** (Datadog, Grafana, Prometheus, Sentry, New Relic): real soak periods
  watch **error rates, latency and logs**, not just "does it return HTTP 200".
- **Parallel CI jobs** and caching to keep PR feedback fast (we run jobs one after another so it's
  easier to watch).

But the **concepts are exactly the same** as in this small project:

1. Every change goes through a PR with automated checks.
2. Protected `main`.
3. Build once; promote the **same artifact** through environments.
4. Test the deployed app in a pre-production environment.
5. Give humans a window to catch what tests miss, with a way to stop the release.
6. Verify Production after deploying.
7. Least-privilege credentials, separated per environment.

---

## Troubleshooting

| Symptom                                                           | Fix                                                                                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deploy Development:** `VERCEL_TOKEN is not set`                 | Setup step 4. The secret must be in the **development** environment (and **production** for Deploy Production), with that exact name.        |
| `VERCEL_ORG_ID` or `VERCEL_PROJECT_ID is not set`                 | Setup step 4: `VERCEL_ORG_ID` is a **repository variable**; `VERCEL_PROJECT_ID` is an **environment variable** in each environment.          |
| Vercel CLI: "The specified token is not valid" / 403              | Token expired, was revoked, or its scope is a different team than the projects. Create a new one (step 3) and update the secret.             |
| Vercel CLI: "Project not found"                                   | `VERCEL_PROJECT_ID` / `VERCEL_ORG_ID` don't match. Re-run `vercel link` (step 2) and copy the IDs again.                                     |
| **Wait for … to serve this release** times out                    | Check the Vercel project's **Settings → Deployment Protection** is **Standard Protection** (the default) and not "All Deployments".          |
| Wait for Production times out after you used Instant Rollback     | Vercel dashboard → `cicd-demo` → **Undo Rollback** on the Production Deployment tile, then re-run the job.                                   |
| Vercel deploys by itself on every push                            | The Git repo got connected to Vercel. Vercel → project → **Settings → Git** → **Disconnect**. (`vercel.json` also disables Git deployments.) |
| Badge says LOCAL on Vercel                                        | Your Vercel domain doesn't start with `cicd-demo-dev` / `cicd-demo`. Keep those project names, or adjust `src/environment.ts`.               |
| **Deploy Production:** "Branch ... is not allowed to deploy"      | The `production` environment only allows `main`. Run Promote from the `main` branch (the default in the Run workflow menu).                  |
| Promote/Abort: "No successful 'development' deployment found"     | Development has never deployed successfully yet. Let the Release Pipeline get past **Deploy Development** first.                             |
| Can't find `CI / All Checks Passed` in branch protection          | Open a PR first so the check runs once, then search again.                                                                                   |
| Promote Early: "has not finished its automated Development tests" | Wait until the pipeline reaches **Development Soak**.                                                                                        |
| Soak takes forever                                                | Set the repository variable `SOAK_MINUTES` to `5`.                                                                                           |
| `npm run test:e2e` locally: "Executable doesn't exist"            | Run `npx playwright install chromium` once.                                                                                                  |
| `npm run test:e2e` locally shows an old version                   | Run `npm run build` first: E2E tests the built `dist/` folder.                                                                               |
