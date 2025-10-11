# 修复删除行操作中 deepPermissions 位置更新和数据同步的问题

## 问题描述

### 问题 1：删除行后 deepPermissions 位置没有正确更新

**场景：**
- 第 5 行被锁定（`deepPermissions` 记录为第 5 行）
- 删除第 3 行
- **预期结果**：第 5 行变成第 4 行，`deepPermissions` 也应该更新为第 4 行
- **实际结果**：`deepPermissions` 仍然记录为第 5 行，没有向上移动

---

### 问题 2：删除被锁定行后面的数据时，偶尔出现 deepPermissions 锁定失效和错乱

**场景：**
- 第 3 行被用户 A 锁定
- 第 5 行被用户 B 锁定
- 删除第 4 行（在被锁定行之间）
- **预期结果**：
  - 第 3 行的锁定保持不变
  - 第 5 行变成第 4 行，锁定也应该移动到第 4 行
  - `celldata` 正确更新
- **实际结果**：
  - 偶尔出现第 5 行的锁定失效
  - `deepPermissions` 数据错乱
  - `celldata` 没有刷新

---

## 根本原因分析

### 问题 1 的根本原因

**原因：** 权限更新的条件太严格

```javascript
// 原代码：
if (sheet.config.synergy && sheet.config.auth > 0 && !asyncData) {
    // 更新权限
}
```

**问题：**
- 只有在协同模式下 (`sheet.config.synergy`)
- 并且有权限 (`sheet.config.auth > 0`)
- 并且不是同步操作 (`!asyncData`)
时才会更新权限

**结果：**
- 如果没有开启协同模式，或者权限等级不够，权限就不会更新
- 导致删除行后，`deepPermissions` 的行索引没有更新

---

### 问题 2 的根本原因

**原因：** 远程接收时不更新权限，依赖单独的 `eventCell` 事件，导致竞态条件

**问题流程：**

1. **本地操作流程**：
   - 删除 celldata 数据
   - 更新 rowCount
   - 更新 deepPermissions（只在 `!asyncData` 时）
   - 发送 removeRow 同步事件
   - 发送 eventCell 同步权限配置

2. **远程接收流程**：
   - 接收 RowDeleted 事件
   - 调用 removeRow 并传入 asyncData
   - **因为传入了 asyncData，所以不会更新 deepPermissions**
   - 接收 CellUpdated 事件
   - 更新 deepPermissions 配置

**问题：**
- `RowDeleted` 和 `CellUpdated` 两个事件的到达顺序可能不一致，导致**竞态条件**
- 如果 `CellUpdated` 先到达，此时 celldata 还没有删除，权限位置就会基于旧的数据计算，导致错乱
- 如果 `CellUpdated` 延迟到达，中间可能会有其他操作，导致数据不一致
- `eventCell` 事件会直接覆盖整个 `deepPermissions` 对象，可能导致本地修改丢失

---

## 修复方案

### 核心思路

1. **简化权限更新条件**：只要有 `deepPermissions` 或 `superPermissions`，就更新
2. **本地和远程都更新权限**：移除 `!asyncData` 的限制，避免依赖 `eventCell` 事件
3. **移除单独的 eventCell 同步**：因为权限已经在本地和远程都更新了，不需要再通过 `eventCell` 同步

### 优点

1. 本地和远程都会更新权限，保证一致性
2. 避免了 `eventCell` 覆盖的问题
3. 避免了竞态条件
4. 减少了网络请求
5. 逻辑更简单，更容易维护

---

## 修复实现

### 修复 1: 简化 removeRow 函数的权限更新条件

**修改文件：** `src/hooks/sheet/hooks/useTools.js` (Line 1528-1534)

**修改前：**

```javascript
// ✅ 新需求: 删除行后更新 deepPermissions 和 superPermissions
// ⚠️ 重要: 只在非同步操作时更新权限（asyncData 为 null 时）
// 如果是同步操作（asyncData 存在），说明是从其他用户的删除操作同步过来的
// 此时权限已经在发起删除的用户端更新并同步过来了，不需要再次更新
if (sheet.config.synergy && sheet.config.auth > 0 && !asyncData) {
    // 更新权限
}
```

**修改后：**

```javascript
// ✅ 修复: 删除行后更新 deepPermissions 和 superPermissions
// 无论是本地操作还是远程同步，都需要更新权限位置
// 这样可以避免权限位置不更新的问题，也避免了依赖 eventCell 事件导致的竞态条件
if (sheet.config.deepPermissions || sheet.config.superPermissions) {
    // 更新权限
}
```

---

### 修复 2: 移除 removeRow 函数的 eventCell 同步

**修改文件：** `src/hooks/sheet/hooks/useTools.js` (Line 1635-1645)

**修改前：**

```javascript
if (sheet.config.synergy && !asyncData) {
    sheet.hooks.synergyHook.removeRow({
        sheetId: sheet?.original?.sheetId || sheet.id,
        startIndex: r,
        count: deleteCount,
    })

    // ✅ 新需求: 同步 deepPermissions 和 superPermissions 的更新
    sheet.hooks.synergyHook.eventCell({
        sheetId: sheet?.original?.sheetId || sheet.id,
        type: 'config',
        data: {
            deepPermissions: sheet.config.deepPermissions,
            superPermissions: sheet.config.superPermissions,
        },
    })
}
```

**修改后：**

```javascript
if (sheet.config.synergy && !asyncData) {
    sheet.hooks.synergyHook.removeRow({
        sheetId: sheet?.original?.sheetId || sheet.id,
        startIndex: r,
        count: deleteCount,
    })

    // ✅ 修复: 移除单独的 eventCell 同步权限配置
    // 因为权限已经在本地和远程都更新了（通过上面的权限更新逻辑）
    // 不需要再通过 eventCell 同步，避免了竞态条件和覆盖问题
}
```

---

### 修复 3: 简化 removeColumn 函数的权限更新条件

**修改文件：** `src/hooks/sheet/hooks/useTools.js` (Line 1945-1952)

**修改前：**

```javascript
// ✅ 新需求: 删除列后更新 deepPermissions 和 superPermissions
// ⚠️ 重要: 只在非同步操作时更新权限（asyncData 为 null 时）
// 如果是同步操作（asyncData 存在），说明是从其他用户的删除操作同步过来的
// 此时权限已经在发起删除的用户端更新并同步过来了，不需要再次更新
if (sheet.config.synergy && sheet.config.auth > 0 && !asyncData) {
    // 更新权限
}
```

**修改后：**

```javascript
// ✅ 修复: 删除列后更新 deepPermissions 和 superPermissions
// 无论是本地操作还是远程同步，都需要更新权限位置
// 这样可以避免权限位置不更新的问题，也避免了依赖 eventCell 事件导致的竞态条件
if (sheet.config.deepPermissions || sheet.config.superPermissions) {
    // 更新权限
}
```

---

### 修复 4: 移除 removeColumn 函数的 eventCell 同步

**修改文件：** `src/hooks/sheet/hooks/useTools.js` (Line 2086-2096)

**修改前：**

```javascript
if (sheet.config.synergy && !asyncData) {
    sheet.hooks.synergyHook.removeColumn({
        sheetId: sheet?.original?.sheetId || sheet.id,
        startIndex: c,
        count: deleteCount,
    })

    // ✅ 新需求: 同步 deepPermissions 和 superPermissions 的更新
    sheet.hooks.synergyHook.eventCell({
        sheetId: sheet?.original?.sheetId || sheet.id,
        type: 'config',
        data: {
            deepPermissions: sheet.config.deepPermissions,
            superPermissions: sheet.config.superPermissions,
        },
    })
}
```

**修改后：**

```javascript
if (sheet.config.synergy && !asyncData) {
    sheet.hooks.synergyHook.removeColumn({
        sheetId: sheet?.original?.sheetId || sheet.id,
        startIndex: c,
        count: deleteCount,
    })

    // ✅ 修复: 移除单独的 eventCell 同步权限配置
    // 因为权限已经在本地和远程都更新了（通过上面的权限更新逻辑）
    // 不需要再通过 eventCell 同步，避免了竞态条件和覆盖问题
}
```

---

## 修复后的逻辑流程

### 用户 A 删除第 3 行

1. 用户 A 调用 `removeRow` 函数（`asyncData = null`）
2. 执行权限检查（如果有权限限制）
3. 删除第 3 行的数据
4. **更新 deepPermissions**：第 5 行变成第 4 行
5. 发送 removeRow 同步事件到其他用户
6. **不再发送 eventCell 事件**

### 用户 B 接收到删除行事件

1. 用户 B 接收到 `OnRowDeleted` 事件
2. 调用 `removeRow` 函数（`asyncData = {startIndex: 2, count: 1}`）
3. 跳过权限检查（因为 `asyncData` 存在）
4. 删除第 3 行的数据
5. **更新 deepPermissions**：第 5 行变成第 4 行
6. **不再等待 eventCell 事件**

---

## 测试场景

### 测试 1: 删除行后权限位置更新

**步骤：**
1. 第 5 行被锁定
2. 删除第 3 行
3. 验证第 5 行的锁定变成第 4 行

**预期结果：**
- ✅ 第 5 行的 `deepPermissions` 正确更新为第 4 行
- ✅ 高亮框显示在第 4 行
- ✅ 用户标签显示在第 4 行

---

### 测试 2: 删除被锁定行之间的数据

**步骤：**
1. 第 3 行被用户 A 锁定
2. 第 5 行被用户 B 锁定
3. 删除第 4 行
4. 验证第 3 行的锁定保持不变
5. 验证第 5 行的锁定变成第 4 行

**预期结果：**
- ✅ 第 3 行的锁定保持不变
- ✅ 第 5 行的锁定变成第 4 行
- ✅ `celldata` 正确更新
- ✅ 不会出现锁定失效或数据错乱

---

### 测试 3: 多次删除操作

**步骤：**
1. 第 3、5、7 行被不同用户锁定
2. 依次删除第 2、4、6 行
3. 验证所有锁定都正确移动
4. 验证 `celldata` 正确更新

**预期结果：**
- ✅ 删除第 2 行后：第 3 行变成第 2 行，第 5 行变成第 4 行，第 7 行变成第 6 行
- ✅ 删除第 4 行后：第 2 行保持不变，第 4 行变成第 3 行，第 6 行变成第 5 行
- ✅ 删除第 5 行后：第 2 行保持不变，第 3 行保持不变，第 5 行变成第 4 行
- ✅ 所有锁定都正确移动，不会出现数据错乱

---

### 测试 4: 同步操作测试

**步骤：**
1. 用户 A 删除第 3 行
2. 验证用户 B 的 `deepPermissions` 也正确更新
3. 验证用户 B 的 `celldata` 正确刷新
4. 验证用户 B 的界面显示正确

**预期结果：**
- ✅ 用户 A 删除第 3 行后，用户 B 的第 3 行也被删除
- ✅ 用户 B 的 `deepPermissions` 正确更新（第 5 行变成第 4 行）
- ✅ 用户 B 的 `celldata` 正确刷新
- ✅ 用户 B 的界面显示正确（高亮框和用户标签位置正确）

---

所有修复已完成！删除行/列操作现在会正确更新 `deepPermissions` 和 `superPermissions` 的位置，无论是本地操作还是远程同步，都能保证权限位置的一致性，避免了竞态条件和数据错乱的问题。🎉

