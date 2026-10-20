---
description: Vytvorí detailný implementačný plán do .planning/.
argument-hint: [task-description]
---

Použi task-planner subagenta na vytvorenie kompletného implementačného plánu pre:

$ARGUMENTS

Agent:
1. Preskúma existujúci codebase (AGENTS.md, README, package.json, relevantné súbory)
2. Analyzuje požiadavku a rozdelí ju na zrozumiteľné časti
3. Navrhne presné zmeny (nové súbory, modifikácie, DB schema, API, UI, i18n, auth, payments)
4. Vytvorí sekvenčný implementačný workflow s krokami a effort estimate
5. Identifikuje riziká, rollback plán, dependencie a testovací plán
6. Zapíše všetko do `.planning/YYYY-MM-DD--[nazov-tasku].md`

Vráť názov vytvoreného plánu a stručný súhrn.
