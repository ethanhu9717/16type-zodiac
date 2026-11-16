import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HALF_SHARE,
  OPENED_NOTE,
  OPENED_SHARE,
  SAVED_IMAGE,
  getBuildVersion,
  getClientVersion,
  isClientVersionAtLeast,
  insetTop,
  isShortLayout,
  publishNote,
  safeAreaBottomInset,
  readBuildVersion,
  saveImage,
  shareImage,
} from "../src/ui/bridge.js";

function png() {
  return "data:image/png;base64,aaaa";
}

function render(options) {
  return options.mime === "image/jpeg" ? "data:image/jpeg;base64,bbbb" : png();
}

test("client version drops the build serial", () => {
  assert.equal(readBuildVersion({ miniToolEnv: { buildVersion: 9462004 } }), 9462004);
  assert.equal(getClientVersion(9462004), 9462);
  assert.equal(isClientVersionAtLeast(9462004, 9460), true);
  assert.equal(isClientVersionAtLeast(9420000, 9420), true);
  assert.equal(isClientVersionAtLeast(9419999, 9420), false);
  assert.equal(isClientVersionAtLeast(0, 9420), false);
  assert.equal(readBuildVersion(null), 0);
  assert.equal(isShortLayout({ windowHeight: 400, screenHeight: 800 }), true);
  assert.equal(isShortLayout({ windowHeight: 800, screenHeight: 800 }), false);
  assert.equal(isShortLayout(null), false);
  const info = {
    windowHeight: 700,
    screenHeight: 844,
    safeArea: { top: 20, bottom: 660 },
    menuButtons: { back: { bottom: 48 }, me: null, share: { bottom: 64 } },
  };
  assert.equal(insetTop(info), 64);
  assert.equal(safeAreaBottomInset(info), 40);
  assert.equal(safeAreaBottomInset({ screenHeight: 844, safeArea: { bottom: 660 } }), 0);
});

test("launch options fall back when the sync version is missing", async () => {
  const xhs = {
    miniTool: {
      getLaunchOptions: async function () {
        return { miniToolEnv: { buildVersion: "9530007" } };
      },
    },
  };
  assert.equal(await getBuildVersion(xhs), 9530007);
  assert.equal(await getBuildVersion({}), 0);
  assert.equal(await getBuildVersion({
    miniTool: {
      getLaunchOptions: async function () { throw new Error("nope"); },
    },
  }), 0);
});

test("postNote success only means the composer opened", async () => {
  let posted = null;
  const xhs = {
    miniTool: {
      writeTempFile: async function (options) {
        assert.match(options.data, /^data:image\/png/);
        return { filePath: "tmp/card.png" };
      },
      postNote: async function (options) {
        posted = options;
        return { errMsg: "postNote:ok" };
      },
    },
  };
  const result = await publishNote(xhs, { title: "标题", content: "正文" }, render);
  assert.equal(result.state, "opened");
  assert.equal(result.message, OPENED_NOTE);
  assert.equal(result.message.indexOf("发布成功"), -1);
  assert.equal(posted.mediaInfo.image_resources[0].url, "tmp/card.png");
  assert.equal(posted.pageType, "photo_publish");
  assert.equal("tags" in posted, false);
  const missing = await publishNote({}, { title: "标题", content: "正文" }, render);
  assert.equal(missing.state, "unavailable");
});

test("large canvas falls back once when the temp file fails", async () => {
  let calls = 0;
  const xhs = {
    launchOptions: { miniToolEnv: { buildVersion: 9532001 } },
    miniTool: {
      writeTempFile: async function (options) {
        calls += 1;
        if (calls === 1) throw new Error("too big");
        assert.match(options.data, /^data:image\/jpeg/);
        return { filePath: "tmp/card.jpg" };
      },
      saveImageToPhotosAlbum: async function (options) {
        assert.equal(options.filePath, "tmp/card.jpg");
        return { errMsg: "saveImageToPhotosAlbum:ok" };
      },
    },
  };
  const result = await saveImage(xhs, 9532001, render);
  assert.equal(result.message, SAVED_IMAGE);
  assert.equal(calls, 2);
  const denied = await saveImage({
    miniTool: {
      writeTempFile: async function () { return { filePath: "tmp/card.png" }; },
      saveImageToPhotosAlbum: async function () {
        const error = new Error("denied");
        error.errMsg = "saveImageToPhotosAlbum:fail auth";
        throw error;
      },
    },
  }, 9532001, render);
  assert.equal(denied.state, "failed");
  assert.equal(denied.message.indexOf("已保存"), -1);
  const old = await saveImage(xhs, 0, render);
  assert.equal(old.state, "unavailable");
});

test("share reports half-screen and quota failures without claiming delivery", async () => {
  function client(fail) {
    return {
      miniTool: {
        writeTempFile: async function () { return { filePath: "tmp/card.png" }; },
        share: async function (options) {
          assert.equal(options.type, "image");
          assert.equal(options.image_resource, "tmp/card.png");
          if (fail) throw fail;
          return { errMsg: "share:ok" };
        },
      },
    };
  }
  const ok = await shareImage(client(null), 9530001, render);
  assert.equal(ok.message, OPENED_SHARE);
  assert.equal(ok.message.indexOf("收到"), -1);
  const half = await shareImage(client({ errCode: 15502, errMsg: "share:fail" }), 9530001, render);
  assert.equal(half.state, "half");
  assert.equal(half.message, HALF_SHARE);
  const quota = await shareImage(client({ errCode: "15503" }), 9530001, render);
  assert.match(quota.message, /次数/);
  const bad = await shareImage(client({ errCode: 10001 }), 9530001, render);
  assert.match(bad.message, /参数/);
  const image = await shareImage(client({ errCode: 15501 }), 9530001, render);
  assert.match(image.message, /图片/);
  const low = await shareImage(client(null), 9490000, render);
  assert.equal(low.state, "unavailable");
});

test("both temp-file attempts failing does not claim a save or publish", async () => {
  const xhs = {
    miniTool: {
      writeTempFile: async function () { throw new Error("nope"); },
      postNote: async function () { throw new Error("should not post"); },
      saveImageToPhotosAlbum: async function () { throw new Error("should not save"); },
    },
  };
  const published = await publishNote(xhs, { title: "t", content: "c" }, render);
  const saved = await saveImage(xhs, 9530001, render);
  assert.equal(published.state, "failed");
  assert.equal(saved.state, "failed");
  assert.equal(published.message.indexOf("发布成功"), -1);
  assert.equal(saved.message.indexOf("已保存"), -1);
});
