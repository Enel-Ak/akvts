# Sheet 搜索功能使用示例

## 功能概述

在 `useTools.js` 中实现了三个搜索方法：

1. **searchAll(keyword)** - 搜索所有匹配的单元格，返回 `[{r,c,v}]` 格式数组
2. **searchPrevious(keyword)** - 搜索并导航到上一个匹配项
3. **searchNext(keyword)** - 搜索并导航到下一个匹配项

## 使用方法

### 1. 搜索所有匹配项

```javascript
// 搜索包含 "test" 的所有单元格
const results = await sheet.hooks.toolsHook.searchAll('test')
console.log(results)
// 输出: [{r: 1, c: 2, v: "test data"}, {r: 3, c: 4, v: "testing"}]
```

### 2. 导航到上一个匹配项

```javascript
// 独立搜索并导航到上一个包含 "test" 的单元格
const result = await sheet.hooks.toolsHook.searchPrevious('test')
if (result) {
	console.log(`单元格位置: (${result.r}, ${result.c})`)
	console.log(`单元格值: ${result.v}`)
}
```

### 3. 导航到下一个匹配项

```javascript
// 独立搜索并导航到下一个包含 "test" 的单元格
const result = await sheet.hooks.toolsHook.searchNext('test')
if (result) {
	console.log(`单元格位置: (${result.r}, ${result.c})`)
	console.log(`单元格值: ${result.v}`)
}
```

## 功能特性

### 1. 独立搜索功能

-   **searchAll** 独立返回所有搜索结果，用于其他用途
-   **searchPrevious/searchNext** 完全独立，不依赖 searchAll 的结果
-   每次调用都会进行独立的搜索和定位

### 2. 支持筛选状态

-   自动检测当前是否处于筛选状态
-   在筛选数据中搜索时会正确映射到原始行索引

### 3. 智能位置管理

-   searchPrevious/searchNext 会记住当前搜索位置
-   关键字变化时会重置搜索位置
-   从当前选区位置开始搜索，提供更好的用户体验

### 4. 自动定位

-   自动滚动到目标单元格
-   将目标单元格居中显示在可视区域
-   自动设置选区到目标单元格

### 5. 不区分大小写

-   搜索时自动转换为小写进行匹配
-   支持部分匹配（包含关系）

## 实际应用场景

### 场景 1：在搜索组件中使用

```javascript
// 在搜索组件的事件处理中
const handleSearch = async (keyword) => {
	const results = await sheet.hooks.toolsHook.searchAll(keyword)
	setSearchResults(results)
	setCurrentIndex(-1)
}

const handlePrevious = async () => {
	const result = await sheet.hooks.toolsHook.searchPrevious(currentKeyword)
	if (result) {
		setCurrentIndex(result.index)
	}
}

const handleNext = async () => {
	const result = await sheet.hooks.toolsHook.searchNext(currentKeyword)
	if (result) {
		setCurrentIndex(result.index)
	}
}
```

### 场景 2：键盘快捷键支持

```javascript
// 监听键盘事件
useEffect(() => {
	const handleKeyDown = async (e) => {
		if (e.ctrlKey && e.key === 'f') {
			// Ctrl+F 打开搜索框
			e.preventDefault()
			setSearchVisible(true)
		} else if (e.key === 'F3') {
			// F3 查找下一个
			e.preventDefault()
			if (currentKeyword) {
				await sheet.hooks.toolsHook.searchNext(currentKeyword)
			}
		} else if (e.shiftKey && e.key === 'F3') {
			// Shift+F3 查找上一个
			e.preventDefault()
			if (currentKeyword) {
				await sheet.hooks.toolsHook.searchPrevious(currentKeyword)
			}
		}
	}

	document.addEventListener('keydown', handleKeyDown)
	return () => document.removeEventListener('keydown', handleKeyDown)
}, [currentKeyword])
```

## 错误处理

所有搜索方法都包含完整的错误处理：

-   验证输入参数
-   处理空数据源
-   处理搜索过程中的异常
-   提供详细的控制台日志

## 性能优化

-   使用现有的 `useProcessMapInBatches` 进行高效数据遍历
-   搜索结果缓存机制避免重复搜索
-   批处理避免阻塞 UI 线程
