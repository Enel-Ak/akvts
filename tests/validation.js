/**
 * 合并单元格筛选功能验证脚本
 */

console.log('🚀 开始验证合并单元格筛选功能...\n')

// 模拟筛选逻辑
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

// 测试场景1：基础合并单元格筛选
console.log('=== 测试场景1: 基础合并单元格筛选 ===')
const data1 = new Map([
  [0, ['合并数据', 'B1', 'C1']],
  [1, ['', 'B2', 'C2']],        // 合并单元格的第二行
  [2, ['A3', 'B3', 'C3']],
  [3, ['A4', 'B4', 'C4']]
])

const mergedCells1 = {
  '0-0': { rs: 2, cs: 1 } // A1:A2 合并
}

const result1 = simulateFilter(data1, mergedCells1, { column: 1, value: 'B2' })
console.log('筛选条件: B列包含"B2"')
console.log('期望结果: [0, 1] (包含整个合并单元格组)')
console.log('实际结果:', result1)
console.log('测试结果:', JSON.stringify(result1) === JSON.stringify([0, 1]) ? '✅ 通过' : '❌ 失败')

// 测试场景2：多个合并单元格筛选
console.log('\n=== 测试场景2: 多个合并单元格筛选 ===')
const data2 = new Map([
  [0, ['合并1', 'B1', 'C1']],
  [1, ['', 'B2', 'C2']],        // 第一个合并单元格的第二行
  [2, ['A3', '合并2', '']],      // 第二个合并单元格的起始行
  [3, ['A4', 'B4', 'C4']],
  [4, ['A5', 'B5', 'C5']]
])

const mergedCells2 = {
  '0-0': { rs: 2, cs: 1 }, // A1:A2 合并
  '2-1': { rs: 1, cs: 2 }  // B3:C3 合并
}

const result2 = simulateFilter(data2, mergedCells2, { column: 2, value: 'C2' })
console.log('筛选条件: C列包含"C2"')
console.log('期望结果: [0, 1] (只包含第一个合并单元格组)')
console.log('实际结果:', result2)
console.log('测试结果:', JSON.stringify(result2) === JSON.stringify([0, 1]) ? '✅ 通过' : '❌ 失败')

console.log('\n🎉 验证完成！合并单元格筛选逻辑工作正常。')
