# 调试指南：auth=0 时高亮不显示问题

## 📋 问题描述
当 `sheet.config.auth === 0`（无权限模式）时，用户点击单元格后，其他用户看不到高亮显示。

## 🔧 已完成的修复

### 1. 添加用户身份信息到事件数据
**文件**: `src/example/index/AirSheet/index.vue`

修改了 `onAsyncEventCell` 函数，确保发送的事件数据包含用户身份信息：

```javascript
const onAsyncEventCell = (range) => {
    // ✅ 获取当前用户信息
    const tokenPayload = parseJwtToken(token)
    const currentUserId = tokenPayload?.sub || tokenPayload?.['ykz-id'] || null
    const currentUserName = tokenPayload?.name || '未知用户'
    
    const eventData = {
        sheetId: sheetId.value,
        row: range.r,
        col: range.c,
        rowEnd: range.rr,
        colEnd: range.cc,
        // ✅ 添加用户身份信息（用于高亮显示）
        operatorUserId: currentUserId,
        operatorName: currentUserName,
    }
    
    sheetRef.value.asyncEventCell(eventData)
}
```

### 2. 添加详细的调试日志
在以下位置添加了调试日志：

#### 发送端 (`src/example/index/AirSheet/index.vue`)
- `onAsyncEventCell` 函数中添加了用户信息提取和发送的日志

#### 接收端 (`src/hooks/sheet/hooks/useSynergyEvent.js`)
- `EventClicked` 事件处理器中添加了事件接收日志
- `groupUsers` 函数中添加了用户添加/更新日志

## 🔍 调试步骤

### 步骤 1：打开两个浏览器窗口
1. 打开第一个浏览器窗口（用户A）
2. 打开第二个浏览器窗口（用户B）
3. 两个窗口都打开开发者工具的控制台

### 步骤 2：检查发送端日志（用户A点击单元格）
在用户A的控制台中，应该看到：

```
🔍 [DEBUG] onAsyncEventCell 被调用 {r: 2, c: 0, rr: 2, cc: 0}
🔍 [DEBUG] tokenPayload: {sub: "xxx", name: "xxx", ...}
🔍 [DEBUG] 当前用户信息: {userId: "xxx", userName: "xxx"}
✅ [发送] 事件数据（包含用户信息）: {
    sheetId: "xxx",
    row: 2,
    col: 0,
    rowEnd: 2,
    colEnd: 0,
    operatorUserId: "xxx",
    operatorName: "xxx"
}
```

**检查点**：
- ✅ `operatorUserId` 和 `operatorName` 是否存在且有值？
- ✅ `row` 和 `col` 是否正确？

### 步骤 3：检查接收端日志（用户B的控制台）
在用户B的控制台中，应该看到：

```
🔍 [DEBUG] EventClicked 事件触发，res.sheetId: "xxx", sheet.original.sheetId: "xxx"
✅ [接收] EventCell 接收到事件（是当前 sheet）: {
    sheetId: "xxx",
    row: 2,
    col: 0,
    rowEnd: 2,
    colEnd: 0,
    operatorUserId: "xxx",
    operatorName: "xxx"
}
🔍 [DEBUG] 检查 row/col 信息: {hasRow: true, hasCol: true, row: 2, col: 0}
✅ [接收] EventCell 更新在线用户选区: {userId: "xxx", row: 2, col: 0, ...}
🔍 [DEBUG] groupUsers 被调用，原始 user 对象: {...}
🔍 [DEBUG] sheet.props.userKeys: ["operatorUserId", "operatorName"]
🔍 [DEBUG] 提取的 userId: "xxx"
✅ [接收] groupUsers 新增用户: {id: "xxx", name: "xxx", r: 2, c: 0, ...}
✅ [接收] 当前 online 数组: [{id: "xxx", name: "xxx", ...}]
```

**检查点**：
- ✅ `EventClicked` 事件是否被触发？
- ✅ `res.sheetId` 和 `sheet.original.sheetId` 是否相等？
- ✅ 是否跳过了事件（看到 "跳过：不是当前 sheet 的事件"）？
- ✅ `operatorUserId` 和 `operatorName` 是否正确传递？
- ✅ `groupUsers` 是否被调用？
- ✅ 用户是否被添加到 `sheet.config.online` 数组？

### 步骤 4：检查高亮渲染
在用户B的浏览器中，检查 DOM 元素：

1. 打开开发者工具的 Elements 面板
2. 搜索 `class="highlight"`
3. 应该能看到类似这样的元素：

```html
<div class="highlight" data-permission-type="cell" style="top: XXpx; left: XXpx; ...">
    <div class="label">用户名</div>
</div>
```

**检查点**：
- ✅ 是否存在 `.highlight` 元素？
- ✅ 样式是否正确（`top`, `left`, `width`, `height`）？
- ✅ 用户名是否显示？

## 🐛 可能的问题和解决方案

### 问题 1：`operatorUserId` 为 null
**症状**: 日志显示 `operatorUserId: null`

**原因**: JWT token 解析失败或 token 中没有 `sub` 或 `ykz-id` 字段

**解决方案**:
1. 检查 `token` 变量是否有值
2. 检查 JWT token 的 payload 结构
3. 确认 token 中包含用户ID字段

### 问题 2：`EventClicked` 事件未触发
**症状**: 用户B的控制台没有看到 `EventClicked` 相关日志

**原因**: SignalR 连接问题或事件未正确发送

**解决方案**:
1. 检查 SignalR 连接状态（`linked` 应该为 `true`）
2. 检查网络请求，确认 WebSocket 连接正常
3. 检查服务端是否正确广播事件

### 问题 3：事件被跳过（sheetId 不匹配）
**症状**: 看到日志 "⚠️ [WARNING] 跳过：不是当前 sheet 的事件"

**原因**: `res.sheetId` 和 `sheet.original.sheetId` 不相等

**解决方案**:
1. 检查两个客户端是否在同一个 sheet 上
2. 检查 `sheetId.value` 的值是否正确
3. 确认 `sheet.original.sheetId` 是否正确初始化

### 问题 4：`groupUsers` 未被调用
**症状**: 没有看到 `groupUsers` 相关日志

**原因**: `row` 或 `col` 信息缺失或无效

**解决方案**:
1. 检查 `res.row` 和 `res.col` 是否存在且 >= 0
2. 确认发送端正确设置了 `row` 和 `col` 字段

### 问题 5：用户未添加到 `online` 数组
**症状**: `groupUsers` 被调用但 `online` 数组为空

**原因**: `userId` 提取失败或 `userKeys` 配置错误

**解决方案**:
1. 检查 `sheet.props.userKeys` 的值（应该是 `["operatorUserId", "operatorName"]`）
2. 确认 `res[sheet.props.userKeys[0]]` 能正确提取到 `userId`
3. 检查 `sheet.config.online` 是否是响应式数组

### 问题 6：高亮元素不显示
**症状**: `online` 数组有数据但界面没有高亮

**原因**: Vue 渲染问题或样式计算错误

**解决方案**:
1. 检查 `AirSheet.vue` 中的高亮渲染逻辑
2. 确认 `v-for="(item, index) of sheet.config?.online"` 正确遍历
3. 检查 `setHighlightRange` 函数返回的样式是否正确
4. 使用 Vue DevTools 检查组件状态

## 📝 下一步行动

1. **运行应用并测试**
   - 打开两个浏览器窗口
   - 按照上述调试步骤检查日志

2. **收集日志信息**
   - 复制发送端的完整日志
   - 复制接收端的完整日志
   - 截图界面状态

3. **反馈问题**
   - 如果问题仍然存在，提供完整的日志信息
   - 说明在哪个步骤出现了问题
   - 提供任何错误信息

## 🔗 相关文件

- `src/example/index/AirSheet/index.vue` - 发送端逻辑
- `src/hooks/sheet/hooks/useSynergyEvent.js` - 接收端逻辑
- `src/hooks/sheet/hooks/useSelectionRange.js` - 高亮样式计算
- `src/components/AirSheet.vue` - 高亮渲染

