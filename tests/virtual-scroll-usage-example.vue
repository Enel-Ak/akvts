<!--
虚拟滚动功能使用示例
演示如何在大数据量场景下使用虚拟滚动筛选面板
-->

<template>
  <div class="virtual-scroll-demo">
    <h2>虚拟滚动筛选面板演示</h2>
    
    <div class="demo-controls">
      <el-button @click="generateSmallData">生成小数据量 (100项)</el-button>
      <el-button @click="generateMediumData">生成中等数据量 (1000项)</el-button>
      <el-button @click="generateLargeData">生成大数据量 (5000项)</el-button>
      <el-button @click="generateHugeData">生成超大数据量 (10000项)</el-button>
    </div>
    
    <div class="demo-info">
      <p>当前数据量: <strong>{{ filterData.length }}</strong> 项</p>
      <p>渲染性能: 只渲染可视区域内的项目，大幅提升性能</p>
    </div>
    
    <div class="demo-trigger">
      <el-button 
        ref="triggerButton" 
        type="primary" 
        @click="openFilterPanel"
      >
        打开筛选面板
      </el-button>
    </div>
    
    <div class="demo-result" v-if="selectedFilters.length > 0">
      <h3>已选择的筛选条件:</h3>
      <ul>
        <li v-for="filter in selectedFilters" :key="filter.c + '-' + filter.v">
          列 {{ filter.c }}: {{ filter.v }}
        </li>
      </ul>
    </div>
    
    <!-- 虚拟滚动筛选面板 -->
    <AirSheetFilter
      v-model="filterElement"
      :colIndex="currentColIndex"
      :filterCol="filterData"
      :currentFiltered="selectedFilters"
      @confirm="handleFilterConfirm"
      @confirmOnly="handleFilterConfirm"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AirSheetFilter from '../src/components/AirSheetFilter.vue'

const triggerButton = ref(null)
const filterElement = ref(null)
const filterData = ref([])
const currentColIndex = ref(1)
const selectedFilters = ref([])

// 生成测试数据
const generateTestData = (count) => {
  const data = []
  for (let i = 0; i < count; i++) {
    data.push({
      r: i,
      c: currentColIndex.value,
      v: `筛选项 ${i + 1} - ${Math.random().toString(36).substr(2, 5)}`,
      _filter: true
    })
  }
  return data
}

// 生成不同数量的数据
const generateSmallData = () => {
  filterData.value = generateTestData(100)
  console.log('生成了100项测试数据')
}

const generateMediumData = () => {
  filterData.value = generateTestData(1000)
  console.log('生成了1000项测试数据')
}

const generateLargeData = () => {
  filterData.value = generateTestData(5000)
  console.log('生成了5000项测试数据')
}

const generateHugeData = () => {
  filterData.value = generateTestData(10000)
  console.log('生成了10000项测试数据')
}

// 打开筛选面板
const openFilterPanel = () => {
  if (filterData.value.length === 0) {
    generateMediumData() // 默认生成中等数据量
  }
  filterElement.value = triggerButton.value.$el
}

// 处理筛选确认
const handleFilterConfirm = (filters) => {
  selectedFilters.value = filters
  console.log('筛选确认:', filters)
}

// 初始化时生成一些数据
generateMediumData()
</script>

<style scoped>
.virtual-scroll-demo {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.demo-controls {
  margin: 20px 0;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.demo-info {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
  margin: 20px 0;
}

.demo-info p {
  margin: 5px 0;
}

.demo-trigger {
  margin: 20px 0;
}

.demo-result {
  margin: 20px 0;
  padding: 15px;
  background: #e8f5e8;
  border-radius: 5px;
}

.demo-result ul {
  margin: 10px 0;
  padding-left: 20px;
}

.demo-result li {
  margin: 5px 0;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

h3 {
  color: #666;
  margin: 10px 0;
}
</style>
