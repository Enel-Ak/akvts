/**
 * 合并单元格筛选功能性能测试
 */

console.log('🚀 开始性能测试...\n')

// 模拟筛选逻辑（与实际实现相同）
function simulateFilter(data, mergedCells, filterCondition) {
  const { column, value } = filterCondition
  
  // 第一阶段：找出直接匹配的行
  const matchedRows = new Set()
  for (const [rowIndex, rowData] of data.entries()) {
    if (rowData[column] === value) {
      matchedRows.add(rowIndex)
    }
  }
  
  // 第二阶段：合并单元格完整性检查
  const completeRows = new Set(matchedRows)
  
  // 获取合并单元格组
  const mergedGroups = []
  for (const [key, mergeInfo] of Object.entries(mergedCells)) {
    const [startRow, startCol] = key.split('-').map(Number)
    const endRow = startRow + mergeInfo.rs - 1
    
    const rows = []
    for (let r = startRow; r <= endRow; r++) {
      rows.push(r)
    }
    
    mergedGroups.push({ rows })
  }
  
  // 检查每个合并单元格组
  for (const group of mergedGroups) {
    const hasMatchInGroup = group.rows.some(row => matchedRows.has(row))
    
    if (hasMatchInGroup) {
      group.rows.forEach(row => {
        if (data.has(row)) {
          completeRows.add(row)
        }
      })
    }
  }
  
  return Array.from(completeRows).sort((a, b) => a - b)
}

// 生成测试数据
function generateTestData(rowCount, mergedCellCount) {
  const data = new Map()
  const mergedCells = {}
  
  // 生成行数据
  for (let i = 0; i < rowCount; i++) {
    data.set(i, [`A${i+1}`, `B${i+1}`, `C${i+1}`, `D${i+1}`, `E${i+1}`])
  }
  
  // 生成合并单元格（每10行一个合并单元格）
  for (let i = 0; i < mergedCellCount && i * 10 < rowCount - 1; i++) {
    const startRow = i * 10
    mergedCells[`${startRow}-0`] = { rs: 2, cs: 1 } // 每个合并单元格跨2行
  }
  
  return { data, mergedCells }
}

// 性能测试函数
function performanceTest(rowCount, mergedCellCount, testName) {
  console.log(`=== ${testName} ===`)
  console.log(`数据规模: ${rowCount} 行, ${mergedCellCount} 个合并单元格`)
  
  // 生成测试数据
  const { data, mergedCells } = generateTestData(rowCount, mergedCellCount)
  
  // 筛选条件：匹配中间的某一行
  const targetRow = Math.floor(rowCount / 2)
  const filterCondition = { column: 1, value: `B${targetRow + 1}` }
  
  // 执行性能测试
  const startTime = Date.now()
  const result = simulateFilter(data, mergedCells, filterCondition)
  const endTime = Date.now()
  
  const executionTime = endTime - startTime
  
  console.log(`执行时间: ${executionTime}ms`)
  console.log(`筛选结果: ${result.length} 行`)
  console.log(`性能评级: ${executionTime < 100 ? '✅ 优秀' : executionTime < 500 ? '⚠️ 良好' : '❌ 需要优化'}`)
  
  return {
    rowCount,
    mergedCellCount,
    executionTime,
    resultCount: result.length,
    performance: executionTime < 100 ? 'excellent' : executionTime < 500 ? 'good' : 'poor'
  }
}

// 运行性能测试
const testResults = []

// 小规模测试
testResults.push(performanceTest(100, 10, '小规模测试 (100行, 10个合并单元格)'))
console.log()

// 中等规模测试
testResults.push(performanceTest(1000, 100, '中等规模测试 (1000行, 100个合并单元格)'))
console.log()

// 大规模测试
testResults.push(performanceTest(5000, 500, '大规模测试 (5000行, 500个合并单元格)'))
console.log()

// 超大规模测试
testResults.push(performanceTest(10000, 1000, '超大规模测试 (10000行, 1000个合并单元格)'))
console.log()

// 性能总结
console.log('='.repeat(50))
console.log('📊 性能测试总结')
console.log('='.repeat(50))

testResults.forEach((result, index) => {
  const testNames = ['小规模', '中等规模', '大规模', '超大规模']
  console.log(`${testNames[index]}: ${result.executionTime}ms (${result.performance})`)
})

const avgTime = testResults.reduce((sum, r) => sum + r.executionTime, 0) / testResults.length
console.log(`\n平均执行时间: ${avgTime.toFixed(1)}ms`)

const excellentCount = testResults.filter(r => r.performance === 'excellent').length
const goodCount = testResults.filter(r => r.performance === 'good').length
const poorCount = testResults.filter(r => r.performance === 'poor').length

console.log(`性能分布: 优秀 ${excellentCount}, 良好 ${goodCount}, 需要优化 ${poorCount}`)

if (poorCount === 0) {
  console.log('\n🎉 所有测试都达到了良好以上的性能标准！')
} else {
  console.log('\n⚠️ 部分测试性能需要优化。')
}

console.log('\n💡 性能优化建议:')
console.log('1. 对于大量合并单元格，可以考虑建立索引来加速查找')
console.log('2. 使用批处理来避免阻塞主线程')
console.log('3. 实现增量筛选，只处理变化的数据')
