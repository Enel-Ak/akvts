# 最终修复：auth=0 时高亮不显示问题

## 🎯 问题根源分析

### 对比 auth=3 和 auth=0 的行为

#### auth=3 (单元格级权限) - 正常显示高亮 ✅
1. 用户点击单元格
2. `updatePermissions` 记录用户信息到 `sheet.config.permissions`
3. 同步 `permissions` 配置到其他客户端
4. 接收方更新 `sheet.config.permissions`
5. `setHighlightRange` 从 `permissions` 中获取用户信息
6. 渲染高亮框 ✅

#### auth=0 (无权限模式) - 不显示高亮 ❌
1. 用户点击单元格
2. `updatePermissions` **直接 return**，不记录任何信息 ❌
3. **不同步** `permissions` 配置（因为 `auth > 0` 的检查）❌
4. 接收方的 `sheet.config.permissions` 为空 ❌
5. `setHighlightRange` 无法获取用户信息 ❌
6. 无法渲染高亮框 ❌

### 核心问题

**`auth=0` 时，虽然不需要权限锁定，但仍然需要同步用户的选区信息到 `sheet.config.permissions`，这样 `setHighlightRange` 才能正确渲染高亮！**

## ✅ 解决方案

### 修改 1：`usePermissions.js` - 允许 auth=0 时记录用户信息

**文件**: `src/hooks/sheet/hooks/usePermissions.js`  
**位置**: 第 60-109 行

**修改前**:
```javascript
const updatePermissions = (row, col, rowEnd, colEnd) => {
    if (!sheet || !sheet.config.synergy) return
    if (sheet.config.auth === 0) return // ❌ 直接返回，不记录任何信息
    
    // ... 记录权限信息
}
```

**修改后**:
```javascript
const updatePermissions = (row, col, rowEnd, colEnd) => {
    if (!sheet || !sheet.config.synergy) return
    
    // ... 获取用户信息
    
    // ✅ 修复：auth=0 时也需要记录用户选区信息（用于高亮显示），但不进行权限锁定
    if (sheet.config.auth === 0) {
        // 无权限模式：只记录用户选区，不锁定
        const targets = []
        for (let r = Math.min(row, rowEnd); r <= Math.max(row, rowEnd); r++) {
            for (let c = Math.min(col, colEnd); c <= Math.max(col, colEnd); c++) {
                targets.push({row: r, col: c})
            }
        }
        
        sheet.config.permissions[userId] = {
            type: 'cell', // 默认为单元格级
            targets,
            timestamp,
            userName,
            noLock: true, // ✅ 标记为不锁定，仅用于高亮显示
        }
        console.log('✅ updatePermissions - 无权限模式（仅高亮）:', {
            userId,
            userName,
            targets,
        })
        return
    }
    
    // 根据权限模式设置锁定
    switch (sheet.config.auth) {
        // ...
    }
}
```

**关键点**:
- ✅ `auth=0` 时也记录用户信息到 `permissions`
- ✅ 添加 `noLock: true` 标记，表示不进行权限锁定
- ✅ 仅用于高亮显示，不影响编辑权限

### 修改 2：`useSelectionRange.js` - 同步 permissions 配置

**文件**: `src/hooks/sheet/hooks/useSelectionRange.js`  
**位置**: 第 777-811 行

**修改前**:
```javascript
if (needSync) {
    const eventData = {
        ...ranged.value,
    }
    
    // ❌ 只有 auth > 0 时才同步 permissions
    if (sheet.config.auth > 0) {
        const configToSync = {}
        
        if (sheet.config.permissions) {
            configToSync.permissions = sheet.config.permissions
        }
        
        if (Object.keys(configToSync).length > 0) {
            eventData.config = JSON.stringify(configToSync)
        }
    }
    
    sheet.emits?.('asyncEventCell', eventData)
}
```

**修改后**:
```javascript
if (needSync) {
    const eventData = {
        ...ranged.value,
    }
    
    // ✅ 修复：无论 auth 值如何，都需要同步 permissions（用于高亮显示）
    const configToSync = {}
    
    // 同步临时权限 (permissions) - auth=0 时也需要同步（用于高亮）
    if (sheet.config.permissions) {
        configToSync.permissions = sheet.config.permissions
    }
    
    // 同步持久权限 (deepPermissions) - 仅在 auth > 0 时需要
    if (sheet.config.auth > 0 && sheet.config.deepPermissions) {
        configToSync.deepPermissions = sheet.config.deepPermissions
    }
    
    if (Object.keys(configToSync).length > 0) {
        eventData.config = JSON.stringify(configToSync)
        console.log('✅ 发送选区和配置:', {
            auth: sheet.config.auth,
            range: ranged.value,
            permissions: sheet.config.permissions,
            deepPermissions: sheet.config.deepPermissions,
        })
    }
    
    sheet.emits?.('asyncEventCell', eventData)
}
```

**关键点**:
- ✅ 移除了 `if (sheet.config.auth > 0)` 的限制
- ✅ `auth=0` 时也同步 `permissions` 配置
- ✅ `deepPermissions` 仍然只在 `auth > 0` 时同步（因为 auth=0 不需要持久锁定）

## 🔄 完整的数据流程（修复后）

### auth=0 时的流程

```
用户A点击单元格 (auth=0)
  ↓
handleMouseDown (useSelectionRange.js:662)
  ↓
updatePermissions (usePermissions.js:60)
  ├─ 记录用户信息到 sheet.config.permissions[userId]
  ├─ type: 'cell'
  ├─ noLock: true (不锁定)
  └─ 返回
  ↓
needSync = true (auth=0 总是同步)
  ↓
构建 eventData
  ├─ r, c, rr, cc (选区坐标)
  └─ config: JSON.stringify({permissions: {...}})
  ↓
sheet.emits('asyncEventCell', eventData)
  ↓
SignalR 广播到其他客户端
  ↓
用户B接收 EventClicked 事件
  ↓
更新 sheet.config.permissions (useSynergyEvent.js:207)
  ↓
更新 sheet.config.online (useSynergyEvent.js:307)
  ↓
Vue 响应式更新
  ↓
渲染高亮元素 (AirSheet.vue:3833)
  ├─ v-for="item of sheet.config.online"
  └─ :style="setHighlightRange(item)"
  ↓
setHighlightRange (useSelectionRange.js:232)
  ├─ 从 sheet.config.permissions[id] 获取用户信息
  ├─ 计算高亮位置和大小
  └─ 返回样式对象
  ↓
显示高亮框和用户名标签 ✅
```

## 🎯 关键设计决策

### 为什么 auth=0 也需要 permissions？

1. **高亮显示依赖 permissions**
   - `setHighlightRange` 函数从 `sheet.config.permissions[id]` 获取用户信息
   - 没有 `permissions` 数据，就无法渲染高亮

2. **权限锁定和高亮显示是两个独立的功能**
   - `permissions` 不仅用于权限锁定，也用于高亮显示
   - `auth=0` 时：不锁定（`noLock: true`），但仍然高亮

3. **保持代码一致性**
   - 所有 auth 模式使用相同的高亮渲染逻辑
   - 避免为 auth=0 创建特殊的代码路径

### noLock 标记的作用

```javascript
sheet.config.permissions[userId] = {
    type: 'cell',
    targets,
    timestamp,
    userName,
    noLock: true, // ✅ 标记为不锁定
}
```

- 明确标识这是"仅用于高亮"的权限记录
- 未来可以在 `checkPermission` 中检查这个标记
- 提高代码可读性和可维护性

## 📊 测试验证

### 预期行为

#### auth=0 (无权限模式)
- ✅ 用户可以自由点击和编辑任何单元格
- ✅ 其他用户能看到当前用户的高亮框
- ✅ 高亮框显示用户名
- ✅ 没有任何权限锁定或提示

#### auth=3 (单元格级权限)
- ✅ 用户点击单元格会锁定该单元格
- ✅ 其他用户能看到当前用户的高亮框
- ✅ 其他用户无法编辑被锁定的单元格
- ✅ 显示权限锁定提示

### 验证步骤

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
   - 查看控制台日志：
     ```
     ✅ updatePermissions - 无权限模式（仅高亮）: {userId: "xxx", userName: "xxx", ...}
     ✅ 发送选区和配置: {auth: 0, permissions: {...}, ...}
     ```

4. **用户B查看界面**
   - 应该能看到用户A的高亮框
   - 高亮框上显示用户A的名字
   - 用户B可以自由编辑任何单元格（无权限限制）

## 📝 修改文件总结

1. **src/hooks/sheet/hooks/usePermissions.js**
   - 修改 `updatePermissions` 函数
   - 允许 auth=0 时记录用户信息
   - 添加 `noLock: true` 标记

2. **src/hooks/sheet/hooks/useSelectionRange.js**
   - 修改同步逻辑
   - 移除 `auth > 0` 的限制
   - auth=0 时也同步 `permissions` 配置

3. **src/example/index/AirSheet/index.vue** (之前的修改)
   - 添加用户身份信息到事件数据
   - 提取共享的 `parseJwtToken` 函数

4. **src/hooks/sheet/hooks/useSynergyEvent.js** (之前的修改)
   - 添加详细的调试日志

## ✅ 完成状态

- ✅ 问题根源已找到
- ✅ 解决方案已实现
- ✅ 代码逻辑已验证
- ✅ 文档已完善
- ⏳ 等待用户测试反馈

