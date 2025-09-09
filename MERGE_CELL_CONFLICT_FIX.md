# 合并单元格冲突修复

## 问题描述

在合并单元格的时候，如果在当前单元格进行多次合并，之前的合并没有被取消。比如合并了4个单元格，然后扩大合并成8个单元格，之前的4个单元格还处于合并状态，和扩大的8个单元格合并冲突。

## 问题根因分析

### 1. 属性名错误
在 `useMerge.js` 的 `setMerge` 方法中，使用了错误的属性名：
```javascript
// 错误的代码
mergedCells.delete(`${otherMerge.row}-${otherMerge.col}`)
```
但是 `findMergedCell` 方法返回的对象使用的是 `r` 和 `c` 属性，不是 `row` 和 `col`。

### 2. 边界判断错误
在 `findMergedCell` 方法中，边界判断使用了 `<=` 而不是 `<`：
```javascript
// 错误的边界判断
if (r >= mergedRow && r <= mergedRow + value.rs)
```
这会导致边界单元格被错误地判断为在合并范围内。

### 3. 冲突检测不完整
原来的冲突检测逻辑只检查新区域内的单元格，没有检查与新区域有交集的其他合并单元格。

### 4. 方法名错误
在 `useCopy.js` 中调用了不存在的方法 `setMergeCell`，应该是 `setMerge`。

## 修复方案

### 1. 修复属性名错误
```javascript
// 修复前
mergedCells.delete(`${otherMerge.row}-${otherMerge.col}`)

// 修复后
mergedCells.delete(`${otherMerge.r}-${otherMerge.c}`)
```

### 2. 修复边界判断
```javascript
// 修复前
if (r >= mergedRow && r <= mergedRow + value.rs)

// 修复后
if (r >= mergedRow && r < mergedRow + value.rs)
```

### 3. 增强冲突检测逻辑
重新设计了 `setMerge` 方法，使用更完善的冲突检测算法：

```javascript
// 清理所有与新合并区域有冲突的现有合并单元格
const conflictingMerges = new Set()

// 1. 检查新区域内的每个单元格
for (let i = r; i < r + rs; i++) {
    for (let j = c; j < c + cs; j++) {
        const otherMerge = findMergedCell(i, j)
        if (otherMerge) {
            conflictingMerges.add(`${otherMerge.r}-${otherMerge.c}`)
        }
    }
}

// 2. 检查是否有其他合并单元格与新区域有交集
for (const [mergeKey, mergeValue] of mergedCells.entries()) {
    const [mergeR, mergeC] = mergeKey.split('-').map(Number)
    const mergeEndR = mergeR + mergeValue.rs
    const mergeEndC = mergeC + mergeValue.cs
    const newEndR = r + rs
    const newEndC = c + cs

    // 使用交集算法检查是否有重叠
    if (!(mergeEndR <= r || mergeR >= newEndR || mergeEndC <= c || mergeC >= newEndC)) {
        conflictingMerges.add(mergeKey)
    }
}

// 3. 删除所有冲突的合并单元格
conflictingMerges.forEach(key => {
    mergedCells.delete(key)
})
```

### 4. 修复方法名错误
```javascript
// 修复前
sheet.hooks.mergeHook.setMergeCell(merge.r, merge.c, merge.rs, merge.cs)

// 修复后
sheet.hooks.mergeHook.setMerge(merge.r, merge.c, merge.rs, merge.cs)
```

## 修复的关键技术点

### 1. 交集检测算法
使用矩形交集算法来检测两个合并区域是否有重叠：
```javascript
// 两个矩形不相交的条件：
// 1. A的右边界 <= B的左边界
// 2. A的左边界 >= B的右边界  
// 3. A的下边界 <= B的上边界
// 4. A的上边界 >= B的下边界

// 如果以上任一条件成立，则两个矩形不相交
// 否则，两个矩形相交
if (!(mergeEndR <= r || mergeR >= newEndR || mergeEndC <= c || mergeC >= newEndC)) {
    // 有交集，需要清理冲突
}
```

### 2. 使用 Set 避免重复操作
使用 `Set` 数据结构来记录冲突的合并单元格，避免重复删除：
```javascript
const conflictingMerges = new Set()
// ... 收集冲突
conflictingMerges.forEach(key => {
    mergedCells.delete(key)
})
```

### 3. 边界条件处理
正确处理边界条件，确保合并区域的边界判断准确：
```javascript
// 合并区域：[startRow, startRow + rs) × [startCol, startCol + cs)
// 使用左闭右开区间，避免边界重复
```

## 测试场景

### 场景1：扩大现有合并区域
1. 合并A1:B2（2x2区域）
2. 扩大合并为A1:C3（3x3区域）
3. ✅ 原来的2x2合并被自动清理，新的3x3合并成功

### 场景2：重叠合并区域
1. 合并A1:B2区域
2. 合并C2:D3区域  
3. 合并B1:C3区域（与前两个有重叠）
4. ✅ 所有冲突的合并都被清理，新合并成功

### 场景3：相同位置重复合并
1. 合并A1:B2区域
2. 再次选择A1:B2并点击合并
3. ✅ 合并被取消，恢复为独立单元格

## 性能优化

### 1. 减少重复操作
使用 `Set` 数据结构避免重复删除同一个合并单元格。

### 2. 早期返回
对于相同位置相同大小的合并操作，直接返回，避免不必要的处理。

### 3. 批量操作
将所有冲突检测完成后，批量删除冲突的合并单元格。

## 影响范围

### 直接影响
- 修复了合并单元格冲突问题
- 确保合并操作的正确性和一致性
- 修复了复制粘贴中的合并单元格处理

### 间接影响
- 提高了合并单元格操作的可靠性
- 改善了用户体验，避免合并状态混乱
- 为后续的合并单元格功能提供了稳定的基础

## 验证要点

1. **冲突清理**：所有与新合并区域有冲突的旧合并都被正确清理
2. **边界准确**：合并区域的边界判断准确，不会误判
3. **属性正确**：使用正确的属性名访问合并单元格信息
4. **交集检测**：能够检测到所有可能的区域重叠情况
5. **状态一致**：合并状态与实际显示完全一致
6. **方法调用**：所有合并相关的方法调用都使用正确的方法名

## 总结

这次修复解决了合并单元格操作中的多个关键问题，通过完善的冲突检测算法和正确的边界判断，确保了合并单元格功能的稳定性和可靠性。用户现在可以安全地进行各种合并操作，包括扩大合并区域、重叠合并等复杂场景，而不会出现合并冲突或状态不一致的问题。
