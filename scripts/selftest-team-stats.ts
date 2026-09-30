/**
 * Self-test: team card logic (pure). Ranking per metric, stable ties, win rate,
 * team totals across currencies, initials and avatar color stability.
 * Run: npm run test:team-stats
 */

import assert from "node:assert/strict";
import type { TeamMemberStat } from "../src/entities/dashboard/model.ts";
import {
  DEFAULT_TEAM_METRIC,
  TEAM_METRICS,
  colorIndex,
  initials,
  metricValue,
  rankTeam,
  teamTotals,
  winRate,
} from "../src/entities/dashboard/lib/team.ts";

function member(p: Partial<TeamMemberStat> & { id: string; name: string }): TeamMemberStat {
  return {
    role: "employee",
    leadsHandled: 0,
    leadsWon: 0,
    openTasks: 0,
    overdueTasks: 0,
    collected: 0,
    currency: "SAR",
    unconverted: [],
    ...p,
  };
}

const aisha = member({ id: "a", name: "Aisha Khan", leadsHandled: 10, leadsWon: 4, openTasks: 3, overdueTasks: 0, collected: 500_000 });
const omar = member({ id: "o", name: "Omar Ali", leadsHandled: 6, leadsWon: 5, openTasks: 9, overdueTasks: 4, collected: 900_000 });
const zed = member({ id: "z", name: "Zed", leadsHandled: 6, leadsWon: 1, openTasks: 1, overdueTasks: 1 });
const team = [zed, aisha, omar];

// Metric order and default.
assert.deepEqual([...TEAM_METRICS], ["leads", "won", "collected", "openTasks", "overdue"]);
assert.equal(DEFAULT_TEAM_METRIC, "leads");
assert.equal(metricValue(omar, "collected"), 900_000);
assert.equal(metricValue(omar, "overdue"), 4);

// Ranking per metric, highest first; ties by leads, wins, then name.
const names = (metric: Parameters<typeof rankTeam>[1]) => rankTeam(team, metric).map((m) => m.id).join("");
assert.equal(names("leads"), "aoz");
assert.equal(names("won"), "oaz");
assert.equal(names("collected"), "oaz");
assert.equal(names("openTasks"), "oaz");
assert.equal(names("overdue"), "oza");
const tieA = member({ id: "t1", name: "Beta" });
const tieB = member({ id: "t2", name: "Alpha" });
assert.equal(rankTeam([tieA, tieB], "won").map((m) => m.name).join(","), "Alpha,Beta");
assert.equal(team[0], zed, "rankTeam must not mutate its input");

// Win rate: null without leads, rounded, capped at 100.
assert.equal(winRate(aisha), 40);
assert.equal(winRate(member({ id: "x", name: "x", leadsHandled: 3, leadsWon: 1 })), 33);
assert.equal(winRate(member({ id: "x", name: "x", leadsHandled: 2, leadsWon: 5 })), 100);
assert.equal(winRate(member({ id: "x", name: "x" })), null);

// Totals in one currency.
const sar = teamTotals(team);
assert.deepEqual(sar, { leads: 22, won: 10, openTasks: 13, overdue: 5, collected: 1_400_000, currency: "SAR", partial: false });

// Unconverted money marks the total partial.
assert.equal(teamTotals([aisha, member({ id: "e", name: "E", unconverted: ["EUR"] })]).partial, true);

// Mixed currencies (all-branches view): keep the largest, flag partial.
const mixed = teamTotals([
  member({ id: "u", name: "U", collected: 300_000, currency: "USD" }),
  member({ id: "s", name: "S", collected: 200_000, currency: "SAR" }),
  member({ id: "s2", name: "S2", collected: 200_000, currency: "SAR" }),
]);
assert.equal(mixed.currency, "SAR");
assert.equal(mixed.collected, 400_000);
assert.equal(mixed.partial, true);

// Nobody collected: currency still known when the API sent one.
assert.deepEqual(teamTotals([member({ id: "n", name: "N" })]).currency, "SAR");
assert.deepEqual(teamTotals([]), { leads: 0, won: 0, openTasks: 0, overdue: 0, collected: 0, currency: "", partial: false });

// Initials handle one word, many words, extra spaces, Arabic and empty names.
assert.equal(initials("Aisha Khan"), "AK");
assert.equal(initials("  omar   bin  ali "), "OA");
assert.equal(initials("Zed"), "Z");
assert.equal(initials("أحمد علي"), "أع");
assert.equal(initials(""), "?");

// Avatar color is stable and in range.
for (const id of ["a", "22222222-2222-2222-2222-222222222203", ""]) {
  const i = colorIndex(id, 7);
  assert.ok(i >= 0 && i < 7);
  assert.equal(colorIndex(id, 7), i);
}
assert.equal(colorIndex("a", 0), 0);

console.log("team stats self-test OK");
