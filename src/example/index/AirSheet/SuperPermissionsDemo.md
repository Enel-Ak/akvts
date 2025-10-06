# SuperPermissions 超级权限功能使用指南

## 概述

`superPermissions` 是一个高优先级的权限控制功能，用于保护特定区域不被编辑或修改。它的优先级高于普通的 `permissions`，并且具有以下特点：

- **高优先级**：在权限检查时优先于普通 `permissions`
- **静态配置**：在初始化时设定，不需要实时同步
- **独立性**：每个 sheet 的 `superPermissions` 是独立的
- **视觉区分**：使用随机颜色和透明背景色高亮显示，图标为 🔐

## 数据结构

`superPermissions` 可以是对象数组或对象集合，每个权限区域包含以下字段：

```javascript
{
  r: 0,      // 开始行（0-based）
  c: 0,      // 开始列（0-based）
  rr: 5,     // 结束行（0-based，包含）
  cc: 3,     // 结束列（0-based，包含）
  v: '描述信息'  // 对该区域的描述（可选）
}
```

## 使用方式

### 1. 对象数组格式

```javascript
const config = {
  superPermissions: [
    {
      r: 0,
      c: 0,
      rr: 2,
      cc: 5,
      v: '表头区域，不可编辑'
    },
    {
      r: 10,
      c: 0,
      rr: 15,
      cc: 2,
      v: '汇总区域，受保护'
    }
  ]
}
```

### 2. 对象集合格式

```javascript
const config = {
  superPermissions: {
    header: {
      r: 0,
      c: 0,
      rr: 2,
      cc: 5,
      v: '表头区域'
    },
    summary: {
      r: 10,
      c: 0,
      rr: 15,
      cc: 2,
      v: '汇总区域'
    }
  }
}
```

## 完整示例

```vue
<template>
  <AirSheet
    ref="sheetRef"
    :modelValue="sheetData"
    :config="config"
  />
</template>

<script setup>
import { ref } from 'vue'
import AirSheet from '@/components/AirSheet.vue'

const sheetRef = ref(null)

// 配置 superPermissions
const config = ref({
  // 基础配置
  rowCount: 50,
  colCount: 20,
  
  // 超级权限配置
  superPermissions: [
    // 保护表头（前3行）
    {
      r: 0,
      c: 0,
      rr: 2,
      cc: 19,
      v: '表头区域，不可编辑'
    },
    // 保护公式列（最后一列）
    {
      r: 3,
      c: 19,
      rr: 49,
      cc: 19,
      v: '公式列，受保护'
    },
    // 保护特定单元格区域
    {
      r: 10,
      c: 5,
      rr: 15,
      cc: 8,
      v: '重要数据区域'
    }
  ]
})

const sheetData = ref({
  celldata: [
    // 你的数据...
  ],
  config: config.value
})
</script>
```

## 功能特性

### 1. 自动权限检查

所有编辑操作会自动进行 `superPermissions` 检查：

- 编辑单元格内容
- 修改单元格样式
- 插入/删除行列
- 复制/粘贴
- 拖拽填充
- 其他所有 sheet 操作

如果操作被阻止，会显示提示消息：
- 如果有描述信息：`该区域受保护: [描述信息]`
- 如果没有描述信息：`该区域受超级权限保护，不可编辑`

### 2. 视觉反馈

受 `superPermissions` 保护的区域会有明显的视觉标识：

- **边框**：3px 实线边框（比普通权限更粗）
- **背景色**：15% 透明度的随机颜色背景
- **标签**：显示描述信息或"受保护区域"
- **图标**：🔐（区别于普通权限的 🔒）
- **层级**：z-index 为 3，比普通高亮更高

### 3. 颜色系统

系统会为每个 `superPermissions` 区域分配不同的颜色，颜色列表包括：

1. 红色 (255, 107, 107)
2. 橙色 (255, 159, 64)
3. 黄色 (255, 205, 86)
4. 青色 (75, 192, 192)
5. 蓝色 (54, 162, 235)
6. 紫色 (153, 102, 255)
7. 粉色 (255, 99, 132)
8. 灰色 (201, 203, 207)
9. 琥珀色 (255, 193, 7)
10. 绿色 (76, 175, 80)

如果区域超过 10 个，颜色会循环使用。

## 与普通 permissions 的区别

| 特性 | superPermissions | permissions |
|------|------------------|-------------|
| 优先级 | 高（优先检查） | 低 |
| 同步方式 | 静态配置，不同步 | 实时同步 |
| 使用场景 | 固定保护区域 | 协同编辑锁定 |
| 视觉样式 | 3px 边框 + 15% 背景 | 2px 边框 + 10% 背景 |
| 图标 | 🔐 | 🔒 |
| 配置方式 | 初始化时设定 | 动态更新 |

## 使用场景

### 场景 1: 保护表头

```javascript
superPermissions: [{
  r: 0,
  c: 0,
  rr: 0,
  cc: 19,
  v: '表头行，不可编辑'
}]
```

### 场景 2: 保护公式列

```javascript
superPermissions: [{
  r: 0,
  c: 10,
  rr: 99,
  cc: 10,
  v: '公式列，受保护'
}]
```

### 场景 3: 保护多个区域

```javascript
superPermissions: [
  {
    r: 0,
    c: 0,
    rr: 2,
    cc: 5,
    v: '表头区域'
  },
  {
    r: 50,
    c: 0,
    rr: 55,
    cc: 10,
    v: '汇总区域'
  },
  {
    r: 10,
    c: 15,
    rr: 20,
    cc: 18,
    v: '关键数据'
  }
]
```

## 注意事项

1. **初始化配置**：`superPermissions` 应该在初始化时通过 `config` 传入
2. **不可动态修改**：一旦设定，不建议在运行时修改（如需修改，需要重新初始化 sheet）
3. **前端权限**：这是前端权限检查，后端 API 也应实施相同的权限验证
4. **性能考虑**：权限检查的时间复杂度为 O(n)，n 为 `superPermissions` 区域数量
5. **区域重叠**：如果多个区域重叠，只要有一个区域包含目标位置，就会被锁定

## 技术实现

`superPermissions` 功能通过以下模块实现：

- `useSuperPermissions.js`: 超级权限核心逻辑
- `usePermissions.js`: 集成超级权限检查
- `useAirSheet.js`: 初始化和配置管理
- `AirSheet.vue`: 高亮渲染和样式计算
- `air-sheet.scss`: 视觉样式定义

## API 参考

### checkSuperPermission(row, col, rowspan, colspan)

检查指定位置是否被超级权限锁定。

**参数：**
- `row` (number): 行索引
- `col` (number): 列索引
- `rowspan` (number): 行跨度，默认 1
- `colspan` (number): 列跨度，默认 1

**返回：**
```javascript
{
  locked: boolean,    // 是否被锁定
  reason: string,     // 锁定原因
  range: object|null  // 锁定的区域对象
}
```

### getSuperPermissionRanges()

获取所有超级权限区域列表（用于渲染高亮）。

**返回：**
```javascript
Array<{
  r: number,
  c: number,
  rr: number,
  cc: number,
  v: string
}>
```

### generateColor(index)

生成随机颜色（用于高亮显示）。

**参数：**
- `index` (number): 索引

**返回：**
- `string`: RGB 颜色字符串，如 "255, 107, 107"

