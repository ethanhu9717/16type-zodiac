import assert from "node:assert/strict";
import { test } from "node:test";
import { typeCollapsed } from "../src/ui/type-flow.js";

test("未选择人格时展开，选中后折叠", () => {
  const who = { typeCode: "", typeEditing: false, choosing: false };
  assert.equal(typeCollapsed(who), false);
  who.typeCode = "INFP";
  assert.equal(typeCollapsed(who), true);
});

test("点击修改时重新展开，且不改变已选人格", () => {
  const who = { typeCode: "INFP", typeEditing: false, choosing: false };
  who.typeEditing = true;
  assert.equal(typeCollapsed(who), false);
  assert.equal(who.typeCode, "INFP");
});

test("向导进行中保持展开，完成后可折叠", () => {
  const who = { typeCode: "INFP", typeEditing: false, choosing: true };
  assert.equal(typeCollapsed(who), false);
  who.choosing = false;
  assert.equal(typeCollapsed(who), true);
});
