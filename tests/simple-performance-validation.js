/**
 * 简化的选区性能验证
 */

// 模拟原有的循环累加算法
function calculateOriginal(r, c, rr, cc, rowHeight = 25, colWidth = 100, resizeMap = new Map()) {
  let totalOffsetTop = r * rowHeight
  let totalHeight = (rr - r + 1) * rowHeight

  // 模拟原有的循环累加逻辑
  let modifiedBefore = 0
  let modifiedInRange = 0

  resizeMap.forEach((diff, row) => {
    if (row < r) {
      modifiedBefore += diff
    } else if (row >= r && row <= rr) {
      modifiedInRange += diff
    }
  })

  totalOffsetTop += modifiedBefore
  totalHeight += modifiedInRange

  return { top: totalOffsetTop, height: totalHeight }
}

// 模拟优化的前缀和算法
function calculateOptimized(r, c, rr, cc, prefixSum) {
  const totalOffsetTop = prefixSum[r]
  const totalHeight = prefixSum[rr + 1] - prefixSum[r]
  
  return { top: totalOffsetTop, height: totalHeight }
}

// 构建前缀和
function buildPrefixSum(rowCount, rowHeight = 25, resizeMap = new Map()) {
  const prefixSum = new Array(rowCount + 1).fill(0)
  
  for (let i = 0; i < rowCount; i++) {
    const baseHeight = rowHeight
    const modifiedHeight = resizeMap.get(i) || 0
    const actualHeight = baseHeight + modifiedHeight
    prefixSum[i + 1] = prefixSum[i] + actualHeight
  }
  
  return prefixSum
}

console.log('选区性能优化验证')
console.log('==================')

// 测试参数
const rowCount = 10000
const rowHeight = 25
const resizeMap = new Map()

// 添加一些行高调整
for (let i = 0; i < 1000; i += 100) {
  resizeMap.set(i, Math.floor(Math.random() * 10) - 5)
}

console.log(`数据规模: ${rowCount}行`)
console.log(`行高调整: ${resizeMap.size}个`)
console.log('')

// 构建前缀和
const prefixSum = buildPrefixSum(rowCount, rowHeight, resizeMap)

// 测试用例
const testCases = [
  { r: 0, rr: 10, desc: '前部小选区' },
  { r: 100, rr: 200, desc: '前部中选区' },
  { r: 5000, rr: 6000, desc: '中部大选区' },
  { r: 9000, rr: 9500, desc: '后部大选区' }
]

console.log('性能测试结果:')
console.log('-------------')

testCases.forEach(testCase => {
  const { r, rr, desc } = testCase
  const iterations = 10000
  
  // 测试原有算法
  const startOriginal = Date.now()
  for (let i = 0; i < iterations; i++) {
    calculateOriginal(r, 0, rr, 0, rowHeight, 100, resizeMap)
  }
  const timeOriginal = Date.now() - startOriginal
  
  // 测试优化算法
  const startOptimized = Date.now()
  for (let i = 0; i < iterations; i++) {
    calculateOptimized(r, 0, rr, 0, prefixSum)
  }
  const timeOptimized = Date.now() - startOptimized
  
  const speedup = (timeOriginal / timeOptimized).toFixed(2)
  const improvement = (((timeOriginal - timeOptimized) / timeOriginal) * 100).toFixed(1)
  
  console.log(`${desc}:`)
  console.log(`  原有算法: ${timeOriginal}ms`)
  console.log(`  优化算法: ${timeOptimized}ms`)
  console.log(`  性能提升: ${speedup}x (${improvement}%)`)
  console.log('')
})

// 验证结果正确性
console.log('正确性验证:')
console.log('----------')

let allCorrect = true
testCases.forEach(testCase => {
  const { r, rr, desc } = testCase
  const original = calculateOriginal(r, 0, rr, 0, rowHeight, 100, resizeMap)
  const optimized = calculateOptimized(r, 0, rr, 0, prefixSum)
  
  const isCorrect = Math.abs(original.top - optimized.top) < 0.001 && 
                   Math.abs(original.height - optimized.height) < 0.001
  
  console.log(`${desc}: ${isCorrect ? '✅ 正确' : '❌ 错误'}`)
  
  if (!isCorrect) {
    console.log(`  原有: top=${original.top}, height=${original.height}`)
    console.log(`  优化: top=${optimized.top}, height=${optimized.height}`)
    allCorrect = false
  }
})

console.log('')
console.log(allCorrect ? '🎉 优化成功！' : '⚠️ 需要调试')
console.log('')
console.log('优化原理:')
console.log('- 时间复杂度: O(n) → O(1)')
console.log('- 空间复杂度: O(1) → O(n) (预计算缓存)')
console.log('- 特别适合大数据量和频繁选区操作场景')
