# 16 型人格 × 星座 · 温柔解读

输入生日和 16 型人格类型，生成一份温柔治愈的「类型 × 星座」组合报告和一张小红书竖版分享图；也可以输入两个人，看双人配对。

这是快速验证版：网页工具、简体中文、不做账号和付费。思路参考 [jiaotuke/ziping-shushu](https://github.com/jiaotuke/ziping-shushu)：**代码算确定的东西，资料库给依据，大模型只负责把依据写成好读的报告。**

## 功能

- **我的解读**：选生日 → 自动算出太阳星座；选 16 型人格类型，不知道的可以做 32 题快测；生成六块报告（组合标签、性格核心、优势与盲点、恋爱与人际、工作与学习、最合拍的组合）和一句「写给你」。
- **双人配对**：两个人的生日和类型 → 配对标题、默契指数（66–98，只是好玩的参考）、相处亮点、可能的小摩擦和建议、适合的相处方式。
- **问问 AI**：看完报告后可以向 AI 提问，点推荐问题或自己输入，AI 结合你的组合（或你们俩的组合）回答。每位访客每次最多问 3 个，可以在 Secrets 里用 `ASK_LIMIT` 调整。推荐问题的回答所有访客共用；自己输入的问题不缓存、不保存。
- **分享图**：1080×1440（3:4），单人和双人各一版，手机上长按即可保存。
- **浅色 / 深色主题**：默认跟随访客手机或电脑的设置，也可以点右上角 ⋮ 手动切换，切换时报告不会丢。两套颜色在 `.streamlit/config.toml`，报告卡片的颜色在 `app.py` 的 `CSS`。分享图固定是浅色。
- **没有 AI Key 也能用**：没配置或调用失败时，用资料库拼出模板报告，网站总能出结果。

## 怎么算的

```
生日 ──► 太阳星座（lunar-python）
                     ╲
类型（直接选 / 32 题快测）──► 组合规则 ──► 资料包 ──► DeepSeek 润色 ──► 报告 + 分享图
                     ╱          （data/rules.json）            ╲
            资料库（data/types.json、signs.json）               └─ 失败时用模板报告
```

- **组合规则**：把 16 型人格的四个维度和星座对照——E/I 对元素的外放（火、风）或内收（土、水），S/N 对土象的务实或火风的想象，T/F 对风土的理性或水火的感受，J/P 对本位、固定、变动三种模式。每个维度得出一条「印证」或「张力」，192 种组合都有具体依据。
- **双人配对**：类型看 N/S 是否相同、E/I 和 J/P 是否互补；星座看元素是同元素、相生（火风、土水）还是需要磨合，以及模式是否相同。
- **缓存**：同一个组合的 AI 报告会在服务器上缓存，所有访客共用，费用有上限。「问问 AI」每问一次就调用一次接口，所以限制了次数。

## 目录

```
app.py                  Streamlit 网页入口
core/
  astro.py              生日 → 太阳星座，交界日提示
  combo.py              单人「类型 × 星座」资料包和印证 / 张力规则
  pairing.py            双人配对分数、最合拍组合
  quiz.py               32 题快测计分
  llm.py                调用 DeepSeek（OpenAI 兼容接口）
  report.py             提示词、模板报告、AI 输出校验
  ask.py                「问问 AI」的提示词和回答校验
  card.py               Pillow 生成分享图
data/
  types.json            16 型人格资料（原创）
  signs.json            12 星座资料（原创）
  rules.json            组合和配对规则（原创）
  oejts_zh.json         32 题快测题目（CC BY-NC-SA 4.0，见 data/README.md）
tests/                  自动测试
```

## 本地运行

需要 Python 3.10 及以上。

```bash
pip install -r requirements-dev.txt
streamlit run app.py        # 打开 http://localhost:8501
pytest                      # 跑测试
```

想在本地试 AI 报告：把 `.streamlit/secrets.toml.example` 复制成 `.streamlit/secrets.toml`，填上 `DEEPSEEK_API_KEY`。这个文件已经在 `.gitignore` 里，不会被提交。

分享图需要中文字体：Linux 装 `fonts-noto-cjk`（或文泉驿），macOS 和 Windows 会自动用系统自带的苹方、雅黑。也可以把任意中文字体文件放进 `fonts/` 目录。

## 免费部署到 Streamlit Community Cloud

1. 打开 <https://share.streamlit.io>，用 GitHub 账号登录，允许它读取这个仓库（私有仓库也可以）。
2. 点 **Create app** → **Deploy a public app from GitHub**：
   - Repository：`ethanhu9717/16type-zodiac`
   - Branch：`main`
   - Main file path：`app.py`
   - App URL：可以自定义，比如 `16type-zodiac`
3. 点 **Advanced settings**：Python 选 3.12；在 **Secrets** 里粘贴：
   ```toml
   DEEPSEEK_API_KEY = "你的 DeepSeek Key"
   SITE_URL = "16type-zodiac.streamlit.app"
   ```
4. 点 **Deploy**，几分钟后就有一个公开链接。以后往 `main` 推代码会自动更新。

DeepSeek Key 在 <https://platform.deepseek.com> 申请，按量付费、需要先充值。默认模型是 `deepseek-flash`，想换成更强的 `deepseek-v4-pro` 可以在 Secrets 里加 `LLM_MODEL`。2026-11-07 实测：一份个人报告约 3 秒、约 2000 个 token（输入约 1300、输出约 600），费用按官网价格换算；同一组合有缓存，不会重复扣费。不填 Key 网站也能正常用，只是报告由模板生成。

`packages.txt` 让 Streamlit Cloud 自动安装中文字体，分享图不会出现方块字。

> 国内访问 `*.streamlit.app` 可能不稳定，上线后建议用手机流量和 Wi-Fi 各试一次。如果不稳，再考虑换国内服务器。

## 修改文案

所有文字都在 `data/` 下的 JSON 文件里，直接改就行，不用动代码。改完跑一下 `pytest`，测试会检查 16 种类型、12 个星座和 192 种组合是否都完整。

## 注意事项

- 产品名用「16 型人格」，不直接用「MBTI」（MBTI 是注册商标）。
- 报告和分享图都标注「由 AI 生成，仅供娱乐」。
- 生日只用来计算星座，不保存；网站不收集能识别个人的信息。
- 32 题快测的题目是 CC BY-NC-SA 4.0（不可商用）。以后要收费的话，需要换成自己写的题目。
