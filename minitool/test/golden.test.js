import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { cuspNote, dateFromParts, makeBirthday, sunSignKey } from "../src/engine/astro.js";
import { SIGN_KEYS, TYPE_CODES } from "../src/engine/knowledge.js";
import { displayScore, person, rankedCandidates, rawScore } from "../src/engine/pairing.js";
import { REPORT_DISCLAIMER, generatePair, generateSingle } from "../src/engine/report.js";

const fixtures = new URL("./fixtures/", import.meta.url);

function load(name) {
  return JSON.parse(readFileSync(new URL(name, fixtures), "utf8"));
}

function personAt(typeIndex, signIndex) {
  return person(TYPE_CODES[typeIndex], SIGN_KEYS[signIndex]);
}

test("192 single reports and match order match Python", () => {
  const rows = load("singles.json");
  assert.equal(rows.length, 192);
  for (const row of rows) {
    const who = personAt(row.type_index, row.sign_index);
    assert.deepEqual(generateSingle(who.typeCode, who.signKey), row.report);
    const ranked = rankedCandidates(who);
    for (let i = 0; i < row.match_order.length; i += 1) {
      const expected = row.match_order[i];
      const found = ranked.find(function (item) {
        return item.ti === expected.type_index && item.si === expected.sign_index;
      });
      assert.equal(found.raw, expected.raw);
      assert.equal(found.other.typeCode, TYPE_CODES[expected.type_index]);
    }
    const picks = [];
    for (const item of ranked) {
      if (picks.some(function (picked) {
        return picked.ti === item.ti || picked.si === item.si;
      })) continue;
      picks.push(item);
      if (picks.length === 3) break;
    }
    assert.deepEqual(picks.map(function (item) {
      return { type_index: item.ti, sign_index: item.si, raw: item.raw };
    }), row.match_order);
  }
});

test("all 36864 ordered pair scores match Python and stay symmetric", () => {
  const table = load("pair_scores.json");
  assert.equal(table.raw.length, 36864);
  assert.equal(table.display.length, 36864);
  for (let ia = 0; ia < 192; ia += 1) {
    for (let ib = 0; ib < 192; ib += 1) {
      const index = ia * 192 + ib;
      const a = personAt(Math.floor(ia / 12), ia % 12);
      const b = personAt(Math.floor(ib / 12), ib % 12);
      const raw = rawScore(a, b);
      const display = displayScore(raw);
      assert.equal(raw, table.raw[index]);
      assert.equal(display, table.display[index]);
      assert.equal(generatePair(a, b).score, display);
      const mirror = ib * 192 + ia;
      assert.equal(table.raw[index], table.raw[mirror]);
      assert.equal(table.display[index], table.display[mirror]);
    }
  }
});

test("tied raw scores keep Python type-then-sign order", () => {
  const ties = load("ties.json");
  const me = personAt(ties.sample.me[0], ties.sample.me[1]);
  const ranked = rankedCandidates(me).map(function (item) {
    return [item.ti, item.si, item.raw];
  });
  assert.deepEqual(ranked, ties.sample.ranked);
  const tie = ties.adjacent_tie;
  assert.equal(tie.left[2], tie.right[2]);
  assert.ok(tie.left[0] < tie.right[0] || (tie.left[0] === tie.right[0] && tie.left[1] < tie.right[1]));
  const leftAt = ranked.findIndex(function (item) {
    return item[0] === tie.left[0] && item[1] === tie.left[1];
  });
  const rightAt = ranked.findIndex(function (item) {
    return item[0] === tie.right[0] && item[1] === tie.right[1];
  });
  assert.ok(leftAt !== -1 && leftAt < rightAt);
});

test("pair copy follows input order while scores stay symmetric", () => {
  const cases = load("copy_order.json");
  let swappedDate = 0;
  let selfCount = 0;
  for (const row of cases) {
    const a = personAt(row.a[0], row.a[1]);
    const b = personAt(row.b[0], row.b[1]);
    const forward = generatePair(a, b);
    const reverse = generatePair(b, a);
    assert.deepEqual(forward, row.forward);
    assert.deepEqual(reverse, row.reverse);
    assert.equal(forward.score, reverse.score);
    assert.equal(forward.element_pair, reverse.element_pair);
    assert.deepEqual(forward.highlights, reverse.highlights);
    assert.deepEqual(forward.frictions, reverse.frictions);
    assert.equal(forward.a.label, reverse.b.label);
    assert.equal(forward.b.label, reverse.a.label);
    if (forward.date_idea !== reverse.date_idea) swappedDate += 1;
    if (row.branch.self) {
      selfCount += 1;
      assert.deepEqual(forward, reverse);
      assert.ok(forward.frictions.length >= 1);
    }
  }
  assert.ok(swappedDate > 0);
  assert.equal(selfCount, 1);
});

test("sun sign boundaries, cusp notes, and birthday checks match Python", () => {
  const astro = load("astro.json");
  for (const [year, signs] of Object.entries(astro.years)) {
    signs.forEach(function (sign, index) {
      const date = new Date(Date.UTC(Number(year), 0, 1 + index));
      assert.equal(sunSignKey(date), sign);
    });
  }
  for (const row of astro.cusp) {
    const [year, month, day] = row.date.split("-").map(Number);
    assert.equal(cuspNote(dateFromParts(year, month, day)), row.note);
  }
  const today = dateFromParts(2026, 11, 7);
  for (const row of astro.birthdays) {
    const result = makeBirthday(row.year, row.month, row.day, today);
    const iso = result.date ? result.date.toISOString().slice(0, 10) : null;
    assert.equal(iso, row.date);
    assert.equal(result.message, row.message);
  }
});

test("template reports are marked as reference material, not model output", () => {
  const report = generateSingle("INFP", "双鱼");
  assert.equal(report.source, "template");
  assert.equal(REPORT_DISCLAIMER, "根据资料库生成，仅供娱乐参考。");
  assert.equal(REPORT_DISCLAIMER.includes("AI"), false);
});
