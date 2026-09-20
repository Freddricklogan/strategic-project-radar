# Case Study — Strategic Project Radar

**Repository:** [strategic-project-radar](https://github.com/Freddricklogan/strategic-project-radar) · **Live demo:** [freddricklogan.github.io/strategic-project-radar](https://freddricklogan.github.io/strategic-project-radar/) · **Author:** Freddrick Logan

---

## 1. Who has this problem

Anyone on a steering committee asked to accept a status colour: a chief information officer with six concurrent projects, a dean whose programme depends on an IT delivery, a public-agency executive sponsoring a system replacement — and the project managers reporting to them, who know the honest numbers and have no shared way to show them. I have sat on both sides, most recently sponsoring credentialing and analytics projects that depended on other people's schedules.

## 2. The problem, as a scenario

A university's learning-management-system migration is reported amber at week 24 of 40. The slide says 45% complete; the plan said 60%. Nobody converts that into a schedule performance index of 0.75, the six weeks already lost, or a finish around week 48 — after the term it was meant to support. The finish date on the slide is still week 40. Asked for a confidence level, the manager offers "reasonably confident". The committee approves the next tranche on that basis and discovers the real date the week the term starts.

## 3. What it costs to leave it alone

A term of students on the old platform, a vendor contract lapsing at the wrong moment, budget spent on an impossible plan. I will not put a figure on it; it varies with the project and the sample is illustrative. The pattern is what costs: status that cannot be checked is status that is negotiated, and a finish date reported as one number is a promise with no confidence attached. A committee that accepts both cannot act until the slip is visible to everyone — the most expensive moment to find out.

## 4. The approach, and the alternative I rejected

I built a portfolio console that computes earned value from four inputs per project — budget, planned and actual percent complete, actual cost — and prints the formula beside every result: cost and schedule performance indices, estimate and variance at completion, the efficiency needed to finish on budget. Health is banded at stated thresholds. For the selected project a seeded Monte Carlo draws remaining duration from the manager's own three-point estimate, stretched by observed schedule performance, and reports a P10/P50/P90 finish, the probability of the planned date, and the contingency for 80% confidence. The portfolio rolls up on totals, not averages.

The alternative I rejected was a status board with RAG colours and a comment field — the tool most organisations already have. It records what the project manager is willing to say. Computing the indices from inputs the manager must supply, and showing the formula, moves the conversation from "is amber fair?" to "is 45% right?" — a question with an answer.

## 5. What the code does today

Real: the earned-value formulas, health banding, the portfolio roll-up on totals, expected overspend, strategic weighting, the triangular Monte Carlo with SPI adjustment, percentiles and on-plan probability, and CSV import and export with validation. All of it is strict-mode TypeScript with unit tests, separated from a rendering layer that builds the page through `textContent` only.

Simulated: the portfolio. The six projects, budgets, progress and estimates are an illustrative sample of a university IT office; the page says so.

Worth knowing: earned value assumes progress can be measured as a percentage of budget, a discipline in itself, and the estimate-at-completion formula assumes current cost performance continues — one convention among several. The schedule model stretches remaining estimates by SPI, capped between 0.5 and 1.5, behind a checkbox so its effect is visible. A stated method with a stated assumption is the point.

## 6. Evidence

Measured in continuous integration and a headless-browser smoke test of the built site: 18 unit tests passing across four files, 100% statement coverage over the pure modules, type-checked ESLint and `tsc --noEmit` clean, HTML validation clean, CodeQL and dependency scanning enabled. The tests pin a textbook case — CPI and SPI 0.8, estimate at completion $125,000, to-complete index 1.2 — and check the triangular sampler's bounds and mean over 20,000 draws. In the browser: zero console errors; the sample reports portfolio CPI 0.90 and SPI 0.89, three projects red, $323,444 expected overspend; the LMS migration finishes at week 46.0/51.0/58.2 (P10/P50/P90, seed 42) with a 0.0% chance of the planned week 40 and 15.8 weeks of contingency for 80% confidence; the tour's fourth step moves it to 58% complete and the red count falls to two. No horizontal scroll at 400 pixels.

## 7. What it would take to run this in production

For one committee the static page is enough: enter the numbers before the meeting. As a portfolio-office tool it would need inputs from where they live — percent complete from the project tool, actual cost from finance — on a schedule, with history so indices become trends; sign-in and per-project permissions; and an export into the report the committee already reads. That is a small authenticated service with two integrations; the judgement — formulas, bands, simulation — is done and tested. Rough effort: a few weeks, mostly the finance integration.

## 8. Limits and next steps

Single status date, no history; percent complete taken as given rather than derived from milestones; no dependencies between projects; no resource model. Next: a monthly snapshot so CPI and SPI trend; milestone-weighted percent complete; alternative EAC formulas side by side; a portfolio-level schedule simulation that respects dependencies.

## 9. Who should look at this

**Hiring manager:** evidence that I implement a management method as tested arithmetic and show its assumptions rather than a colour.
**Consulting client:** a way to run your next steering meeting on numbers the committee can check — bring your projects as CSV.
**Engineer:** read `src/evm.ts` and `src/schedule.ts` for the formulas and the sampler; `tests/evm.test.ts` holds the textbook case they are pinned to.
