# Decision Cockpit

Version: 1.2  
Status: Home — Требуют решения  
Path: `docs/architecture/decision-cockpit.md`

---

## Purpose

The home screen answers: **which questions require a decision now?**

Heading: **Требуют решения**. It is not a portfolio register. Default `under_analysis` is not primary attention.

Top navigation: logo → home; **Решения**; one primary CTA **Новая ситуация**. No duplicate create/analyze actions.

---

## Primary list

At most **three** cases. Traffic-light signal (dot + restrained accent + Срочно/Скоро label) uses existing priority colors. Determining Fact is the focus question.

A case is a now-candidate only if it is not closed and not ordinary waiting/execution, and one of:

1. `waiting_for_principal`
2. existing priority is attention-now (`urgent` or `high_irreversible`)
3. visible lifecycle suggestion requiring human approval
4. execution review requiring human approval
5. `new` / `under_analysis` with a meaningful unresolved Determining Fact **and** soon/urgent priority

Closed, including a visible reopen suggestion, never enters the primary list.

---

## В работе

Compact secondary counts, always visible:

`Ожидают · Исполняются · Мониторинг · Другие открытые`

Visually weaker: `Архив`.

Operational groups unchanged: waiting / executing / monitoring / other / closed. A case in the primary list is omitted from these counts.

Home summary cells navigate to the existing Решения page (`/cases?view=…`). The home URL stays `/`. Case lists never expand on the home page.
