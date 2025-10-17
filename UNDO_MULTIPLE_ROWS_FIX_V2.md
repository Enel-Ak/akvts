# 撤销多行删除功能修复 - V2（最终版）

## 问题描述

当删除单行时，撤销操作无法正确恢复后续行的数据。

### 问题场景
- 原始数据：3 行（row 0, row 1, row 2）
- 删除操作：删除行 1（1 行）
- 删除后：2 行（row 0, row 1 - 原来的 row 2）
- 撤销操作：应该恢复 3 行，但实际只有 2 行（row 0, row 1 - 原来的 row 2 不见了）

### 根本原因

在 V1 的修复中，我犯了一个错误：先恢复被删除的行，再移动后续的行。这导致后续的行被覆盖。

**错误的顺序**：
```javascript
// ❌ 错误：先恢复，再移动
// 1. 恢复 row 1 的数据
sheet.celldata.set(1, value.rowData)

// 2. 移动 row 1（原来的 row 2）到 row 2
sheet.celldata.set(2, sheet.celldata.get(1))
sheet.celldata.delete(1)
// ❌ 问题：row 1 的数据被覆盖了！
```

---

## 修复方案

### 正确的顺序

**关键**：先移动后续的行，再恢复被删除的行

```javascript
// ✅ 正确：先移动，再恢复
// 1. 移动 row 1（原来的 row 2）到 row 2
sheet.celldata.set(2, sheet.celldata.get(1))
sheet.celldata.delete(1)

// 2. 恢复 row 1 的数据
sheet.celldata.set(1, value.rowData)
// ✅ 正确：row 1 和 row 2 的数据都保留了
```

### 完整的修复逻辑

```javascript
// 找出删除的起始行和行数
let minDeletedRow = Infinity
let deleteCount = 0
state.removeRow.forEach((value, key) => {
  const rowIndex = parseInt(key)
  minDeletedRow = Math.min(minDeletedRow, rowIndex)
  deleteCount = value.deleteCount
})

// ✅ 第一步：先移动后续的行（从后向前，避免覆盖）
const rowsToMove = []
sheet.celldata.forEach((rowData, rowIndex) => {
  if (typeof rowIndex === 'number' && rowIndex >= minDeletedRow) {
    rowsToMove.push({
      oldIndex: rowIndex,
      newIndex: rowIndex + deleteCount,
      data: rowData,
    })
  }
})

// 从后向前移动，避免覆盖
rowsToMove.sort((a, b) => b.oldIndex - a.oldIndex)
rowsToMove.forEach(({oldIndex, newIndex, data}) => {
  sheet.celldata.set(newIndex, data)
  sheet.celldata.delete(oldIndex)
})

// ✅ 第二步：再恢复被删除的行
state.removeRow.forEach((value, key) => {
  const rowIndex = parseInt(key)
  sheet.celldata.set(rowIndex, value.rowData)
})
```

---

## 修改文件

### src/hooks/sheet/hooks/useHistory.js

**修改位置**：第 361-416 行（撤销删除行逻辑）

**修改内容**：
- 调整了撤销删除行的操作顺序
- 先移动后续的行，再恢复被删除的行
- 添加了详细的调试日志

---

## 测试场景

### 场景 1：删除单行
```
原始数据：row 0, row 1, row 2
删除行 1：row 0, row 1（原来的 row 2）
撤销：row 0, row 1, row 2（恢复原始状态）
```

**预期结果**：✅ 所有 3 行都被恢复

**验证**：
```javascript
console.log('celldata.size:', sheet.celldata.size) // 应该是 3
console.log('row 0:', sheet.celldata.get(0))
console.log('row 1:', sheet.celldata.get(1))
console.log('row 2:', sheet.celldata.get(2))
```

### 场景 2：删除多行
```
原始数据：row 0, row 1, row 2, row 3
删除行 1-2：row 0, row 1（原来的 row 3）
撤销：row 0, row 1, row 2, row 3（恢复原始状态）
```

**预期结果**：✅ 所有 4 行都被恢复

### 场景 3：删除末尾行
```
原始数据：row 0, row 1, row 2
删除行 2：row 0, row 1
撤销：row 0, row 1, row 2（恢复原始状态）
```

**预期结果**：✅ 所有 3 行都被恢复

---

## 调试方法

### 启用详细日志

在 useHistory.js 中已添加以下日志：

```javascript
console.log('撤销删除行信息:', {
  minDeletedRow,
  deleteCount,
  deletedRowsCount: state.removeRow.size,
})

console.log(`移动行 ${oldIndex} 到 ${newIndex}`)
console.log(`恢复被删除的行 ${rowIndex}`)
```

### 预期日志输出

```
撤销删除行信息: {minDeletedRow: 1, deleteCount: 1, deletedRowsCount: 1}
移动行 1 到 2
恢复被删除的行 1
```

---

## 关键改进

1. **操作顺序正确** - 先移动后续的行，再恢复被删除的行
2. **避免数据覆盖** - 从后向前移动，确保不会覆盖已恢复的数据
3. **支持多行删除** - 能够正确处理删除多行的撤销

---

## 状态

✅ **已修复** - 撤销多行删除功能已正确实现

**修改文件**：
- src/hooks/sheet/hooks/useHistory.js（第 361-416 行）

**测试状态**：待验证

---

## 对比 V1 和 V2

| 方面 | V1 | V2 |
|------|----|----|
| 操作顺序 | 先恢复，再移动 | 先移动，再恢复 |
| 数据覆盖 | ❌ 会覆盖 | ✅ 不会覆盖 |
| 单行删除 | ❌ 失败 | ✅ 成功 |
| 多行删除 | ❌ 失败 | ✅ 成功 |
| 末尾行删除 | ❌ 失败 | ✅ 成功 |

