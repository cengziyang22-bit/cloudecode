# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes.
**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Chinese Chess 项目参考

## 棋盘坐标系统
- Row 0 = 黑方底线, Row 9 = 红方底线
- Row 7 = 红方炮, Row 6 = 红方兵
- Row 2 = 黑方炮, Row 3 = 黑方卒
- Col 0~8, 共9列, 10行
- PIECE 类型: GENERAL=1, ADVISOR=2, ELEPHANT=3, HORSE=4, ROOK=5, CANNON=6, PAWN=7
- RED=1, BLACK=2

## 模块结构 (`www/js/`)
| 文件 | 职责 |
|------|------|
| `board.js` | 棋盘状态、FEN、走法生成 |
| `game.js` | 主游戏逻辑 + 赛后统计 |
| `ai.js` | Wukong AI 引擎（纯JS） |
| `analysis-engine.js` | Fairy-Stockfish WASM 封装，回退到 Wukong |
| `opening-book.js` | 开局识别（坐标模式匹配，~18种开局） |
| `sound.js` | 音效播放 + edge-tts 语音 |
| `webrtc.js` | WebRTC 近场对战 |
| `share.js` | 分享功能 |

## 关键架构决策
- **B线 = 近场对战 (WebRTC)**, 不经过 TURN 服务器
- **WebRTC 连接**: `disconnected` 是抖动，`DataChannel` 状态才是连接依据
- **SDP 压缩**: gzip 压缩后体积缩小 60-70%

## 已知坑
- **Android WebView SharedArrayBuffer**: 必须用 `http://localhost` scheme（Capacitor `androidScheme: "http"`），`file://` 下 Fairy-Stockfish WASM 无法使用 cross-origin isolation
- **Fairy-Stockfish 回退**: 如果 WASM 初始化失败或 UCI_Variant 不支持 xiangqi，自动回退到 Wukong JS 引擎

## 音效
- 语音使用 edge-tts `zh-CN-YunyangNeural`（微软中文男声）
- 目前 sounds/ 下仅有 `capture.mp3`、`check.mp3`、`checkmate.mp3`

## 构建 APK
```bash
cd android && npx cap sync android && .\gradlew assembleDebug
# 产物: android/app/build/outputs/apk/debug/app-debug.apk
```

## 开局检测逻辑
- 两层模式匹配：红方第一步确定开局家族 → 黑方应着确定完整开局名
- 多数开局在前 2-3 回合（红1 + 黑1~2）即可定型
- 完全基于坐标匹配，不依赖代数记谱法

## 已实现功能
- 人机对战（Wukong AI + Fairy-Stockfish 双引擎）
- 近场对战（WebRTC）
- 赛后分析（棋谱回顾、统计、开局识别）
- 走法朗读、音效
- 分享功能
