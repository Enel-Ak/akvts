# 🔧 筛选逻辑优化和性能提升

## 问题分析

用户报告筛选逻辑可能存在跨列匹配的问题，但经过详细分析，**筛选逻辑本身是正确的**。

### 筛选逻辑验证

**筛选条件构建（`AirSheetFilter.vue` line 338-341）：**
```javascript
const currentColumnFilters = validChecked.map((item) => ({
    v: item,        // 筛选值
    c: props.colIndex,  // 列索引
}))
```

**筛选逻辑（`useTools.js` line 2005-2032）：**
```javascript
// 检查每一列的筛选条件
for (const [columnIndex, filterValues] of filtersByColumn) {
    // 获取指定列的单元格值
    let cellValue = rowData[columnIndex]
    
    // 检查当前列的值是否匹配任一筛选值（OR逻辑）
    let matchesThisColumn = false
    for (const filterValue of filterValues) {
        if (cellValue === filterValue) {
            matchesThisColumn = true
            break
        }
    }
    
    // 如果当前列不匹配任何筛选值，则整行不匹配
    if (!matchesThisColumn) {
        matchesAllColumns = false
        break
    }
}
```

**结论：** 筛选逻辑**只检查指定列的值**，不会跨列匹配。

---

## 发现的性能问题

虽然筛选逻辑是正确的，但发现了一个严重的性能问题：

### 问题：`filtersByColumn` 在每次处理行时都重新构建

**原始代码（`filterByChecked` 和 `filterByCheckedSilent`）：**
```javascript
await useProcessMapInBatches(sheet.id, sheet.celldata, (rowIndex, rowData) => {
    // ❌ 性能问题: 每处理一行都重新构建一次 filtersByColumn
    const filtersByColumn = new Map()
    for (const filter of sheet.config.filtered) {
        if (!filtersByColumn.has(filter.c)) {
            filtersByColumn.set(filter.c, [])
        }
        filtersByColumn.get(filter.c).push(filter.v)
    }
    
    // ... 筛选逻辑
})
```

**性能影响：**
- 假设有 10,000 行数据，3 个筛选条件
- `filtersByColumn` 会被构建 10,000 次
- 总共执行 30,000 次循环（10,000 行 × 3 个筛选条件）

---

## 优化方案

### 优化 1: 将 `filtersByColumn` 构建移到循环外部

**修改文件：** `src/hooks/sheet/hooks/useTools.js`

#### 1.1 优化 `filterByChecked` 函数（line 1797-1838）

**修改前：**
```javascript
await useProcessMapInBatches(sheet.id, sheet.celldata, (rowIndex, rowData) => {
    // 按列分组筛选条件
    const filtersByColumn = new Map()
    for (const filter of sheet.config.filtered) {
        if (!filtersByColumn.has(filter.c)) {
            filtersByColumn.set(filter.c, [])
        }
        filtersByColumn.get(filter.c).push(filter.v)
    }
    
    // ... 筛选逻辑
})
```

**修改后：**
```javascript
// ✅ 性能优化: 在循环外部构建筛选条件映射，避免重复构建
const filtersByColumn = new Map()
for (const filter of sheet.config.filtered) {
    if (!filtersByColumn.has(filter.c)) {
        filtersByColumn.set(filter.c, [])
    }
    filtersByColumn.get(filter.c).push(filter.v)
}

console.log('filterByChecked - 筛选条件映射:', {
    filtersByColumn: Array.from(filtersByColumn.entries()).map(([col, values]) => ({
        列索引: col,
        筛选值: values,
    })),
})

await useProcessMapInBatches(sheet.id, sheet.celldata, (rowIndex, rowData) => {
    // ... 筛选逻辑（直接使用外部的 filtersByColumn）
})
```

#### 1.2 优化 `filterByCheckedSilent` 函数（line 1981-2012）

**修改内容：** 与 `filterByChecked` 相同的优化

---

### 优化 2: 修复列索引无效时的处理逻辑

**问题：** 当列索引无效时，原始代码使用 `continue` 跳过，而不是设置 `matchesAllColumns = false` 并 `break`。

**修改前：**
```javascript
for (const [columnIndex, filterValues] of filtersByColumn) {
    // 边界情况处理：检查列索引有效性
    if (columnIndex < 0 || columnIndex >= rowData.length) {
        continue  // ❌ 错误: 应该设置为不匹配并退出循环
    }
    // ...
}
```

**修改后：**
```javascript
for (const [columnIndex, filterValues] of filtersByColumn) {
    // 边界情况处理：检查列索引有效性
    if (columnIndex < 0 || columnIndex >= rowData.length) {
        // ✅ 修复: 列索引无效时，该行不匹配
        matchesAllColumns = false
        break
    }
    // ...
}
```

---

## 优化效果

### 性能提升

**优化前：**
- 10,000 行数据，3 个筛选条件
- `filtersByColumn` 构建次数：10,000 次
- 总循环次数：30,000 次

**优化后：**
- 10,000 行数据，3 个筛选条件
- `filtersByColumn` 构建次数：1 次
- 总循环次数：3 次

**性能提升：** 减少了 99.99% 的重复构建操作

### 调试日志

添加了调试日志，方便排查筛选问题：

```javascript
console.log('filterByChecked - 筛选条件映射:', {
    filtersByColumn: Array.from(filtersByColumn.entries()).map(([col, values]) => ({
        列索引: col,
        筛选值: values,
    })),
})
```

**示例输出：**
```
filterByChecked - 筛选条件映射: {
    filtersByColumn: [
        {列索引: 0, 筛选值: ['值1', '值2']},
        {列索引: 2, 筛选值: ['值3']},
    ]
}
```

---

## 测试步骤

### 测试 1: 验证筛选逻辑正确性

**场景：** 在第 2 列进行筛选，选择值 `2`

**数据：**
- 第 1 列（列索引 0）：包含值 `1`, `2`, `3`
- 第 2 列（列索引 1）：包含值 `2`, `3`, `4`

**预期结果：**
- 应该显示第 2 列中值为 `2` 的行（即第 1 行）
- 不应该显示第 1 列中值为 `2` 的行（即第 2 行）

**验证方法：**
1. 打开浏览器开发者工具的控制台
2. 对第 2 列进行筛选，选择值 `2`
3. 查看控制台日志：
   ```
   filterByChecked - 筛选条件映射: {
       filtersByColumn: [
           {列索引: 1, 筛选值: ['2']},
       ]
   }
   ```
4. 验证筛选结果是否正确

### 测试 2: 验证性能提升

**场景：** 对大量数据进行筛选

**步骤：**
1. 准备 10,000 行数据
2. 对某一列进行筛选
3. 观察筛选速度是否有明显提升

**预期：** 筛选速度应该比优化前快很多

### 测试 3: 验证多列筛选

**场景：** 同时对多列进行筛选

**步骤：**
1. 对第 1 列进行筛选，选择值 `A`
2. 对第 3 列进行筛选，选择值 `C`
3. 查看控制台日志：
   ```
   filterByChecked - 筛选条件映射: {
       filtersByColumn: [
           {列索引: 0, 筛选值: ['A']},
           {列索引: 2, 筛选值: ['C']},
       ]
   }
   ```
4. 验证筛选结果是否正确（只显示第 1 列为 `A` **且** 第 3 列为 `C` 的行）

---

## 技术细节

### 筛选条件的数据结构

**筛选条件数组：**
```javascript
sheet.config.filtered = [
    {c: 0, v: '值1'},  // 第 1 列筛选值 '值1'
    {c: 0, v: '值2'},  // 第 1 列筛选值 '值2'
    {c: 2, v: '值3'},  // 第 3 列筛选值 '值3'
]
```

**按列分组后的映射：**
```javascript
filtersByColumn = Map {
    0 => ['值1', '值2'],  // 第 1 列的筛选值
    2 => ['值3'],         // 第 3 列的筛选值
}
```

### 筛选逻辑的 AND/OR 关系

- **同一列内的多个筛选值：** OR 关系（满足任一即可）
- **不同列之间的筛选条件：** AND 关系（必须全部满足）

**示例：**
```javascript
// 筛选条件
filtersByColumn = Map {
    0 => ['A', 'B'],  // 第 1 列为 'A' 或 'B'
    2 => ['C'],       // 第 3 列为 'C'
}

// 匹配逻辑
(第1列 === 'A' OR 第1列 === 'B') AND (第3列 === 'C')
```

---

## 相关文件

### 修改的文件

1. **`src/hooks/sheet/hooks/useTools.js`**
   - Line 1797-1838: 优化 `filterByChecked` 函数
   - Line 1981-2012: 优化 `filterByCheckedSilent` 函数

### 相关文件（未修改）

- `src/components/AirSheetFilter.vue` - 筛选条件构建
- `src/components/AirSheet.vue` - 筛选确认处理

---

## 总结

1. ✅ **筛选逻辑验证**：筛选逻辑本身是正确的，只检查指定列的值，不会跨列匹配
2. ✅ **性能优化**：将 `filtersByColumn` 构建移到循环外部，减少 99.99% 的重复构建操作
3. ✅ **逻辑修复**：修复列索引无效时的处理逻辑
4. ✅ **调试增强**：添加调试日志，方便排查筛选问题

现在筛选功能应该能够正确工作，并且性能得到了显著提升。

