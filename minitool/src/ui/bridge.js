export const SAVE_IMAGE_MIN = 9420;
export const WINDOW_INFO_MIN = 9490;
export const SHARE_MIN = 9530;

export const OPENED_NOTE = "已打开发布页，笔记是否发出以小红书页面为准。";
export const OPENED_SHARE = "已打开分享";
export const SAVED_IMAGE = "已保存到相册";
export const HALF_SHARE = "当前是半屏或分享面板不可用，可以改用发笔记或存相册。";

export function readBuildVersion(launchOptions) {
  const miniToolEnv = launchOptions && launchOptions.miniToolEnv;
  const value = Number(miniToolEnv && miniToolEnv.buildVersion);
  return value || 0;
}

export function getClientVersion(buildVersion) {
  return Math.floor((Number(buildVersion) || 0) / 1000);
}

export function isClientVersionAtLeast(buildVersion, minimumClientVersion) {
  if (!buildVersion) return false;
  return getClientVersion(buildVersion) >= minimumClientVersion;
}

export async function getBuildVersion(xhs) {
  const syncBuildVersion = readBuildVersion(xhs && xhs.launchOptions);
  if (syncBuildVersion) return syncBuildVersion;
  const miniTool = xhs && xhs.miniTool;
  if (!miniTool || typeof miniTool.getLaunchOptions !== "function") return 0;
  try {
    const launchOptions = await miniTool.getLaunchOptions();
    return readBuildVersion(launchOptions);
  } catch (error) {
    return 0;
  }
}

export function isShortLayout(info) {
  if (!info || !info.windowHeight || !info.screenHeight) return false;
  return info.windowHeight < info.screenHeight * 0.85;
}

export function insetTop(info) {
  if (!info) return 0;
  let top = 0;
  if (info.safeArea && typeof info.safeArea.top === "number") top = info.safeArea.top;
  const buttons = info.menuButtons || {};
  const names = ["back", "me", "share"];
  for (let i = 0; i < names.length; i += 1) {
    const button = buttons[names[i]];
    if (button && typeof button.bottom === "number") top = Math.max(top, button.bottom);
  }
  return top;
}

export function safeAreaBottomInset(info) {
  const area = info && info.safeArea;
  if (!area || typeof area.bottom !== "number" || typeof info.windowHeight !== "number") return 0;
  return Math.max(0, info.windowHeight - area.bottom);
}

export async function readWindow(xhs, buildVersion) {
  if (!isClientVersionAtLeast(buildVersion, WINDOW_INFO_MIN)) return null;
  const miniTool = xhs && xhs.miniTool;
  if (!miniTool || typeof miniTool.getWindowInfo !== "function") return null;
  try {
    return await miniTool.getWindowInfo();
  } catch (error) {
    return null;
  }
}

async function writeTempWithRetry(miniTool, render) {
  if (!miniTool || typeof miniTool.writeTempFile !== "function") {
    return { filePath: "", message: "当前环境不能准备图片。" };
  }
  const attempts = [
    { mime: "image/png", quality: 0.92, scale: 1 },
    { mime: "image/jpeg", quality: 0.8, scale: 0.75 },
  ];
  for (let i = 0; i < attempts.length; i += 1) {
    let data = "";
    try {
      data = render(attempts[i]);
    } catch (error) {
      continue;
    }
    if (typeof data !== "string" || data.indexOf("data:image/") !== 0) continue;
    try {
      const result = await miniTool.writeTempFile({ data });
      if (result && typeof result.filePath === "string" && result.filePath) {
        return { filePath: result.filePath, message: "" };
      }
    } catch (error) {
      continue;
    }
  }
  return { filePath: "", message: "图片没有准备好，请再试一次。" };
}

export async function publishNote(xhs, note, render) {
  const miniTool = xhs && xhs.miniTool;
  if (!miniTool || typeof miniTool.postNote !== "function") {
    return { state: "unavailable", message: "请在小红书 App 内发布笔记。" };
  }
  const file = await writeTempWithRetry(miniTool, render);
  if (!file.filePath) return { state: "failed", message: file.message };
  try {
    await miniTool.postNote({
      title: note.title,
      content: note.content,
      pageType: "photo_publish",
      mediaInfo: { image_resources: [{ url: file.filePath }] },
    });
    return { state: "opened", message: OPENED_NOTE };
  } catch (error) {
    return { state: "failed", message: "发布页没有打开，可以再试一次。" };
  }
}

export async function saveImage(xhs, buildVersion, render) {
  const miniTool = xhs && xhs.miniTool;
  if (!isClientVersionAtLeast(buildVersion, SAVE_IMAGE_MIN) || !miniTool || typeof miniTool.saveImageToPhotosAlbum !== "function") {
    return { state: "unavailable", message: "当前客户端还不能保存到相册。" };
  }
  const file = await writeTempWithRetry(miniTool, render);
  if (!file.filePath) return { state: "failed", message: file.message };
  try {
    await miniTool.saveImageToPhotosAlbum({ filePath: file.filePath });
    return { state: "saved", message: SAVED_IMAGE };
  } catch (error) {
    const reason = error && error.errMsg ? "没有保存到相册。" : "没有保存到相册。";
    return { state: "failed", message: reason };
  }
}

function shareFailure(error) {
  const code = String(error && error.errCode != null ? error.errCode : "");
  if (code === "15502") return { state: "half", message: HALF_SHARE };
  if (code === "15501") return { state: "failed", message: "这张图片没有通过校验，请再试一次。" };
  if (code === "15503") return { state: "failed", message: "今天的分享次数已用完，可以改用发笔记或存相册。" };
  if (code === "10001") return { state: "failed", message: "分享参数有误，请改用发笔记。" };
  return { state: "failed", message: "分享没有打开，可以改用发笔记或存相册。" };
}

export async function shareImage(xhs, buildVersion, render) {
  const miniTool = xhs && xhs.miniTool;
  if (!isClientVersionAtLeast(buildVersion, SHARE_MIN) || !miniTool || typeof miniTool.share !== "function") {
    return { state: "unavailable", message: "分享需要较新的小红书客户端，可以改用发笔记或存相册。" };
  }
  const file = await writeTempWithRetry(miniTool, render);
  if (!file.filePath) return { state: "failed", message: file.message };
  try {
    await miniTool.share({ type: "image", image_resource: file.filePath });
    return { state: "opened", message: OPENED_SHARE };
  } catch (error) {
    return shareFailure(error);
  }
}
