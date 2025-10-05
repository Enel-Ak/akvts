# AirSheet 权限控制功能使用指南

## 功能概述

AirSheet 现已支持细粒度的权限控制功能,可以在协同编辑场景下实现行级、列级、单元格级的权限锁定。

## 权限模式

通过设置 `sheet.config.auth` 来控制权限模式:

- `0`: 无权限控制 (默认)
- `1`: 行级权限 - 用户选中单元格时锁定整行
- `2`: 列级权限 - 用户选中单元格时锁定整列
- `3`: 单元格级权限 - 用户选中单元格时仅锁定该单元格

## 使用方法

### 1. 启用权限模式

```javascript
// 在 AirSheet 组件中
const sheet = sheetStore.getSheet(sheetKey)

// 设置为行级权限
sheet.config.auth = 1

// 设置为列级权限
sheet.config.auth = 2

// 设置为单元格级权限
sheet.config.auth = 3

// 关闭权限控制
sheet.config.auth = 0
```

### 2. 权限数据结构

权限状态存储在 `sheet.config.permissions` 中:

```javascript
{
  "userId1": {
    type: "row",           // 权限类型: 'row' | 'column' | 'cell'
    targets: [0, 1, 2],    // 锁定的行索引数组
    timestamp: 1234567890  // 锁定时间戳
  },
  "userId2": {
    type: "column",
    targets: [3, 4],       // 锁定的列索引数组
    timestamp: 1234567891
  },
  "userId3": {
    type: "cell",
    targets: [             // 锁定的单元格坐标数组
      {row: 5, col: 6},
      {row: 7, col: 8}
    ],
    timestamp: 1234567892
  }
}
```

### 3. 视觉反馈

不同权限级别有不同的视觉样式:

- **单元格级**: 实线边框 + 用户颜色
- **行级**: 实线边框 + 半透明背景 + 用户颜色
- **列级**: 虚线边框 + 半透明背景 + 用户颜色

所有锁定区域的用户标签前都会显示 🔒 图标。

### 4. 权限检查

所有编辑操作会自动进行权限检查:

```javascript
// 权限检查会在以下操作前自动执行:
// - 编辑单元格内容
// - 修改单元格样式
// - 插入/删除行列
// - 复制/粘贴
// - 拖拽填充
// - 其他所有 sheet 操作

// 如果操作被阻止,会显示提示消息:
// "该行/列/单元格已被 [用户名] 锁定"
```

### 5. 手动权限操作

如果需要手动操作权限,可以使用 `permissionsHook`:

```javascript
const sheet = sheetStore.getSheet(sheetKey)
const permissionsHook = sheet.hooks.permissionsHook

// 更新权限锁定
permissionsHook.updatePermissions(row, col, rowEnd, colEnd)

// 检查权限
const result = permissionsHook.checkPermission(row, col, rowspan, colspan)
if (result.locked) {
  console.log(result.reason) // "该行已被 张三 锁定"
}

// 释放当前用户的权限
permissionsHook.releasePermissions()

// 释放指定用户的权限
permissionsHook.releasePermissions(userId)

// 清空所有权限
permissionsHook.clearAllPermissions()
```

## 协同同步

权限状态会自动通过 SignalR 同步到所有协同用户:

1. 用户选中单元格时,自动更新 `permissions` 并广播
2. 其他用户接收到更新后,立即应用权限限制和视觉反馈
3. 用户离开时,自动清理其持有的所有权限锁

## 边界情况处理

### 权限模式切换

当 `sheet.config.auth` 变化时:
- 自动清空所有现有权限锁定
- 显示提示消息: "权限模式已切换为: [模式名称]"

### 用户离开

当用户离开 sheet 时:
- 自动释放该用户持有的所有权限锁
- 其他用户可以立即操作之前被锁定的区域

### 冲突处理

采用"先到先得"策略:
- 如果用户 A 已锁定某区域,用户 B 尝试操作时会被阻止
- 显示提示消息说明该区域被哪个用户锁定

## 示例场景

### 场景 1: 多人协同编辑报表

```javascript
// 启用行级权限,每个人编辑自己的行
sheet.config.auth = 1

// 用户 A 选中第 1 行 -> 第 1 行被锁定
// 用户 B 选中第 2 行 -> 第 2 行被锁定
// 用户 A 尝试编辑第 2 行 -> 被阻止,提示"该行已被用户B锁定"
```

### 场景 2: 列级数据保护

```javascript
// 启用列级权限,保护特定列不被其他人修改
sheet.config.auth = 2

// 用户 A 选中 A 列 -> A 列被锁定
// 用户 B 无法编辑 A 列的任何单元格
```

### 场景 3: 精细化单元格控制

```javascript
// 启用单元格级权限,最精细的控制
sheet.config.auth = 3

// 用户 A 选中 A1 -> 仅 A1 被锁定
// 用户 B 可以编辑 A2, A3 等其他单元格
```

## 注意事项

1. **协同模式必须启用**: 权限功能仅在 `sheet.config.synergy = true` 时生效
2. **前端权限检查**: 当前实现仅在前端进行权限检查,后端 API 也应实施相同的权限验证
3. **用户识别**: 当前用户ID从在线用户列表中获取,确保协同系统正确设置用户信息
4. **性能考虑**: 权限检查的时间复杂度为 O(n),其中 n 为在线用户数,通常很小不会影响性能

## 技术实现

权限功能通过以下模块实现:

- `usePermissions.js`: 权限核心逻辑
- `useSelectionRange.js`: 选中事件集成和视觉反馈
- `useSynergyEvent.js`: 协同同步
- `AirSheet.vue`: 操作拦截和 UI 渲染
- `air-sheet.scss`: 视觉样式

## 未来扩展

可能的功能扩展方向:

1. 支持权限优先级 (管理员可以覆盖普通用户的锁定)
2. 支持只读模式 (某些用户只能查看不能编辑)
3. 支持区域级权限 (锁定一个矩形区域)
4. 支持权限过期时间 (自动释放长时间未操作的锁定)
5. 支持权限审计日志 (记录所有权限操作历史)

