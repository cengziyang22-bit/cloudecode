# 中国象棋 — 联机对战

两人通过房间号远程对弈，基于 WebSocket 实现实时通信。

## 架构

```
手机A (APK) ──→ natapp 隧道 ──→ 你的电脑 (server.js)
手机B (APK) ──→ natapp 隧道 ──→ 你的电脑 (server.js)
```

## 启动服务端

```bash
cd server
npm install
node server.js
# 服务端启动，监听端口 8080
```

## 内网穿透（natapp）

让外网设备能连到你的电脑：

1. 下载 [natapp](https://natapp.cn/)
2. 购买免费隧道（TCP 协议，远程端口随意，本地端口填 8080）
3. 运行：`natapp -authtoken=你的token`
4. 记住 natapp 分配的公网地址（类似 `server.natappfree.cc:12345`）

## 开始游戏

### 房主（红方）
1. 打开 App → 选择「联机对战」→ 开始游戏
2. 在服务器地址栏输入 natapp 地址（格式：`ws://server.natappfree.cc:12345`）
3. 点击「连接」→ 点击「创建房间」
4. 把房间号（6位字母数字）发给对手

### 对手（黑方）
1. 同样选择联机对战，输入相同的服务器地址并连接
2. 在房间号输入框中输入房主给的6位房间号
3. 点击「加入」

双方都进入房间后游戏自动开始，红方先手。

## 本地测试

两人在同一 WiFi 下可以直连：

1. 电脑启动 `node server.js`
2. 查看电脑 IP：`ipconfig`（Windows）
3. 手机输入 `ws://电脑IP:8080`

## 协议

```json
// 客户端 → 服务端
{"type":"create_room"}
{"type":"join_room", "roomId":"ABC123"}
{"type":"move", "move":{"fromR":0,"fromC":0,"toR":0,"toC":1}}
{"type":"resign"}

// 服务端 → 客户端
{"type":"room_created", "roomId":"ABC123", "color":"red"}
{"type":"game_start", "roomId":"ABC123", "color":"red"}
{"type":"move", "move":{...}}
{"type":"opponent_resigned"}
{"type":"opponent_disconnected"}
{"type":"error", "message":"错误信息"}
```
