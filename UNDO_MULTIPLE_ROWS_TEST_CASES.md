# 撤销多行删除 - 测试用例

## 测试环境

- 文件：src/hooks/sheet/hooks/useHistory.js
- 修改行数：361-438 行
- 修改内容：撤销删除行的核心逻辑

---

## 测试用例

### TC-1: 删除 2 行后撤销

**前置条件**：
- 表格有 4 行数据（row 0, row 1, row 2, row 3）
- 每行有数据

**操作步骤**：
1. 选中行 1-2
2. 删除行 1-2
3. 撤销删除

**预期结果**：
- ✅ 恢复 row 1 和 row 2 的数据
- ✅ row 3 移动回 row 3
- ✅ 表格显示 4 行数据
- ✅ 数据完整无损

**验证方法**：
```javascript
// 检查 celldata 大小
console.log('celldata.size:', sheet.celldata.size) // 应该是 4

// 检查每行数据
sheet.celldata.forEach((rowData, rowIndex) => {
  console.log(`row ${rowIndex}:`, rowData)
})
```

**控制台日志**：
```
撤销删除行信息: {minDeletedRow: 1, deleteCount: 2, deletedRowsCount: 2}
恢复被删除的行 1
恢复被删除的行 2
移动行 3 到 5
```

---

### TC-2: 删除 3 行后撤销

**前置条件**：
- 表格有 5 行数据（row 0, row 1, row 2, row 3, row 4）
- 每行有数据

**操作步骤**：
1. 选中行 1-3
2. 删除行 1-3
3. 撤销删除

**预期结果**：
- ✅ 恢复 row 1, row 2, row 3 的数据
- ✅ row 4 移动回 row 4
- ✅ 表格显示 5 行数据
- ✅ 数据完整无损

**验证方法**：
```javascript
// 检查 celldata 大小
console.log('celldata.size:', sheet.celldata.size) // 应该是 5

// 检查被恢复的行
console.log('row 1:', sheet.celldata.get(1))
console.log('row 2:', sheet.celldata.get(2))
console.log('row 3:', sheet.celldata.get(3))
```

---

### TC-3: 删除末尾行后撤销

**前置条件**：
- 表格有 3 行数据（row 0, row 1, row 2）
- 每行有数据

**操作步骤**：
1. 选中行 1-2
2. 删除行 1-2
3. 撤销删除

**预期结果**：
- ✅ 恢复 row 1 和 row 2 的数据
- ✅ 表格显示 3 行数据
- ✅ 数据完整无损

**验证方法**：
```javascript
// 检查 celldata 大小
console.log('celldata.size:', sheet.celldata.size) // 应该是 3

// 检查行数
console.log('rowCount:', sheet.config.rowCount) // 应该是 3
```

---

### TC-4: 删除第一行后撤销

**前置条件**：
- 表格有 4 行数据（row 0, row 1, row 2, row 3）
- 每行有数据

**操作步骤**：
1. 选中行 0
2. 删除行 0
3. 撤销删除

**预期结果**：
- ✅ 恢复 row 0 的数据
- ✅ row 1-3 移动回 row 1-3
- ✅ 表格显示 4 行数据
- ✅ 数据完整无损

**验证方法**：
```javascript
// 检查 celldata 大小
console.log('celldata.size:', sheet.celldata.size) // 应该是 4

// 检查第一行数据
console.log('row 0:', sheet.celldata.get(0))
```

---

### TC-5: 删除中间行后撤销

**前置条件**：
- 表格有 5 行数据（row 0, row 1, row 2, row 3, row 4）
- 每行有数据

**操作步骤**：
1. 选中行 2
2. 删除行 2
3. 撤销删除

**预期结果**：
- ✅ 恢复 row 2 的数据
- ✅ row 3-4 移动回 row 3-4
- ✅ 表格显示 5 行数据
- ✅ 数据完整无损

---

### TC-6: 多次删除和撤销

**前置条件**：
- 表格有 6 行数据（row 0-5）
- 每行有数据

**操作步骤**：
1. 删除行 1-2
2. 撤销删除
3. 删除行 3-4
4. 撤销删除

**预期结果**：
- ✅ 第一次撤销恢复 row 1-2
- ✅ 第二次撤销恢复 row 3-4
- ✅ 最终表格显示 6 行数据
- ✅ 数据完整无损

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

console.log(`恢复被删除的行 ${rowIndex}`)
console.log(`移动行 ${oldIndex} 到 ${newIndex}`)
```

### 检查 celldata 状态

```javascript
// 撤销前
console.log('撤销前 celldata:', sheet.celldata)

// 撤销后
console.log('撤销后 celldata:', sheet.celldata)

// 比较大小
console.log('celldata.size:', sheet.celldata.size)
console.log('rowCount:', sheet.config.rowCount)
```

---

## 预期日志输出

### 删除 2 行的日志

```
=== removeRow: celldata 删除前 ===
maxRowIndex: 3
要删除的行范围: {r: 1, rr: 2}
删除前的 celldata (r-1 到 rr+2): {0: [...], 1: [...], 2: [...], 3: [...]}

=== removeRow: 第一步 - 删除被选中的行 ===
删除 row 1
删除 row 2

=== removeRow: 第二步 - 移动后面的行 ===
rowsToMove: [{oldIndex: 3, newIndex: 1}]
移动 row 3 到 row 1

=== removeRow: 清理重复数据 ===
清理范围: {start: 2, end: 3}
删除 row 2
删除 row 3

=== removeRow: celldata 删除后 ===
删除后的 celldata (r-1 到 rr+2): {0: [...], 1: [...]}

撤销删除行信息: {minDeletedRow: 1, deleteCount: 2, deletedRowsCount: 2}
恢复被删除的行 1
恢复被删除的行 2
移动行 1 到 3
```

---

## 状态

✅ **测试用例已准备** - 可以开始执行测试

**下一步**：
1. 运行测试用例 TC-1 到 TC-6
2. 检查控制台日志
3. 验证 celldata 状态
4. 确认 UI 显示正确

