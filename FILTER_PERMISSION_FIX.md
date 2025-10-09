# 🔧 AirSheet 筛选功能权限问题修复

## 修复的问题

### 问题 1: 筛选时空数据行被错误地包含在结果中 ✅

**现象：**
当对某一列进行筛选时，该列中包含空值（null、undefined、空字符串）的行也被筛选出来显示。

**根本原因：**
在 `useTools.js` 的 `filterByCheckedSilent` 函数（line 2005-2007）中，代码明确包含了空行：

```javascript
// 如果是空行，直接包含在筛选结果中（筛选后添加行时不过滤空行）
if (isEmptyRow) {
    matchesAllColumns = true
}
```

这个特殊处理导致所有空行都被包含在筛选结果中，无论筛选条件是什么。

**修复方案：**
移除空行的特殊处理，让空行也参与正常的筛选逻辑。如果用户想要筛选空值，应该在筛选条件中明确选择空值。

**修改文件：** `src/hooks/sheet/hooks/useTools.js` (line 1993-2032)

---

### 问题 2: 筛选后的数据没有正确应用权限高亮和锁定 ✅

**现象：**
执行筛选操作后，筛选结果中的单元格没有显示权限高亮，也没有应用权限锁定。

**根本原因：**
权限范围函数（`getDeepPermissionRanges`、`getPermissionRanges`、`getSuperPermissionRanges`）返回的行号是**原始行号**，但在筛选状态下，UI 渲染使用的是**筛选后的行号**。

**示例：**
- 原始数据有 100 行
- 用户锁定了第 50 行
- 筛选后只显示 10 行，第 50 行在筛选结果中的索引是第 5 行
- 但权限高亮仍然显示在第 50 行的位置（超出了筛选结果的范围）

**修复方案：**
1. 在权限范围函数中检测筛选状态
2. 如果处于筛选状态，将原始行号转换为筛选后的行号
3. 如果某行不在筛选结果中，则不返回该行的权限范围

**修改文件：**
- `src/hooks/sheet/hooks/usePermissions.js` - `getDeepPermissionRanges()` (line 806-952)
- `src/hooks/sheet/hooks/usePermissions.js` - `getPermissionRanges()` (line 716-853)
- `src/hooks/sheet/hooks/useSuperPermissions.js` - `getSuperPermissionRanges()` (line 79-149)

---

## 修复详情

### 修复 1: 移除空行的特殊处理

**文件：** `src/hooks/sheet/hooks/useTools.js`
**位置：** line 1993-2032

**修改前：**
```javascript
let matchesAllColumns = true

// 检查是否为空行（筛选后添加行时需要包含空行）
let isEmptyRow = true
for (let i = 0; i < rowData.length; i++) {
    const cellValue = rowData[i]
    if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
        isEmptyRow = false
        break
    }
}

// 如果是空行，直接包含在筛选结果中（筛选后添加行时不过滤空行）
if (isEmptyRow) {
    matchesAllColumns = true
} else {
    // 非空行：检查每一列的筛选条件
    for (const [columnIndex, filterValues] of filtersByColumn) {
        // ... 筛选逻辑
    }
}
```

**修改后：**
```javascript
let matchesAllColumns = true

// ✅ 修复问题1: 移除空行的特殊处理，让空行也参与正常的筛选逻辑
// 检查每一列的筛选条件
for (const [columnIndex, filterValues] of filtersByColumn) {
    // ... 筛选逻辑
}
```

---

### 修复 2: 权限范围函数支持筛选状态

#### 2.1 修复 `getDeepPermissionRanges()` - 深度权限

**文件：** `src/hooks/sheet/hooks/usePermissions.js`
**位置：** line 806-952

**核心修改：**

1. **检测筛选状态并构建行号映射：**
```javascript
// ✅ 修复问题2: 检测筛选状态，构建行号映射
const isFiltered = sheet.config.filtered && sheet.config.filtered.length > 0
const rowMapping = new Map() // 原始行号 -> 筛选后行号

if (isFiltered && sheet.rowMapping && Array.isArray(sheet.rowMapping)) {
    sheet.rowMapping.forEach((item) => {
        rowMapping.set(item.originalIndex, item.filteredIndex)
    })
}
```

2. **行级权限转换：**
```javascript
if (type === 'row') {
    targets.forEach((originalRow) => {
        // ✅ 修复问题2: 在筛选状态下，转换原始行号为筛选后行号
        if (isFiltered) {
            const filteredRow = rowMapping.get(originalRow)
            // 如果该行不在筛选结果中，跳过
            if (filteredRow === undefined) {
                return
            }
            ranges.push({
                r: filteredRow,
                c: 0,
                rr: filteredRow,
                cc: sheet.config.colCount - 1,
                type: 'row',
                userId,
                userName,
                originalRow, // 保留原始行号，用于调试
            })
        } else {
            ranges.push({
                r: originalRow,
                c: 0,
                rr: originalRow,
                cc: sheet.config.colCount - 1,
                type: 'row',
                userId,
                userName,
            })
        }
    })
}
```

3. **列级权限调整：**
```javascript
else if (type === 'column') {
    // ✅ 修复问题2: 列级权限不需要转换（列号在筛选前后保持不变）
    // 但需要调整行范围以匹配筛选后的行数
    targets.forEach((col) => {
        const maxRow = isFiltered
            ? sheet.filterCellData.size - 1
            : sheet.config.rowCount - 1
        ranges.push({
            r: 0,
            c: col,
            rr: maxRow,
            cc: col,
            type: 'column',
            userId,
            userName,
        })
    })
}
```

4. **单元格级权限转换：**
```javascript
else if (type === 'cell') {
    targets.forEach((cell) => {
        const originalRow = cell.row
        // ✅ 修复问题2: 在筛选状态下，转换原始行号为筛选后行号
        if (isFiltered) {
            const filteredRow = rowMapping.get(originalRow)
            // 如果该行不在筛选结果中，跳过
            if (filteredRow === undefined) {
                return
            }
            ranges.push({
                r: filteredRow,
                c: cell.col,
                rr: filteredRow,
                cc: cell.col,
                type: 'cell',
                userId,
                userName,
                originalRow, // 保留原始行号，用于调试
            })
        } else {
            ranges.push({
                r: originalRow,
                c: cell.col,
                rr: originalRow,
                cc: cell.col,
                type: 'cell',
                userId,
                userName,
            })
        }
    })
}
```

#### 2.2 修复 `getPermissionRanges()` - 临时权限

**文件：** `src/hooks/sheet/hooks/usePermissions.js`
**位置：** line 716-853

**修改内容：** 与 `getDeepPermissionRanges()` 相同的逻辑

#### 2.3 修复 `getSuperPermissionRanges()` - 超级权限

**文件：** `src/hooks/sheet/hooks/useSuperPermissions.js`
**位置：** line 79-149

**核心修改：**

超级权限的范围可能跨越多行，需要特殊处理：

```javascript
// ✅ 修复问题2: 在筛选状态下，转换行号并过滤不可见的权限
const filteredPermissions = []

for (const permission of validPermissions) {
    const {r, rr, c, cc, v} = permission

    // 检查权限范围是否与筛选结果有交集
    let hasVisibleRows = false
    let minFilteredRow = Infinity
    let maxFilteredRow = -Infinity

    // 遍历权限范围内的所有行，找出在筛选结果中可见的行
    for (let row = r; row <= rr; row++) {
        const filteredRow = rowMapping.get(row)
        if (filteredRow !== undefined) {
            hasVisibleRows = true
            minFilteredRow = Math.min(minFilteredRow, filteredRow)
            maxFilteredRow = Math.max(maxFilteredRow, filteredRow)
        }
    }

    // 如果有可见的行，添加转换后的权限范围
    if (hasVisibleRows) {
        filteredPermissions.push({
            r: minFilteredRow,
            rr: maxFilteredRow,
            c,
            cc,
            v,
            originalR: r, // 保留原始行号，用于调试
            originalRr: rr,
        })
    }
}

return filteredPermissions
```

---

## 修复效果

### 预期行为

1. ✅ **筛选时正确排除空数据行**
   - 空行不会自动包含在筛选结果中
   - 只有符合筛选条件的行才会显示

2. ✅ **筛选后的数据正确显示权限高亮**
   - 行级权限：原始行号转换为筛选后行号
   - 列级权限：列号保持不变，行范围调整为筛选后的行数
   - 单元格级权限：原始行号转换为筛选后行号
   - 超级权限：范围内的可见行合并为新的范围

3. ✅ **筛选后的数据正确应用权限锁定**
   - 被锁定的单元格/行/列在筛选结果中仍然保持锁定状态
   - 其他用户无法编辑被锁定的区域

4. ✅ **权限高亮的层级关系保持正确**
   - `superPermissions` (z-index: 1) - 最底层
   - `deepPermissions` (z-index: 2) - 中间层
   - `permissions` (z-index: 2) - 中间层

---

## 测试步骤

### 测试 1: 筛选排除空行

1. 在第 1 列填入一些数据，留一些行为空
2. 对第 1 列进行筛选，选择某个非空值
3. **预期**：筛选结果中不包含空行

### 测试 2: 筛选后的行级权限高亮

1. 用户 A 编辑第 10 行（`auth = 1`）
2. 对某一列进行筛选，筛选结果包含第 10 行
3. **预期**：用户 B 在筛选结果中看到第 10 行的高亮（位置正确）
4. **预期**：用户 B 尝试编辑第 10 行时，看到"该行已被 A 锁定"的提示

### 测试 3: 筛选后的列级权限高亮

1. 用户 A 编辑第 3 列（`auth = 2`）
2. 对某一列进行筛选
3. **预期**：用户 B 在筛选结果中看到第 3 列的高亮（整列高亮）
4. **预期**：用户 B 尝试编辑第 3 列时，看到"该列已被 A 锁定"的提示

### 测试 4: 筛选后的单元格级权限高亮

1. 用户 A 编辑单元格 (10, 3)（`auth = 3`）
2. 对某一列进行筛选，筛选结果包含第 10 行
3. **预期**：用户 B 在筛选结果中看到单元格 (10, 3) 的高亮（位置正确）
4. **预期**：用户 B 尝试编辑该单元格时，看到"该单元格已被 A 锁定"的提示

### 测试 5: 筛选后的超级权限高亮

1. 设置超级权限保护区域 (5-15 行, 2-4 列)
2. 对某一列进行筛选，筛选结果包含第 5-15 行中的部分行
3. **预期**：筛选结果中显示超级权限的高亮（只显示可见行的范围）
4. **预期**：用户尝试编辑该区域时，看到"该区域受保护"的提示

---

## 技术细节

### 行号映射机制

**数据结构：**
```javascript
sheet.rowMapping = [
    {filteredIndex: 0, originalIndex: 5},
    {filteredIndex: 1, originalIndex: 10},
    {filteredIndex: 2, originalIndex: 15},
    // ...
]
```

**转换逻辑：**
```javascript
const rowMapping = new Map() // 原始行号 -> 筛选后行号
sheet.rowMapping.forEach((item) => {
    rowMapping.set(item.originalIndex, item.filteredIndex)
})

// 使用
const filteredRow = rowMapping.get(originalRow)
if (filteredRow === undefined) {
    // 该行不在筛选结果中
}
```

### 列级权限的特殊处理

列级权限不需要转换列号（列号在筛选前后保持不变），但需要调整行范围：

```javascript
const maxRow = isFiltered
    ? sheet.filterCellData.size - 1  // 筛选后的行数
    : sheet.config.rowCount - 1      // 原始行数
```

### 超级权限的范围合并

超级权限可能跨越多行，需要找出范围内所有可见的行，然后合并为新的范围：

```javascript
let minFilteredRow = Infinity
let maxFilteredRow = -Infinity

for (let row = r; row <= rr; row++) {
    const filteredRow = rowMapping.get(row)
    if (filteredRow !== undefined) {
        minFilteredRow = Math.min(minFilteredRow, filteredRow)
        maxFilteredRow = Math.max(maxFilteredRow, filteredRow)
    }
}

// 新的范围: [minFilteredRow, maxFilteredRow]
```

---

## 总结

通过修复筛选逻辑和权限范围函数，成功解决了筛选功能的两个问题：
1. 空行不再自动包含在筛选结果中
2. 权限高亮和锁定在筛选状态下正确工作

现在用户可以正常使用筛选功能，同时权限系统也能正确保护数据。

