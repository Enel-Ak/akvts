# 🔧 AirSheet 协同模式初始化优化

## 问题分析

### 当前实现

#### 1. 非协同模式（`sheet.config.synergy === false`）

**初始化流程：**

```
onMounted
  └─> sheetStore.init(sheetId, containerId, props, emits, callback)
        └─> 创建 sheet 实例
        └─> 注册 hooks
        └─> 注册事件监听器
        └─> 调用 callback
              └─> init() - 初始化组件
              └─> setRange(0, 0, 0, 0) - 设置初始选区
```

#### 2. 协同模式（`sheet.config.synergy === true`）

**初始化流程：**

```
watch(() => props.asyncSheet)
  └─> sheetStore.initSynergySheets(sheets, containerId, props, emits)
        └─> useSignalrStop() - 停止旧的 SignalR 连接
        └─> this.sheets.clear() - 清空所有 sheet
        └─> for each sheet in sheets:
              └─> this.init(sheet, containerId, props, emits)
                    └─> 创建 sheet 实例
                    └─> 注册 hooks
                    └─> 注册事件监听器
        └─> 返回 Promise
  └─> sheet.hooks.synergyHook.connection(api, token, callback)
        └─> 建立 SignalR 连接
        └─> 调用 callback
              └─> setRange(0, 0, 0, 0) - 设置初始选区
```

---

## 用户已完成的修改

### 修改 1: `onMounted` 中添加协同模式判断

**文件：** `src/components/AirSheet.vue` (line 2638-2646)

**修改前：**

```javascript
onMounted(() => {
	sheetStore.init(sheetId.value, containerId, props, emits, () => {
		init()
		if (!props.modelValue?.config.synergy) {
			sheet.hooks.selectionRangeHook.setRange(0, 0, 0, 0)
		}
	})
})
```

**修改后：**

```javascript
onMounted(() => {
	// ✅ 只在非协同模式下初始化
	if (!props.modelValue.config.synergy) {
		sheetStore.init(sheetId.value, containerId, props, emits, () => {
			console.log('🔍 [DEBUG] sheetStore.init callback executed')
			init()
			if (!props.modelValue?.config.synergy) {
				sheet.hooks.selectionRangeHook.setRange(0, 0, 0, 0)
			}
		})
	}
})
```

**效果：**

-   ✅ 避免了协同模式下在 `onMounted` 中调用 `sheetStore.init`
-   ✅ 避免了重复的事件监听器注册

---

## 当前存在的问题

### 问题 1: 协同模式下缺少 `init()` 调用

**分析：**

在 `watch(() => props.asyncSheet)` 中（line 2616-2622），调用了 `sheetStore.initSynergySheets`，但**没有调用 `init()` 函数**。

**`init()` 函数的作用：**

让我查看 `init()` 函数的实现，看看它做了什么...

**潜在影响：**

-   可能导致某些组件级别的初始化逻辑缺失
-   可能导致某些响应式数据未正确设置

### 问题 2: 协同模式下的初始化时机

**当前流程：**

```
1. 组件挂载 (onMounted)
2. props.asyncSheet 变化
3. initSynergySheets 被调用
4. 每个 sheet 调用 init
5. synergyHook.connection 建立连接
```

**问题：**

-   如果 `props.asyncSheet` 在组件挂载前就已经有值，watch 可能不会触发
-   需要确保 `immediate: true` 或在 `onMounted` 中手动触发

---

## 需要验证的功能

### 1. `init()` 函数的作用

需要查看 `init()` 函数的实现，确定它是否必须在协同模式下调用。

### 2. 协同模式下的初始化完整性

需要验证以下功能是否正常工作：

-   ✅ sheet 实例创建
-   ✅ hooks 注册
-   ✅ 事件监听器注册
-   ❓ 组件级别的初始化（`init()` 函数）
-   ✅ SignalR 连接建立
-   ✅ 初始选区设置

---

## 建议的修复方案

### 方案 1: 在 `initSynergySheets` 完成后调用 `init()`

**修改文件：** `src/components/AirSheet.vue` (line 2609-2625)

**修改前：**

```javascript
watch(
	() => props.asyncSheet,
	(newVal) => {
		if (!newVal || !newVal.length || !props.modelValue?.config.synergy) {
			return
		}

		sheetStore?.initSynergySheets(newVal, containerId, props, emits).then(() => {
			if (props.modelValue?.config.synergy) {
				sheet.hooks.synergyHook.connection(props.api, props.token, () => {
					sheet.hooks.selectionRangeHook.setRange(0, 0, 0, 0)
				})
			}
		})
	},
	{deep: true}
)
```

**修改后：**

```javascript
watch(
	() => props.asyncSheet,
	(newVal) => {
		if (!newVal || !newVal.length || !props.modelValue?.config.synergy) {
			return
		}

		sheetStore?.initSynergySheets(newVal, containerId, props, emits).then(() => {
			// ✅ 调用组件级别的初始化
			init()

			if (props.modelValue?.config.synergy) {
				sheet.hooks.synergyHook.connection(props.api, props.token, () => {
					sheet.hooks.selectionRangeHook.setRange(0, 0, 0, 0)
				})
			}
		})
	},
	{deep: true}
)
```

### 方案 2: 确保 watch 在初始化时触发

**问题：** 如果 `props.asyncSheet` 在组件挂载前就有值，watch 可能不会触发。

**解决方案：** 添加 `immediate: true` 选项

**修改后：**

```javascript
watch(
	() => props.asyncSheet,
	(newVal) => {
		if (!newVal || !newVal.length || !props.modelValue?.config.synergy) {
			return
		}

		sheetStore?.initSynergySheets(newVal, containerId, props, emits).then(() => {
			init()

			if (props.modelValue?.config.synergy) {
				sheet.hooks.synergyHook.connection(props.api, props.token, () => {
					sheet.hooks.selectionRangeHook.setRange(0, 0, 0, 0)
				})
			}
		})
	},
	{deep: true, immediate: true} // ✅ 添加 immediate: true
)
```

---

## 测试步骤

### 测试 1: 非协同模式初始化

**步骤：**

1. 设置 `sheet.config.synergy = false`
2. 挂载组件
3. 验证 `sheetStore.init` 在 `onMounted` 中被调用
4. 验证 `init()` 函数被调用
5. 验证初始选区被设置

**预期结果：** 所有功能正常工作

### 测试 2: 协同模式初始化

**步骤：**

1. 设置 `sheet.config.synergy = true`
2. 提供 `props.asyncSheet` 数据
3. 挂载组件
4. 验证 `sheetStore.init` **不在** `onMounted` 中被调用
5. 验证 `sheetStore.initSynergySheets` 在 watch 中被调用
6. 验证 `init()` 函数被调用
7. 验证 SignalR 连接被建立
8. 验证初始选区被设置

**预期结果：** 所有功能正常工作，且没有重复的事件监听器

### 测试 3: 协同模式下的多次初始化

**步骤：**

1. 设置 `sheet.config.synergy = true`
2. 挂载组件
3. 多次更新 `props.asyncSheet`
4. 验证每次更新都正确清理旧的连接和监听器
5. 验证没有内存泄漏

**预期结果：** 每次更新都正确清理和重新初始化

---

## 需要进一步调查的问题

### 1. `init()` 函数的实现

需要查看 `init()` 函数的完整实现，确定：

-   它做了哪些初始化工作？
-   哪些工作是必须的？
-   哪些工作在协同模式下可以跳过？

### 2. 事件监听器的清理

需要验证：

-   `useSignalrStop()` 是否正确清理了所有 SignalR 相关的监听器？
-   `this.sheets.clear()` 是否正确清理了所有 sheet 相关的监听器？
-   是否有其他需要清理的资源？

### 3. 初始化时机的边界情况

需要测试：

-   `props.asyncSheet` 在组件挂载前就有值的情况
-   `props.asyncSheet` 从有值变为空的情况
-   `props.asyncSheet` 从空变为有值的情况
-   `sheet.config.synergy` 动态变化的情况

---

## 总结

### 已完成的优化

1. ✅ **避免协同模式下的重复初始化**
    - 在 `onMounted` 中添加了 `if (!props.modelValue.config.synergy)` 判断
    - 只在非协同模式下调用 `sheetStore.init`

### 已完成的优化（第二轮）

2. ✅ **确保协同模式下调用 `init()` 函数**

    - 查看了 `init()` 函数的实现（line 1906-1944）
    - 确认 `init()` 函数是必须调用的，负责组件级别的初始化
    - 在 `initSynergySheets` 完成后调用 `init()`

3. ✅ **确保 watch 在初始化时触发**
    - 添加了 `immediate: true` 选项
    - 确保 `props.asyncSheet` 在组件挂载前就有值时也能正确初始化

### 待验证的问题

1. ❓ **验证事件监听器的清理**
    - 确保没有内存泄漏
    - 确保没有重复的监听器

### 下一步行动

1. ✅ 查看 `init()` 函数的实现
2. ✅ 在协同模式下调用 `init()` 函数
3. ✅ 添加 `immediate: true` 确保初始化时触发
4. ❓ 测试修改后的初始化流程
5. ❓ 验证没有破坏现有功能

---

## 最终修复总结

### 修复的问题

1. **协同模式下的重复事件注册**

    - 原因：`onMounted` 中无条件调用 `sheetStore.init`，导致协同模式下重复注册
    - 修复：在 `onMounted` 中添加 `if (!props.modelValue.config.synergy)` 判断

2. **协同模式下缺少组件级别的初始化**

    - 原因：`watch(() => props.asyncSheet)` 中只调用了 `initSynergySheets`，没有调用 `init()`
    - 修复：在 `initSynergySheets` 完成后调用 `init()`

3. **初始化时机问题**
    - 原因：如果 `props.asyncSheet` 在组件挂载前就有值，watch 不会触发
    - 修复：添加 `immediate: true` 选项

### 修改的文件

**`src/components/AirSheet.vue`**

1. **Line 2638-2646**: `onMounted` 中添加协同模式判断
2. **Line 2609-2634**: `watch(() => props.asyncSheet)` 中添加 `init()` 调用和 `immediate: true`

### 修复后的初始化流程

#### 非协同模式（`sheet.config.synergy === false`）

```
onMounted
  └─> if (!props.modelValue.config.synergy)
        └─> sheetStore.init(sheetId, containerId, props, emits, callback)
              └─> 创建 sheet 实例
              └─> 注册 hooks
              └─> 注册事件监听器
              └─> 调用 callback
                    └─> init() - 组件级别初始化
                          └─> initialData() - 加载数据
                          └─> updateViewportSize() - 更新视口
                          └─> updateVisibleRange() - 更新可见范围
                          └─> 注册事件监听器
                          └─> observeView() - 观察视图
                          └─> initialized.value = true
                    └─> setRange(0, 0, 0, 0) - 设置初始选区
```

#### 协同模式（`sheet.config.synergy === true`）

```
watch(() => props.asyncSheet, {immediate: true})
  └─> if (newVal && newVal.length && props.modelValue?.config.synergy)
        └─> sheetStore.initSynergySheets(sheets, containerId, props, emits)
              └─> useSignalrStop() - 停止旧连接
              └─> this.sheets.clear() - 清空所有 sheet
              └─> for each sheet in sheets:
                    └─> this.init(sheet, containerId, props, emits)
                          └─> 创建 sheet 实例
                          └─> 注册 hooks
                          └─> 注册事件监听器
        └─> init() - 组件级别初始化 ✅ 新增
              └─> initialData() - 加载数据
              └─> updateViewportSize() - 更新视口
              └─> updateVisibleRange() - 更新可见范围
              └─> 注册事件监听器
              └─> observeView() - 观察视图
              └─> initialized.value = true
        └─> sheet.hooks.synergyHook.connection(api, token, callback)
              └─> 建立 SignalR 连接
              └─> 调用 callback
                    └─> setRange(0, 0, 0, 0) - 设置初始选区
```

### 关键改进

1. ✅ **避免重复初始化**：协同模式下不在 `onMounted` 中调用 `sheetStore.init`
2. ✅ **完整的组件初始化**：协同模式下也调用 `init()` 函数
3. ✅ **正确的初始化时机**：添加 `immediate: true` 确保初始化时触发
4. ✅ **调试日志**：添加日志方便排查初始化问题

### 预期效果

1. **非协同模式**：初始化流程保持不变，功能正常
2. **协同模式**：
    - 不会重复注册事件监听器
    - 组件级别的初始化正确完成
    - 数据加载、视图更新、事件监听器注册等功能正常
    - SignalR 连接正确建立
    - 初始选区正确设置
