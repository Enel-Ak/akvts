# 优化：auth=0 时不显示锁图标

## 🎯 需求

当 `sheet.config.auth === 0`（无权限模式）时：
- ✅ 显示用户高亮框
- ✅ 显示用户名
- ❌ **不显示锁图标**（🔒）

当 `sheet.config.auth > 0`（有权限模式）时：
- ✅ 显示用户高亮框
- ✅ 显示用户名
- ✅ **显示锁图标**（🔒）

## 🔍 问题分析

### 当前行为
无论 `auth` 值如何，所有高亮框的用户名前都会显示锁图标 🔒。

### 原因
样式文件中，所有权限类型（`row`、`column`、`cell`）的 `.label::before` 都设置了 `content: '🔒 '`，没有区分是否需要锁定。

## ✅ 解决方案

### 方案概述
1. 在 `updatePermissions` 中为 `auth=0` 的权限记录添加 `noLock: true` 标记（已完成）
2. 在 HTML 中添加 `data-no-lock` 属性
3. 在 CSS 中根据 `data-no-lock` 属性隐藏锁图标

### 修改 1：添加 `data-no-lock` 属性

**文件**: `src/components/AirSheet.vue`  
**位置**: 第 3830-3840 行

```vue
<!-- 高亮在线 -->
<div
    :key="`${updateTimer + index}`"
    v-for="(item, index) of sheet.config?.online"
    class="highlight"
    :data-permission-type="sheet.config?.permissions?.[item.id]?.type || 'cell'"
    :data-no-lock="sheet.config?.permissions?.[item.id]?.noLock || false"
    :style="sheet.hooks?.selectionRangeHook?.setHighlightRange(item)"
>
    <div class="label">{{ item.name }}</div>
</div>
```

**关键点**:
- ✅ 添加了 `:data-no-lock` 属性
- ✅ 从 `permissions[userId].noLock` 读取值
- ✅ 默认为 `false`（显示锁图标）

### 修改 2：CSS 样式优化

**文件**: `src/styles/components/air-sheet.scss`  
**位置**: 第 629-719 行

#### 行级权限样式（第 629-658 行）
```scss
// 行级权限高亮样式
&[data-permission-type='row'] {
    // ... 其他样式 ...
    
    .label {
        &::before {
            content: '🔒 ';
        }
    }
    
    // ✅ auth=0 时不显示锁图标
    &[data-no-lock='true'] .label::before {
        content: '';
    }
}
```

#### 列级权限样式（第 660-689 行）
```scss
// 列级权限高亮样式
&[data-permission-type='column'] {
    // ... 其他样式 ...
    
    .label {
        &::before {
            content: '🔒 ';
        }
    }
    
    // ✅ auth=0 时不显示锁图标
    &[data-no-lock='true'] .label::before {
        content: '';
    }
}
```

#### 单元格级权限样式（第 691-719 行）
```scss
// 单元格级权限高亮样式
&[data-permission-type='cell'] {
    // ... 其他样式 ...
    
    .label {
        &::before {
            content: '🔒 ';
        }
    }
    
    // ✅ auth=0 时不显示锁图标
    &[data-no-lock='true'] .label::before {
        content: '';
    }
}
```

**关键点**:
- ✅ 为每种权限类型添加了 `&[data-no-lock='true']` 选择器
- ✅ 当 `data-no-lock='true'` 时，设置 `content: ''`（空字符串）
- ✅ 保持了原有的锁图标显示逻辑（默认显示）

## 🔄 完整的数据流程

### auth=0 时（不显示锁图标）

```
用户点击单元格 (auth=0)
  ↓
updatePermissions
  ├─ 记录用户信息到 sheet.config.permissions[userId]
  ├─ type: 'cell'
  ├─ noLock: true ✅
  └─ 返回
  ↓
同步到其他客户端
  ↓
渲染高亮元素
  ├─ data-permission-type="cell"
  ├─ data-no-lock="true" ✅
  └─ <div class="label">用户名</div>
  ↓
CSS 样式应用
  ├─ .label::before { content: '🔒 ' } (默认)
  └─ &[data-no-lock='true'] .label::before { content: '' } ✅ (覆盖)
  ↓
显示结果：用户名（无锁图标）✅
```

### auth > 0 时（显示锁图标）

```
用户点击单元格 (auth > 0)
  ↓
updatePermissions
  ├─ 记录用户信息到 sheet.config.permissions[userId]
  ├─ type: 'cell' / 'row' / 'column'
  ├─ noLock: undefined (或不存在) ✅
  └─ 返回
  ↓
同步到其他客户端
  ↓
渲染高亮元素
  ├─ data-permission-type="cell" / "row" / "column"
  ├─ data-no-lock="false" ✅
  └─ <div class="label">用户名</div>
  ↓
CSS 样式应用
  ├─ .label::before { content: '🔒 ' } ✅ (应用)
  └─ &[data-no-lock='true'] .label::before { content: '' } (不匹配)
  ↓
显示结果：🔒 用户名 ✅
```

## 📊 预期效果

### auth=0 (无权限模式)
- ✅ 高亮框：显示
- ✅ 用户名：显示
- ❌ 锁图标：**不显示**

### auth=1 (行级权限)
- ✅ 高亮框：显示（整行）
- ✅ 用户名：显示
- ✅ 锁图标：**显示** 🔒

### auth=2 (列级权限)
- ✅ 高亮框：显示（整列）
- ✅ 用户名：显示
- ✅ 锁图标：**显示** 🔒

### auth=3 (单元格级权限)
- ✅ 高亮框：显示（单元格）
- ✅ 用户名：显示
- ✅ 锁图标：**显示** 🔒

## 🎯 设计决策

### 为什么使用 `data-no-lock` 属性？

1. **语义清晰**
   - `data-no-lock="true"` 明确表示"不需要锁定"
   - 与 `noLock: true` 标记保持一致

2. **CSS 选择器简单**
   - 使用属性选择器 `&[data-no-lock='true']` 即可
   - 不需要额外的 class

3. **易于维护**
   - 数据流清晰：`permissions.noLock` → `data-no-lock` → CSS
   - 修改逻辑只需要改一个地方

### 为什么不使用 class？

1. **避免 class 污染**
   - 不需要添加额外的 class（如 `.no-lock`）
   - 保持 HTML 结构简洁

2. **数据属性更合适**
   - `data-*` 属性专门用于存储自定义数据
   - 符合 HTML5 规范

## 📝 修改文件总结

1. **src/components/AirSheet.vue** (第 3836 行)
   - 添加 `:data-no-lock` 属性

2. **src/styles/components/air-sheet.scss** (第 654-657, 685-688, 715-718 行)
   - 为行级权限添加 `&[data-no-lock='true']` 样式
   - 为列级权限添加 `&[data-no-lock='true']` 样式
   - 为单元格级权限添加 `&[data-no-lock='true']` 样式

3. **src/hooks/sheet/hooks/usePermissions.js** (已完成)
   - `updatePermissions` 函数中为 auth=0 添加 `noLock: true` 标记

## ✅ 完成状态

- ✅ HTML 属性已添加
- ✅ CSS 样式已优化
- ✅ 数据流已验证
- ✅ 文档已完善
- ⏳ 等待用户测试反馈

## 🔍 如何验证

1. **设置 auth=0**
   ```javascript
   config: {
       synergy: true,
       auth: 0,
   }
   ```

2. **打开两个浏览器窗口**
   - 用户A和用户B

3. **用户A点击单元格**
   - 用户B应该能看到高亮框
   - 高亮框上显示用户名（**无锁图标**）

4. **切换到 auth=3**
   ```javascript
   config: {
       synergy: true,
       auth: 3,
   }
   ```

5. **用户A点击单元格**
   - 用户B应该能看到高亮框
   - 高亮框上显示 **🔒 用户名**（有锁图标）

## 🎨 视觉效果对比

### auth=0
```
┌─────────────────┐
│                 │
│   [用户名]      │  ← 无锁图标
│                 │
└─────────────────┘
```

### auth > 0
```
┌─────────────────┐
│                 │
│  [🔒 用户名]    │  ← 有锁图标
│                 │
└─────────────────┘
```

