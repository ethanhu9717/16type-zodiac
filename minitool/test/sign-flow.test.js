import assert from "node:assert/strict";
import { test } from "node:test";
import { signCollapsed, signReady } from "../src/ui/sign-flow.js";

function birthdayState(who) {
  if (who.month === "" || who.day === "") return { state: "empty" };
  if (who.month === "2" && who.day === "30") return { state: "invalid" };
  return { state: "ready" };
}

test("星座区未选择时保持展开，选择后折叠", () => {
  const who = { signInput: "pick", signKey: "", signEditing: false };
  assert.equal(signCollapsed(who, birthdayState), false);
  who.signKey = "处女";
  assert.equal(signCollapsed(who, birthdayState), true);
  assert.equal(signReady(who, birthdayState), true);
});

test("点击修改时重新展开，且不改变已选星座", () => {
  const who = { signInput: "pick", signKey: "处女", signEditing: false };
  who.signEditing = true;
  assert.equal(signCollapsed(who, birthdayState), false);
  assert.equal(who.signKey, "处女");
});

test("生日查询未填完或日期无效时不折叠", () => {
  const who = { signInput: "date", month: "", day: "", signKey: "", signEditing: false };
  assert.equal(signCollapsed(who, birthdayState), false);
  who.month = "9";
  assert.equal(signCollapsed(who, birthdayState), false);
  who.month = "2";
  who.day = "30";
  assert.equal(signCollapsed(who, birthdayState), false);
});

test("生日查询得到有效星座后折叠，修改时恢复展开", () => {
  const who = { signInput: "date", month: "9", day: "17", signKey: "", signEditing: false };
  assert.equal(signCollapsed(who, birthdayState), true);
  who.signEditing = true;
  assert.equal(signCollapsed(who, birthdayState), false);
  assert.equal(who.month, "9");
  assert.equal(who.day, "17");
});
