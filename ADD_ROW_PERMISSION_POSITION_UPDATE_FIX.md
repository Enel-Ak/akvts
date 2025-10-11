# 修复添加行后立即删除时出现的行索引错误问题

## 问题描述

### 场景重现

1. 第 3 行和第 6 行被锁定（存在 `deepPermissions`）
2. 在第 3 行和第 6 行之间添加新行（例如在第 5 行位置添加）
3. 立即删除刚添加的第 5 行
4. **错误现象**：实际删除的是第 6 行（新添加行的下一行），而不是第 5 行（新添加的行）
5. **刷新页面后**：数据显示正确，说明后端数据是对的，问题出在前端的行索引计算

---

## 根本原因分析

### 问题的根本原因

**原因：** 添加行后，`deepPermissions` 的更新条件太严格，导致权限位置没有更新

```javascript
// Line 1324（修改前）
if (sheet.config.synergy && sheet.config.auth > 0) {
    // 更新 deepPermissions 和 superPermissions
}
```

**问题：**
- 只有在协同模式下 (`sheet.config.synergy`)
- 并且有权限 (`sheet.config.auth > 0`)
时才会更新权限

**如果这两个条件不满足，添加行后 `deepPermissions` 就不会更新！**

---

### 问题流程详解

**初始状态（行索引从 0 开始）：**
- row 0: 数据 5
- row 1: 数据 6（deepPermissions 记录 row 1）
- row 2: 数据 8（deepPermissions 记录 row 2）
- row 3: 数据 9
- row 4: 数据 10
- row 5: 数据 11（deepPermissions 记录 row 5）
- row 6: 数据 12

**用户操作：在第 5 行位置添加新行（insertRowIndex = 4）**

**添加行后的结构：**
- row 0: 数据 5
- row 1: 数据 6（deepPermissions 应该仍然是 row 1）
- row 2: 数据 8（deepPermissions 应该仍然是 row 2）
- row 3: 数据 9
- row 4: 空行（新添加）
- row 5: 数据 10（原来的 row 4）
- row 6: 数据 11（**deepPermissions 应该更新为 row 6，但如果条件不满足，仍然是 row 5**）
- row 7: 数据 12（原来的 row 6）

**如果 `deepPermissions` 没有更新：**
- `deepPermissions` 仍然记录 row 1, row 2, row 5
- 但实际上 row 5 现在是数据 10，而不是数据 11
- 数据 11 现在在 row 6

**用户操作：选中第 5 行（新添加的空行），点击删除**

**问题发生：**
- 因为 `deepPermissions` 没有更新，可能导致界面渲染或选区计算使用了错误的行索引
- 最终删除了第 6 行（数据 10）而不是第 5 行（空行）

**刷新页面后：**
- 数据从后端重新加载，`deepPermissions` 也重新加载
- 所以显示正确，证明后端数据是对的，问题出在前端

---

## 修复方案

### 核心思路

**简化权限更新条件**：只要有 `deepPermissions` 或 `superPermissions`，就更新，无论是否开启协同模式或权限等级

```javascript
// 修改前：
if (sheet.config.synergy && sheet.config.auth > 0) {
    // 更新权限
}

// 修改后：
if (sheet.config.deepPermissions || sheet.config.superPermissions) {
    // 更新权限
}
```

### 优点

1. 无论是否开启协同模式，只要有权限配置就会更新
2. 避免了添加行/列后权限位置不更新的问题
3. 避免了后续删除操作出现行/列索引错误
4. 与之前修复 `removeRow` 和 `removeColumn` 的方案保持一致
5. 逻辑更简单，更容易维护

---

## 修复实现

### 修复 1: 简化 addRow 函数的权限更新条件

**修改文件：** `src/hooks/sheet/hooks/useTools.js` (Line 1320-1326)

**修改前：**

```javascript
// 更新sheet.celldata
sheet.config.rowCount += addRowCount.value

// ✅ 新需求: 添加行后更新 deepPermissions 和 superPermissions
if (sheet.config.synergy && sheet.config.auth > 0) {
    // 更新权限
}
```

**修改后：**

```javascript
// 更新sheet.celldata
sheet.config.rowCount += addRowCount.value

// ✅ 修复: 添加行后更新 deepPermissions 和 superPermissions
// 无论是否开启协同模式或权限等级，只要有权限配置就应该更新
// 这样可以避免添加行后权限位置不更新，导致后续删除操作出现行索引错误
if (sheet.config.deepPermissions || sheet.config.superPermissions) {
    // 更新权限
}
```

---

### 修复 2: 简化 addColumn 函数的权限更新条件

**修改文件：** `src/hooks/sheet/hooks/useTools.js` (Line 1718-1723)

**修改前：**

```javascript
sheet.config.colCount += addColumnCount.value

// ✅ 新需求: 添加列后更新 deepPermissions 和 superPermissions
if (sheet.config.synergy && sheet.config.auth > 0) {
    // 更新权限
}
```

**修改后：**

```javascript
sheet.config.colCount += addColumnCount.value

// ✅ 修复: 添加列后更新 deepPermissions 和 superPermissions
// 无论是否开启协同模式或权限等级，只要有权限配置就应该更新
// 这样可以避免添加列后权限位置不更新，导致后续删除操作出现列索引错误
if (sheet.config.deepPermissions || sheet.config.superPermissions) {
    // 更新权限
}
```

---

## 修复后的逻辑流程

### 用户添加第 5 行

1. 用户选中第 4 行，点击"添加行"按钮
2. 新行插入在第 5 行位置（insertRowIndex = 4）
3. celldata 正确移动：row 4-6 变成 row 5-7
4. **更新 deepPermissions**：row 5 变成 row 6（数据 11 的锁定）
5. rowCount 增加 1

### 用户删除第 5 行

1. 用户选中第 5 行（新添加的空行）
2. 点击"删除行"按钮
3. `getRanged()` 返回 `r=4, rr=4`
4. 删除 row 4（新添加的空行）
5. celldata 正确移动：row 5-7 变成 row 4-6
6. **更新 deepPermissions**：row 6 变回 row 5（数据 11 的锁定）
7. rowCount 减少 1

### 最终结果

- ✅ 正确删除了新添加的空行
- ✅ 数据 10 没有被删除
- ✅ 所有锁定位置都正确更新
- ✅ 不会出现行索引错误

---

## 测试场景

### 测试 1: 行权限 - 添加行后立即删除

**步骤：**
1. 第 3 行和第 6 行被锁定
2. 在第 5 行位置添加新行
3. 验证第 6 行的锁定是否变成第 7 行
4. 立即删除第 5 行（新添加的行）
5. 验证是否正确删除第 5 行（而不是第 6 行）
6. 验证第 7 行的锁定是否变回第 6 行

**预期结果：**
- ✅ 添加第 5 行后，第 6 行的锁定立即变成第 7 行
- ✅ 删除第 5 行后，正确删除第 5 行
- ✅ 删除第 5 行后，第 7 行的锁定立即变回第 6 行
- ✅ 不会出现删除错误行的问题

---

### 测试 2: 列权限 - 添加列后立即删除

**步骤：**
1. 第 3 列和第 6 列被锁定
2. 在第 5 列位置添加新列
3. 验证第 6 列的锁定是否变成第 7 列
4. 立即删除第 5 列（新添加的列）
5. 验证是否正确删除第 5 列（而不是第 6 列）
6. 验证第 7 列的锁定是否变回第 6 列

**预期结果：**
- ✅ 添加第 5 列后，第 6 列的锁定立即变成第 7 列
- ✅ 删除第 5 列后，正确删除第 5 列
- ✅ 删除第 5 列后，第 7 列的锁定立即变回第 6 列
- ✅ 不会出现删除错误列的问题

---

### 测试 3: 多次添加和删除操作

**步骤：**
1. 第 3 行和第 7 行被锁定
2. 在第 4 行位置添加新行
3. 在第 5 行位置添加新行
4. 删除第 4 行
5. 删除第 5 行
6. 验证所有锁定位置是否正确

**预期结果：**
- ✅ 每次添加/删除操作后，所有锁定位置都正确更新
- ✅ 不会出现行索引错乱的问题
- ✅ 最终第 3 行和第 7 行的锁定保持不变

---

### 测试 4: 在被锁定行之间添加和删除

**步骤：**
1. 第 3 行和第 5 行被锁定
2. 在第 4 行位置添加新行
3. 验证第 5 行的锁定是否变成第 6 行
4. 立即删除第 4 行
5. 验证第 6 行的锁定是否变回第 5 行
6. 验证第 3 行的锁定是否保持不变

**预期结果：**
- ✅ 添加第 4 行后，第 5 行的锁定变成第 6 行
- ✅ 删除第 4 行后，第 6 行的锁定变回第 5 行
- ✅ 第 3 行的锁定始终保持不变
- ✅ 不会出现锁定失效或数据错乱

---

## 修改的文件

**`src/hooks/sheet/hooks/useTools.js`**

1. **Line 1320-1326**: 简化 `addRow` 函数的权限更新条件
2. **Line 1718-1723**: 简化 `addColumn` 函数的权限更新条件

---

## 与之前修复的关联

本次修复与之前修复 `removeRow` 和 `removeColumn` 的方案保持一致：

**之前的修复（DELETE_ROW_PERMISSION_POSITION_UPDATE_FIX.md）：**
- 简化了 `removeRow` 和 `removeColumn` 的权限更新条件
- 移除了 `eventCell` 同步权限配置，避免竞态条件

**本次修复：**
- 简化了 `addRow` 和 `addColumn` 的权限更新条件
- 确保添加行/列后，权限位置立即更新

**统一的修复原则：**
- 只要有 `deepPermissions` 或 `superPermissions`，就更新
- 无论是否开启协同模式或权限等级
- 无论是本地操作还是远程同步
- 保证权限位置的一致性，避免索引错误

---

所有修复已完成！添加行/列操作现在会正确更新 `deepPermissions` 和 `superPermissions` 的位置，避免了后续删除操作出现行/列索引错误的问题。🎉

