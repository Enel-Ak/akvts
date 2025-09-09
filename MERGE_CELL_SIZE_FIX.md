# 合并单元格尺寸显示修复

## 问题描述

合并单元格显示的宽和高少了一行一列，rs和cs的问题。比如合并了3x3的单元格，实际合并的单元格显示只有2x2，但是点击选中的时候还是3x3。

## 问题根因分析

### 1. getCellStyle 中的循环边界错误
在 `useMerge.js` 的 `getCellStyle` 方法中，计算合并单元格尺寸时使用了错误的循环边界：

```javascript
// 错误的代码
for (let i = cell.r; i <= cell.r + rs; i++) {  // ❌ 使用了 <=
    rh += sheet.hooks.resizeHook.getRowHeight(i)
}
for (let i = cell.c; i <= cell.c + cs; i++) {  // ❌ 使用了 <=
    cw += sheet.hooks.resizeHook.getColWidth(i)
}
```

这会导致多计算一行和一列的尺寸。

### 2. setMerge 参数计算错误
在 `useTools.js` 的 `setMerge` 方法中，传递给合并方法的参数计算错误：

```javascript
// 错误的代码
sheet.hooks.mergeHook.setMerge(r, c, rr - r, cc - c)  // ❌ 少了1
```

如果选择范围是从 `(0,0)` 到 `(2,2)`，那么应该跨越 3 行 3 列，但 `rr - r = 2 - 0 = 2`，少了1。

### 3. Excel 导入时的尺寸计算错误
在 `useExcel.js` 中，处理 Excel 合并单元格时的尺寸计算错误：

```javascript
// 错误的代码
const rowspan = merge.bottom - merge.top      // ❌ 少了1
const colspan = merge.right - merge.left     // ❌ 少了1
```

## 修复方案

### 1. 修复 getCellStyle 中的循环边界
**文件**: `src/hooks/sheet/hooks/useMerge.js`

```javascript
// 修复前
for (let i = cell.r; i <= cell.r + rs; i++) {
    rh += sheet.hooks.resizeHook.getRowHeight(i)
}
for (let i = cell.c; i <= cell.c + cs; i++) {
    cw += sheet.hooks.resizeHook.getColWidth(i)
}

// 修复后
for (let i = cell.r; i < cell.r + rs; i++) {   // ✅ 使用 <
    rh += sheet.hooks.resizeHook.getRowHeight(i)
}
for (let i = cell.c; i < cell.c + cs; i++) {   // ✅ 使用 <
    cw += sheet.hooks.resizeHook.getColWidth(i)
}
```

### 2. 修复 setMerge 参数计算
**文件**: `src/hooks/sheet/hooks/useTools.js`

```javascript
// 修复前
sheet.hooks.mergeHook.setMerge(r, c, rr - r, cc - c)

// 修复后
sheet.hooks.mergeHook.setMerge(r, c, rr - r + 1, cc - c + 1)  // ✅ 加上1
```

### 3. 修复 Excel 导入时的尺寸计算
**文件**: `src/hooks/sheet/hooks/useExcel.js`

```javascript
// 修复前
const rowspan = merge.bottom - merge.top
const colspan = merge.right - merge.left

// 修复后
const rowspan = merge.bottom - merge.top + 1  // ✅ 加上1
const colspan = merge.right - merge.left + 1  // ✅ 加上1
```

## 技术细节

### 合并单元格的坐标系统
```javascript
// 合并单元格的定义：
// - 起始位置：(r, c)
// - 跨越行数：rs (row span)
// - 跨越列数：cs (column span)
// - 覆盖范围：行 [r, r+rs)，列 [c, c+cs)  // 左闭右开区间

// 示例：从(1,1)开始的3x2合并单元格
// - 起始位置：(1, 1)
// - rs = 3, cs = 2
// - 覆盖行：1, 2, 3
// - 覆盖列：1, 2
// - 覆盖单元格：(1,1), (1,2), (2,1), (2,2), (3,1), (3,2)
```

### 选择范围到合并参数的转换
```javascript
// 选择范围：从 (r, c) 到 (rr, cc)  // 包含边界
// 合并参数：起始位置 (r, c)，跨度 (rs, cs)
// 转换公式：
// rs = rr - r + 1  // 行跨度
// cs = cc - c + 1  // 列跨度

// 示例：选择 A1:C3 (即 (0,0) 到 (2,2))
// rs = 2 - 0 + 1 = 3  // 跨越3行
// cs = 2 - 0 + 1 = 3  // 跨越3列
```

### 尺寸计算公式
```javascript
// 正确的尺寸计算：
let totalHeight = 0
for (let i = startRow; i < startRow + rowSpan; i++) {  // 左闭右开
    totalHeight += getRowHeight(i)
}

let totalWidth = 0  
for (let i = startCol; i < startCol + colSpan; i++) {  // 左闭右开
    totalWidth += getColWidth(i)
}
```

## 测试场景

### 1. 基本合并测试
- 选择2x2区域合并，验证显示尺寸正确
- 选择3x3区域合并，验证显示尺寸正确
- 选择4x2区域合并，验证显示尺寸正确

### 2. 边界情况测试
- 单行多列合并（如A1:E1）
- 单列多行合并（如A1:A5）
- 大区域合并（如A1:F6）

### 3. Excel 导入导出测试
- 导入包含合并单元格的Excel文件
- 验证合并单元格尺寸正确
- 导出后再导入，验证一致性

### 4. 交互一致性测试
- 点击合并单元格，验证选中范围与显示范围一致
- 编辑合并单元格内容，验证功能正常
- 取消合并，验证各单元格独立可编辑

## 修复效果

### 修复前
- 3x3合并显示为2x2
- 4x2合并显示为3x1
- Excel导入的合并单元格尺寸错误
- 视觉显示与实际选择范围不一致

### 修复后
- 3x3合并正确显示为3x3
- 4x2合并正确显示为4x2
- Excel导入的合并单元格尺寸正确
- 视觉显示与实际选择范围完全一致

## 验证要点

1. **视觉一致性**：合并单元格的显示尺寸与选择范围完全一致
2. **边界准确性**：合并单元格的边界精确覆盖所选区域
3. **交互一致性**：点击合并单元格时的选中范围与显示范围一致
4. **导入导出一致性**：Excel导入导出的合并单元格尺寸保持一致
5. **编辑功能正常**：合并单元格的内容编辑功能正常工作

## 总结

这次修复解决了合并单元格显示尺寸不正确的问题，确保了：
- 合并单元格的视觉显示与实际选择范围完全一致
- Excel导入导出功能中的合并单元格处理正确
- 所有合并相关的交互功能都能正常工作

修复涉及了三个关键文件中的尺寸计算逻辑，使用了正确的左闭右开区间概念，确保了合并单元格功能的准确性和一致性。
