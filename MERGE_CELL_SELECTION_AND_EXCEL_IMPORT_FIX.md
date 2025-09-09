# 合并单元格选择和Excel导入修复

## 问题描述

### 问题1：合并单元格选择计算错误
点击框选的时候合并单元格计算多了一行一列，选择范围与实际合并范围不一致。

### 问题2：Excel导入后滚动渲染失效
导入Excel完成之后滚动可视区域没有渲染sheet。比如原来有5万条数据，导入的数据只有50条，然后在滚动的时候下面的单元格不会渲染了。

## 问题根因分析

### 问题1根因：属性名错误
在多个文件中使用了错误的合并单元格属性名：
- 使用了 `rowspan`、`colspan` 而不是 `rs`、`cs`
- 使用了 `row`、`col` 而不是 `r`、`c`
- 使用了错误的hook名称 `mergedCellsHook` 而不是 `mergeHook`

### 问题2根因：配置未更新
Excel导入时获取了文件的行列数，但没有更新 `sheet.config.rowCount` 和 `sheet.config.colCount`，导致表格认为只有原来的行列数。

## 修复方案

### 1. 修复 useSelectionRange.js 中的属性名错误

#### setRange 方法修复
```javascript
// 修复前
if (mc && !force) {
    ranged.value = {
        r: mc.r,
        c: mc.c,
        rr: mc.r + mc.rowspan - 1,  // ❌ 错误属性名
        cc: mc.c + mc.colspan - 1,  // ❌ 错误属性名
    }
}

// 修复后
if (mc && !force) {
    ranged.value = {
        r: mc.r,
        c: mc.c,
        rr: mc.r + mc.rs - 1,  // ✅ 正确属性名
        cc: mc.c + mc.cs - 1,  // ✅ 正确属性名
    }
}
```

#### getStartCell 方法修复
```javascript
// 修复前
if (mergedCell) {
    return {
        r: mergedCell.row,  // ❌ 错误属性名
        c: mergedCell.col,  // ❌ 错误属性名
        mergedCell,
    }
}

// 修复后
if (mergedCell) {
    return {
        r: mergedCell.r,  // ✅ 正确属性名
        c: mergedCell.c,  // ✅ 正确属性名
        mergedCell,
    }
}
```

#### getEndCell 方法修复
```javascript
// 修复前
const mergedCell = sheet.hooks.mergedCellsHook.findMergedCell?.(rr, cc)  // ❌ 错误hook名
if (mergedCell) {
    return {
        row: mergedCell.row + mergedCell.rowspan - 1,  // ❌ 错误属性名
        col: mergedCell.col + mergedCell.colspan - 1,  // ❌ 错误属性名
        mergedCell,
    }
}
return end  // ❌ 未定义变量

// 修复后
const mergedCell = sheet.hooks.mergeHook.findMergedCell?.(rr, cc)  // ✅ 正确hook名
if (mergedCell) {
    return {
        row: mergedCell.r + mergedCell.rs - 1,  // ✅ 正确属性名
        col: mergedCell.c + mergedCell.cs - 1,  // ✅ 正确属性名
        mergedCell,
    }
}
return {r: rr, c: cc}  // ✅ 正确返回值
```

### 2. 修复 render.worker.js 中的属性名错误

```javascript
// 修复前
const { rowspan, colspan } = mergedCells[key]  // ❌ 错误属性名

if (col < startCol && col + colspan > startCol) {  // ❌ 使用错误属性
    expandedStartCol = Math.min(expandedStartCol, col)
}

// 修复后
const { rs, cs } = mergedCells[key]  // ✅ 正确属性名

if (col < startCol && col + cs > startCol) {  // ✅ 使用正确属性
    expandedStartCol = Math.min(expandedStartCol, col)
}
```

### 3. 修复 useExcel.js 中的配置更新

```javascript
// 修复前（缺少配置更新）
// 分批处理数据
await processBatch(worksheet, rowCount, colCount, startRow, startCol)

sheet.hooks.selectionRangeHook.setRange(0, 0, 0, 0)

// 修复后（添加配置更新）
// 分批处理数据
await processBatch(worksheet, rowCount, colCount, startRow, startCol)

// 更新表格的行列数配置
sheet.config.rowCount = Math.max(sheet.config.rowCount, rowCount)
sheet.config.colCount = Math.max(sheet.config.colCount, colCount)

sheet.hooks.selectionRangeHook.setRange(0, 0, 0, 0)
```

## 合并单元格属性系统规范

### 标准属性命名
```javascript
// 合并单元格对象的标准属性：
const mergedCell = {
    r: 0,    // 起始行 (row)
    c: 0,    // 起始列 (column)
    rs: 3,   // 行跨度 (row span)
    cs: 2    // 列跨度 (column span)
}

// ❌ 错误的属性名（不要使用）：
// row, col, rowspan, colspan

// ✅ 正确的属性名（统一使用）：
// r, c, rs, cs
```

### Hook命名规范
```javascript
// ✅ 正确的hook名称
sheet.hooks.mergeHook.findMergedCell(r, c)
sheet.hooks.mergeHook.setMerge(r, c, rs, cs)

// ❌ 错误的hook名称（不存在）
sheet.hooks.mergedCellsHook.findMergedCell(r, c)
```

## 修复效果

### 合并单元格选择修复
- **选择精度**：合并单元格的选择范围与实际合并范围完全一致
- **属性一致性**：所有合并单元格相关代码使用统一的属性名
- **交互正确性**：点击合并单元格时选择范围计算准确

### Excel导入滚动修复
- **配置同步**：表格的行列数配置与实际数据范围保持同步
- **滚动渲染**：Excel导入后滚动到任意位置都能正常渲染单元格
- **兼容性**：使用 `Math.max` 确保不会缩小现有表格尺寸

## 测试场景

### 合并单元格选择测试
1. **基本选择测试**：创建3x3合并单元格，点击验证选择范围
2. **编程式选择测试**：使用 `setRange` 方法测试选择计算
3. **边界测试**：测试各种尺寸的合并单元格选择

### Excel导入滚动测试
1. **小文件导入测试**：50行数据导入到5万行表格
2. **大文件导入测试**：1000行数据导入到空白表格
3. **滚动渲染测试**：验证各个位置的渲染效果

## 验证要点

1. **选择精度**：合并单元格选择范围与实际范围一致
2. **属性统一**：所有代码使用统一的属性命名规范
3. **滚动正常**：Excel导入后滚动渲染功能正常
4. **配置正确**：表格配置与实际数据范围同步
5. **性能稳定**：修复不影响原有性能表现

## 影响范围

### 直接影响
- 修复了合并单元格选择计算错误
- 修复了Excel导入后滚动渲染失效
- 统一了合并单元格属性命名规范

### 间接影响
- 提高了合并单元格功能的可靠性
- 改善了Excel导入导出的用户体验
- 为后续开发提供了统一的属性规范

## 总结

这次修复解决了两个关键问题：
1. **合并单元格选择精度问题**：通过修复属性名错误，确保选择范围计算准确
2. **Excel导入滚动渲染问题**：通过更新表格配置，确保滚动渲染功能正常

修复涉及了多个文件中的属性命名统一，建立了标准的合并单元格属性系统，提高了整个合并单元格功能的稳定性和一致性。
