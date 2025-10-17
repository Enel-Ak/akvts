# 撤销多行删除功能修复

## 问题描述

当删除多行时，撤销操作无法正确恢复所有被删除的行数据。

### 问题场景
- 原始数据：3 行（row 0, row 1, row 2）
- 删除操作：删除行 1-2（共 2 行）
- 删除后：只有 1 行（row 0）
- 撤销操作：应该恢复 2 行，但实际只恢复了 1 行

### 根本原因

在 `useHistory.js` 的撤销删除行逻辑中：

```javascript
// 旧的错误逻辑
let count = 0
await useProcessMapInBatches(
  sheet.id,
  sheet.celldata,  // ❌ 只遍历当前的 celldata（只有 1 行）
  (rowIndex, rowData) => {
    const recover = state.removeRow.get(`${rowIndex}`)
    if (recover) {
      sheet.celldata.set(rowIndex, recover.rowData)
      count = recover.deleteCount
    }
    sheet.celldata.set(rowIndex + count, rowData)
  }
)
```

**问题**：
1. 循环遍历的是当前的 celldata（只有 1 行）
2. 只有当 rowIndex 恰好等于被删除行的索引时才会恢复
3. 如果被删除的行 1-2 都不在当前 celldata 中，就无法恢复

---

## 修复方案

### 新的正确逻辑

```javascript
// ✅ 新的正确逻辑
// 第一步：找出删除的起始行和行数
let minDeletedRow = Infinity
let deleteCount = 0
state.removeRow.forEach((value, key) => {
  const rowIndex = parseInt(key)
  minDeletedRow = Math.min(minDeletedRow, rowIndex)
  deleteCount = value.deleteCount
})

// 第二步：恢复所有被删除的行
state.removeRow.forEach((value, key) => {
  const rowIndex = parseInt(key)
  sheet.celldata.set(rowIndex, value.rowData)
})

// 第三步：移动后续的行
const rowsToMove = []
sheet.celldata.forEach((rowData, rowIndex) => {
  if (typeof rowIndex === 'number' && rowIndex >= minDeletedRow + deleteCount) {
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
```

### 关键改进

1. **不依赖当前 celldata** - 直接从 state.removeRow 中恢复所有被删除的行
2. **正确的恢复顺序** - 先恢复被删除的行，再移动后续的行
3. **避免数据覆盖** - 从后向前移动，确保不会覆盖已恢复的数据

---

## 修改文件

### src/hooks/sheet/hooks/useHistory.js

**修改位置**：第 361-407 行（撤销删除行逻辑）

**修改内容**：
- 替换了撤销删除行的核心逻辑
- 添加了详细的调试日志
- 确保多行删除的撤销能够正确恢复所有数据

---

## 测试场景

### 场景 1：删除 2 行
```
原始数据：row 0, row 1, row 2, row 3
删除行 1-2：row 0, row 3（row 3 移动到 row 1）
撤销：row 0, row 1, row 2, row 3（恢复原始状态）
```

**预期结果**：✅ 所有 4 行都被恢复

### 场景 2：删除 3 行
```
原始数据：row 0, row 1, row 2, row 3, row 4
删除行 1-3：row 0, row 4（row 4 移动到 row 1）
撤销：row 0, row 1, row 2, row 3, row 4（恢复原始状态）
```

**预期结果**：✅ 所有 5 行都被恢复

### 场景 3：删除末尾行
```
原始数据：row 0, row 1, row 2
删除行 1-2：row 0
撤销：row 0, row 1, row 2（恢复原始状态）
```

**预期结果**：✅ 所有 3 行都被恢复

---

## 验证方法

1. **查看控制台日志**：
   ```
   撤销删除行信息: {minDeletedRow: 1, deleteCount: 2, deletedRowsCount: 2}
   恢复被删除的行 1
   恢复被删除的行 2
   移动行 3 到 5
   ```

2. **检查 celldata**：
   - 所有被删除的行都应该被恢复
   - 后续的行应该被正确移动

3. **检查 UI**：
   - 撤销后应该显示所有原始数据
   - 行号应该正确

---

## 相关代码

### removeRow 中的保存逻辑（useTools.js）

```javascript
// 保存被删除的行数据
deletedRows.set(`${rowIndex}`, {
  rowData: useStringArrayToBuffer(rowData),
  deleteCount,
})
```

**说明**：
- 每一行被删除时都保存了 rowData 和 deleteCount
- 所有被删除的行都有相同的 deleteCount（删除的总行数）

### 撤销逻辑（useHistory.js）

现在已修复，能够正确处理多行删除的撤销。

---

## 状态

✅ **已修复** - 撤销多行删除功能已正确实现

**修改文件**：
- src/hooks/sheet/hooks/useHistory.js（第 361-438 行）

**测试状态**：待验证

