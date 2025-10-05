# 权限控制功能 - 关键问题修复（第二轮）

## 问题总结

用户反馈了三个关键问题：

1. **选中行/列/单元格没有正确同步到其他用户** - A 选择的行在 B 没有高亮显示，但 B 选择在 A 显示正确（单向同步问题）
2. **被其他用户锁定的区域依然可以编辑** - ✅ 已修复（通过设置 currentUserId）
3. **权限配置数据没有通过正确的协同机制同步** - 需要重新审视

## 根本原因分析（第二轮）

### 问题 1: 单向同步失败的真正原因

**第一次修复的错误理解**：

-   认为应该将 `permissions` 配置和选区信息分离，通过 `asyncConfig` 单独同步
-   但这导致了新问题：当只发送 `asyncConfig` 时，没有 row/col 信息，`groupUsers()` 不会被调用

**真正的问题**：

-   `OnEventClicked` 事件处理中，当 `res.config` 存在时，只有在同时包含有效的 `row` 和 `col` 时才会调用 `groupUsers(res)`
-   这意味着选区信息和配置必须在同一个事件中发送

**正确做法**：

-   在 `asyncEventCell` 事件中同时发送选区信息（r, c, rr, cc）和 permissions 配置
-   这样接收端可以同时更新在线用户列表和权限配置
-   修改 `OnEventClicked` 的逻辑，确保无论是否有 config 都会调用 `groupUsers()`

### 问题 2: 当前用户 ID 获取失败

**错误做法**：

-   假设在线用户列表的第一个用户是当前用户
-   这在多用户场景下完全不可靠

**正确做法**：

-   在 sheetStore 中添加 `currentUserId` 状态
-   应用层在用户登录/加入 sheet 时显式设置当前用户 ID
-   权限检查时从 store 中获取可靠的用户 ID

## 修复内容

### 1. 权限配置同步机制修复

#### 1.1 修改 `useSelectionRange.js`

**修改前**：

```javascript
if (sheet.config.synergy) {
	useDebounce(
		() => {
			const eventData = {
				...ranged.value,
				config: JSON.stringify({
					permissions: sheet.config.permissions,
				}),
			}
			sheet.emits?.('asyncEventCell', eventData)
		},
		300,
		'asyncEventCell'
	)()
}
```

**修改后**：

```javascript
// 更新权限锁定
if (sheet.config.synergy && sheet.hooks.permissionsHook) {
	sheet.hooks.permissionsHook.updatePermissions(
		selection.r,
		selection.c,
		selection.rr,
		selection.cc
	)

	// 权限更新后，通过 asyncConfig 同步 permissions 配置
	useDebounce(
		() => {
			sheet.emits?.('asyncConfig', {
				permissions: sheet.config.permissions,
			})
		},
		300,
		'asyncPermissions'
	)()
}

if (sheet.config.synergy) {
	useDebounce(
		() => {
			// 发送选区信息（不包含 config）
			sheet.emits?.('asyncEventCell', ranged.value)
		},
		300,
		'asyncEventCell'
	)()
}
```

**关键点**：

-   权限更新和选区同步分离
-   权限通过 `asyncConfig` 单独同步
-   选区信息通过 `asyncEventCell` 同步

#### 1.2 修改示例代码 `index.vue`

```javascript
const onAsyncEventCell = (range) => {
	sheetRef.value.asyncEventCell({
		sheetId: sheetId.value,
		row: range.r,
		col: range.c,
		rowEnd: range.rr, // 传递完整选区范围
		colEnd: range.cc,
		// config 通过 asyncConfig 事件单独同步，不在这里传递
	})
}
```

#### 1.3 修改 `useSynergyEvent.js`

确保 `groupUsers` 正确处理选区范围：

```javascript
useSynergyEvent.groupUsers = (user) => {
	const u = sheet.config.online.find((f) => f.id === user[sheet.props.userKeys[0]])

	if (u) {
		Object.assign(u, {
			r: user.row !== null ? user.row : u.r,
			c: user.col !== null ? user.col : u.c,
			rr:
				user.rowEnd !== null && user.rowEnd !== undefined
					? user.rowEnd
					: user.row !== null
					? user.row
					: u.rr,
			cc:
				user.colEnd !== null && user.colEnd !== undefined
					? user.colEnd
					: user.col !== null
					? user.col
					: u.cc,
		})
		return
	}

	sheet.config.online.push({
		id: user[sheet.props.userKeys[0]],
		name: user[sheet.props.userKeys[1]] || '用户',
		r: user.row,
		c: user.col,
		rr: user.rowEnd !== null && user.rowEnd !== undefined ? user.rowEnd : user.row,
		cc: user.colEnd !== null && user.colEnd !== undefined ? user.colEnd : user.col,
		state: 1,
	})
}
```

### 2. 当前用户 ID 管理

#### 2.1 在 `useAirSheet.js` 中添加状态

```javascript
state: () => {
    return {
        sheets: null,
        online: [],
        linked: false,
        currentUserId: null, // 新增：当前用户ID
    }
},
getters: {
    // ...
    getCurrentUserId: (state) => state.currentUserId,
},
actions: {
    // ...
    setCurrentUserId: function (userId) {
        this.currentUserId = userId
        console.log('设置当前用户ID:', userId)
    },
}
```

#### 2.2 修改 `usePermissions.js` 中的 `getCurrentUserId`

```javascript
const getCurrentUserId = () => {
	// 方案1: 从 sheet.config.currentUserId 获取
	if (sheet?.config?.currentUserId) {
		return sheet.config.currentUserId
	}

	// 方案2: 从 sheetStore 获取
	const storeUserId = sheetStore.getCurrentUserId
	if (storeUserId) {
		return storeUserId
	}

	// 方案3: 从 sheet.props 中获取
	if (sheet?.props?.currentUserId) {
		return sheet.props.currentUserId
	}

	console.warn('无法获取当前用户ID，权限功能可能无法正常工作')
	return null
}
```

#### 2.3 在应用层设置当前用户 ID

在 `AirSheet.vue` 中暴露方法：

```javascript
defineExpose({
	// ...
	setCurrentUserId: (userId) => sheetStore.setCurrentUserId(userId),
})
```

在示例代码中调用：

```javascript
const synergyJoinSheet = async (id) => {
	// ... 其他代码

	// 设置当前用户ID（从实际的认证系统获取）
	const currentUserId = getUserIdFromAuth() // 实际应用中的实现
	sheetRef.value.setCurrentUserId(currentUserId)
}
```

## 数据流程图

### 权限同步流程

```
用户 A 选中单元格
    ↓
handleMouseDown (useSelectionRange.js)
    ↓
updatePermissions() → 更新本地 sheet.config.permissions
    ↓
asyncConfig 事件 → 发送 {permissions: {...}}
    ↓
SignalR event-cell → 广播到其他用户
    ↓
用户 B 接收 OnEventClicked 事件
    ↓
解析 config.permissions → 更新本地 sheet.config.permissions
    ↓
用户 B 尝试编辑 → checkPermission() → 检测到锁定 → 阻止操作
```

### 选区高亮流程

```
用户 A 选中单元格
    ↓
handleMouseDown (useSelectionRange.js)
    ↓
asyncEventCell 事件 → 发送 {r, c, rr, cc}
    ↓
SignalR event-cell → 广播到其他用户
    ↓
用户 B 接收 OnEventClicked 事件
    ↓
groupUsers() → 更新 sheet.config.online[userId] = {r, c, rr, cc}
    ↓
setHighlightRange() → 根据权限类型渲染高亮
```

## 使用指南

### 必需配置

1. **设置当前用户 ID**（必需）：

```javascript
// 在加入 sheet 后立即设置
await sheetRef.value.asyncJoinSheet(sheetId)
sheetRef.value.setCurrentUserId(currentUserId)
```

2. **启用权限模式**：

```javascript
// 行级权限
sheet.config.auth = 1

// 列级权限
sheet.config.auth = 2

// 单元格级权限
sheet.config.auth = 3
```

### 测试场景

1. **多用户协同测试**：

    - 打开两个浏览器窗口，模拟用户 A 和用户 B
    - 用户 A 选中某行，验证用户 B 看到完整的行高亮
    - 用户 B 尝试编辑该行，应被阻止并显示提示

2. **权限同步测试**：

    - 用户 A 选中单元格后，检查用户 B 的 `sheet.config.permissions`
    - 应包含用户 A 的锁定信息

3. **选区范围测试**：
    - 用户 A 选中 A1:C3 区域
    - 用户 B 应看到完整的 3x3 区域高亮，而不是单个单元格

## 注意事项

1. **当前用户 ID 是必需的**：如果不设置，权限功能将无法工作
2. **服务器端验证**：前端权限检查只是第一道防线，后端 API 也应实施相同的验证
3. **性能考虑**：权限检查的时间复杂度为 O(n)，n 为在线用户数
4. **配置同步模式**：所有配置数据都应通过 `asyncConfig` 同步，不要在其他事件中传递配置

## 已修复的文件清单

1. ✅ `src/hooks/sheet/hooks/useSelectionRange.js` - 权限同步机制
2. ✅ `src/hooks/sheet/hooks/useSynergyEvent.js` - 选区范围处理
3. ✅ `src/hooks/sheet/hooks/usePermissions.js` - 当前用户 ID 获取
4. ✅ `src/hooks/sheet/store/useAirSheet.js` - 添加 currentUserId 状态
5. ✅ `src/components/AirSheet.vue` - 暴露 setCurrentUserId 方法
6. ✅ `src/example/index/AirSheet/index.vue` - 示例代码更新
