# Lab 2 AI Use Log

**LLM/agent used:** Claude (Anthropic), used throughout the sprint as the AI coding agent and
AI specification agent, in both roles allowed by the handout (Section 11).

## 1. Key Prompts

| # | Prompt (paraphrased) | Purpose |
|---|---|---|
| 1 | "Ok du coup c'est quoi ce projet, personne ne m'a expliqué, aide-moi à comprendre le Lab 2 handout" | Understanding the sprint scope and goals before any implementation |
| 2 | "Écris specification.md, api-spec.md, ui-spec.md et tests.md pour moi en te basant sur le handout" | Spec-Driven Development: producing the four required engineering-contract documents before coding |
| 3 | "Découpe le sprint en GitHub Issues et crée le Kanban" | Translating the specification into a workable, traceable task breakdown |
| 4 | "Donne-moi le schema.prisma complet pour le modèle DevRequester, sans casser ce qui existe déjà" | Implementing the Development Requester context (Issue 5) — schema, seed, endpoint, selector screen |
| 5 | "Donne-moi le endpoint POST /api/tickets avec toute la validation (summary, description, category, requester actif)" | Implementing Ticket creation (Issue 8) with backend validation matching the business rules |
| 6 | "Fais-moi l'écran My Tickets avec recherche, filtres, tri et pagination" | Implementing the My Tickets list (Issue 9) end-to-end (API + UI) |
| 7 | "Le test échoue avec 'Found multiple elements with text Create Ticket', corrige ça" | Debugging recurring UI test ambiguity issues (multiple buttons sharing the same accessible name) |
| 8 | "Le test récupère 400 au lieu de 200/404, mais tout seul il passe — pourquoi ?" | Diagnosing a test-isolation/parallelism issue between API test files sharing a database |
| 9 | "J'ai deux PR qui ont des conflits parce qu'une autre a été mergée entre-temps, aide-moi à résoudre ça" | Resolving Git merge conflicts caused by parallel feature branches created before earlier PRs were merged |
| 10 | "Automatise la capture des 21 screenshots requis avec Playwright" | Generating the responsive/visual evidence required by the handout (Issue 7) without manual screenshotting |

## 2. My Reflection

**What worked well.** Front-loading all four engineering-contract documents (specification,
API spec, UI spec, test plan) before writing any code turned out to be genuinely useful, not
just a box-ticking exercise. Having `api-spec.md` written down meant that when Simeon asked in
a PR comment whether `requesterId` was validated server-side or just trusted from the header, I
could answer confidently instead of guessing — the rule was already written down as BR-04. The
AI was also very effective at producing complete, ready-to-paste files rather than diffs, which
mattered a lot given how often small copy-paste mistakes (missing a line, pasting into the wrong
file) caused problems later. Automating the 21 responsive screenshots with a single Playwright
script instead of manually resizing a browser window and taking screenshots one by one probably
saved the most time of anything in this sprint.

**What was difficult or frustrating.** The single biggest recurring problem this sprint was not
technical — it was git branch management. Because I kept working on new feature branches before
Simeon had reviewed and merged the previous ones, I ended up duplicating a lot of code (the
DevRequester, RelatedSystem, and Ticket models, plus the Create Ticket and My Tickets screens)
across several branches just so I wouldn't be blocked waiting for review. This eventually caused
real merge conflicts once Simeon started merging PRs out of order, and one whole PR (#29,
already Approved) had to be closed without merging because its content turned out to be
redundant with another PR that got merged first. Nothing was lost, but it wasted time and made
the PR history harder to follow than it should have been. On the technical side, the most
time-consuming class of bug was UI test ambiguity — tests failing because `getByText("Create
Ticket")` matched more than one button on the page (the nav bar, the header button, the
empty-state button), which happened three separate times across different components. I also
hit a confusing intermittent test failure where `ticket-detail.api.test.ts` failed when run
together with `my-tickets.api.test.ts` but passed 100% of the time in isolation — turned out to
be a transient Prisma client regeneration issue, not a real bug, but it took a few steps to rule
that out rather than just assume the code was wrong.

**What I learned about working with an AI agent on a real project.** The AI is very good at
producing correct, complete code quickly, but it cannot see my actual file system, my actual
Git state, or what's really running in my terminal — so a lot of the friction in this sprint
came from me and the AI having slightly different assumptions about what already existed on a
given branch (especially after multi-day gaps between sessions). The fix that worked best was
always the same: before asking for new code, run `git status`, `cat` the relevant file, or `ls`
the folder, and paste the real output back rather than assuming. Once I started doing that
consistently, mistakes dropped a lot. I also learned that resolving a messy merge conflict is
often not worth doing by hand — in this sprint, closing a redundant PR or merging the
already-correct branch into my working branch was faster and safer than trying to reconcile
divergent files line by line. Overall, the AI was most valuable as a fast, literal executor of
decisions I still had to make myself (which fields are required, what the Ticket Number format
should be, how ownership should be enforced) — it did not replace the engineering judgment part
of Spec-Driven Development, it just made writing everything down and then implementing it much
faster.