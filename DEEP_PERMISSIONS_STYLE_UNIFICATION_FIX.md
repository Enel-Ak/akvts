# 修复：统一 deepPermissions 锁定样式

## 问题描述

**背景：** `auth=3`（单元格级权限）的 `deepPermissions` 锁定样式与 `auth=1`（行级权限）和 `auth=2`（列级权限）不一致。

**当前问题：**
- `auth=1` 和 `auth=2`：使用虚线边框（dashed）+ 半透明背景
- `auth=3`：使用实线边框（solid，通过 box-shadow 实现）+ opacity

**需求：** 统一所有权限等级的样式，使 `auth=3` 也使用虚线边框。

---

## 修复方案

### 修复 1：统一 JavaScript 样式逻辑

**文件：** `src/components/AirSheet.vue`

**位置：** Line 2864-2871

**修改前：**
```javascript
// ✅ 修复: 行级和列级权限使用半透明背景色，让 CSS 的伪元素虚线边框生效
if (range.type === 'row' || range.type === 'column') {
    // 行级和列级权限：使用半透明背景色（10% 透明度）
    style.backgroundColor = `${permissionColor}1A` // 1A = 10% 透明度
    style.opacity = 1 // 不使用 opacity，直接在背景色中设置透明度
} else {
    // 单元格级权限：使用 box-shadow 实现实线边框（1px）
    style.boxShadow = `inset 0 0 0 1px ${permissionColor}`
    style.opacity = 0.3 // 使用 opacity
}

return style
```

**修改后：**
```javascript
// ✅ 修复: 统一所有权限等级的样式（auth=1, 2, 3 都使用虚线边框）
// 所有权限类型：使用半透明背景色（10% 透明度），让 CSS 的伪元素虚线边框生效
style.backgroundColor = `${permissionColor}1A` // 1A = 10% 透明度
style.opacity = 1 // 不使用 opacity，直接在背景色中设置透明度
// 移除 box-shadow，让 CSS 的伪元素虚线边框生效
delete style.boxShadow

return style
```

**说明：**
- 移除了 `if-else` 判断，所有权限类型都使用相同的样式
- 使用半透明背景色（`${permissionColor}1A`），不使用 `opacity`
- 删除 `box-shadow`，让 CSS 的伪元素虚线边框生效

---

### 修复 2：统一 CSS 样式

**文件：** `src/styles/components/air-sheet.scss`

**位置：** Line 681-704

**修改前：**
```scss
// 单元格级权限高亮样式
&[data-permission-type='cell'] {
    // 实线边框 + 半透明背景（与行级、列级保持一致）
    border: 1px solid var(--z-highlight-color) !important;
    background-color: rgba(var(--z-highlight-color-rgb), 0.1) !important;

    .label {
        &::before {
            content: '🔒 ';
        }
    }
}
```

**修改后：**
```scss
// 单元格级权限高亮样式
&[data-permission-type='cell'] {
    // ✅ 修复: 改为虚线边框 + 半透明背景（与行级、列级保持一致）
    background: rgba(var(--z-highlight-color-rgb), 0.1);

    // 使用伪元素实现虚线边框效果
    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border: 1px dashed var(--permission-color, var(--z-highlight-color));
        pointer-events: none;
        z-index: 1;
    }

    .label {
        &::before {
            content: '🔒 ';
        }
    }
}
```

**说明：**
- 移除了实线边框（`border: 1px solid`）
- 添加了伪元素 `&::before` 来实现虚线边框（`border: 1px dashed`）
- 使用 CSS 变量 `--permission-color` 来动态设置边框颜色
- 与行级和列级权限的样式完全一致

---

## 修复效果

### 修复前

- ✅ `auth=1`（行级权限）：虚线边框 + 半透明背景
- ✅ `auth=2`（列级权限）：虚线边框 + 半透明背景
- ❌ `auth=3`（单元格级权限）：实线边框 + opacity

### 修复后

- ✅ `auth=1`（行级权限）：虚线边框 + 半透明背景
- ✅ `auth=2`（列级权限）：虚线边框 + 半透明背景
- ✅ `auth=3`（单元格级权限）：虚线边框 + 半透明背景

---

## 样式一致性

### 边框样式
- **所有权限等级**：1px 虚线边框（dashed）
- **实现方式**：CSS 伪元素 `&::before`
- **颜色**：使用 CSS 变量 `--permission-color`（基于用户 ID 生成的随机颜色）

### 背景样式
- **所有权限等级**：半透明背景（10% 透明度）
- **实现方式**：`backgroundColor = ${permissionColor}1A`
- **不使用 opacity**：直接在背景色中设置透明度

### 颜色方案
- **随机颜色生成**：基于用户 ID 的哈希值生成一致的颜色
- **颜色池**：9 种预定义的 HSL 颜色
- **一致性**：同一用户在会话期间始终使用相同颜色

---

## 测试验证

### 测试场景

1. **测试 auth=1（行级权限）**
   - 锁定某一行
   - 验证边框是否为虚线
   - 验证背景是否为半透明

2. **测试 auth=2（列级权限）**
   - 锁定某一列
   - 验证边框是否为虚线
   - 验证背景是否为半透明

3. **测试 auth=3（单元格级权限）**
   - 锁定某个单元格
   - 验证边框是否为虚线（修复后）
   - 验证背景是否为半透明（修复后）

4. **测试多用户锁定**
   - 多个用户锁定不同区域
   - 验证每个用户的锁定区域有唯一的颜色
   - 验证所有锁定区域的样式一致

---

## 技术细节

### CSS 伪元素实现虚线边框

**为什么使用伪元素？**
- 避免边框重叠时变厚
- 可以独立控制边框的 z-index
- 不影响元素本身的布局

**实现方式：**
```scss
&::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 1px dashed var(--permission-color, var(--z-highlight-color));
    pointer-events: none;
    z-index: 1;
}
```

### 颜色生成逻辑

**位置：** `src/components/AirSheet.vue` Line 2813-2834

**实现方式：**
```javascript
const generatePermissionColor = (userId) => {
    const colors = [
        'hsl(0, 75%, 55%)',   // 红色
        'hsl(30, 75%, 55%)',  // 橙色
        'hsl(60, 75%, 55%)',  // 黄色
        'hsl(120, 75%, 45%)', // 绿色
        'hsl(180, 75%, 45%)', // 青色
        'hsl(270, 75%, 55%)', // 紫色
        'hsl(300, 75%, 55%)', // 粉色
        'hsl(330, 75%, 55%)', // 玫红
        'hsl(45, 75%, 50%)',  // 金色
    ]

    let hash = 0
    const userIdStr = String(userId || index)
    for (let i = 0; i < userIdStr.length; i++) {
        hash = userIdStr.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colorIndex = Math.abs(hash) % colors.length

    return colors[colorIndex]
}
```

**特点：**
- 基于用户 ID 的哈希值生成颜色索引
- 同一用户始终生成相同的颜色
- 9 种预定义的 HSL 颜色，确保颜色鲜明且易于区分

---

## 总结

本次修复统一了所有权限等级（auth=1, 2, 3）的 `deepPermissions` 锁定样式：

1. ✅ **边框样式统一**：所有权限等级都使用虚线边框（dashed）
2. ✅ **背景样式统一**：所有权限等级都使用半透明背景（10% 透明度）
3. ✅ **颜色方案统一**：基于用户 ID 生成一致的随机颜色
4. ✅ **实现方式统一**：使用 CSS 伪元素实现虚线边框

**修改的文件：**
- `src/components/AirSheet.vue`：统一 JavaScript 样式逻辑
- `src/styles/components/air-sheet.scss`：统一 CSS 样式

**预期效果：**
- 所有权限等级的锁定样式完全一致
- 不同用户的锁定区域可以通过颜色清晰区分
- 样式简洁、统一、易于维护

