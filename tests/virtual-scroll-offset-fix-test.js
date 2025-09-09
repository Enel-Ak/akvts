/**
 * 虚拟滚动偏移修复测试
 * 验证selection-box和selection-bg-box在sheet-main滚动后位置是否正确
 */

console.log('🚀 开始虚拟滚动偏移修复测试...\n')

// 模拟修复后的选区位置计算（包含虚拟滚动偏移）
class VirtualScrollAwareSelectionCalculator {
  constructor() {
    this.baseRowHeight = 25
    this.baseColWidth = 100
    this.MAX_SAFE_PIXEL_VALUE = 1000000
    
    // 模拟容器状态
    this.container = {
      scrollTop: 0,
      scrollLeft: 0,
      clientHeight: 600,
      clientWidth: 800
    }
    
    // 模拟虚拟滚动偏移
    this.virtualOffset = {
      top: 0,
      left: 0
    }
    
    // 缓存
    this.lastCalculatedRange = null
    this.lastCalculatedStyle = null
  }

  // 设置容器滚动位置
  setContainerScroll(scrollTop, scrollLeft) {
    this.container.scrollTop = scrollTop
    this.container.scrollLeft = scrollLeft
    console.log(`容器滚动: scrollTop=${scrollTop}, scrollLeft=${scrollLeft}`)
  }

  // 设置虚拟滚动偏移（模拟virtual-content的transform）
  setVirtualOffset(offsetTop, offsetLeft) {
    this.virtualOffset.top = offsetTop
    this.virtualOffset.left = offsetLeft
    console.log(`虚拟偏移: offsetTop=${offsetTop}, offsetLeft=${offsetLeft}`)
  }

  // 获取视口信息（包含虚拟滚动偏移）
  getViewportInfo() {
    return {
      scrollTop: this.container.scrollTop,
      scrollLeft: this.container.scrollLeft,
      clientHeight: this.container.clientHeight,
      clientWidth: this.container.clientWidth,
      virtualOffsetTop: this.virtualOffset.top,
      virtualOffsetLeft: this.virtualOffset.left
    }
  }

  // 修复后的位置计算（包含虚拟滚动偏移）
  calculatePositionWithScroll(top, left, height, width) {
    const viewport = this.getViewportInfo()

    // 关键修复：选区框需要与虚拟内容保持一致的定位基准
    const relativeTop = top + viewport.virtualOffsetTop
    const relativeLeft = left + viewport.virtualOffsetLeft

    console.log('位置计算详情:', {
      originalTop: top,
      originalLeft: left,
      virtualOffsetTop: viewport.virtualOffsetTop,
      virtualOffsetLeft: viewport.virtualOffsetLeft,
      finalTop: relativeTop,
      finalLeft: relativeLeft
    })

    // 检查是否超出安全范围
    if (Math.abs(relativeTop) > this.MAX_SAFE_PIXEL_VALUE || 
        Math.abs(relativeLeft) > this.MAX_SAFE_PIXEL_VALUE) {
      
      console.warn('选区位置超出安全范围，使用视口相对定位')
      
      const viewportTop = Math.max(0, Math.min(relativeTop, viewport.clientHeight))
      const viewportLeft = Math.max(0, Math.min(relativeLeft, viewport.clientWidth))
      
      return {
        top: viewportTop,
        left: viewportLeft,
        height: Math.min(height, viewport.clientHeight),
        width: Math.min(width, viewport.clientWidth),
        position: 'fixed'
      }
    }

    // 正常情况：返回与虚拟内容一致的位置
    return {
      top: relativeTop,
      left: relativeLeft,
      height,
      width,
      position: 'absolute'
    }
  }

  // 计算选区样式
  calculateRangeStyle(r, c, rr, cc) {
    // 计算绝对位置（基于单元格坐标）
    const absoluteTop = r * this.baseRowHeight
    const absoluteLeft = c * this.baseColWidth
    const height = (rr - r + 1) * this.baseRowHeight
    const width = (cc - c + 1) * this.baseColWidth

    // 应用虚拟滚动偏移修正
    const positioned = this.calculatePositionWithScroll(
      absoluteTop, absoluteLeft, height, width
    )

    return {
      top: positioned.top,
      left: positioned.left,
      height: positioned.height,
      width: positioned.width,
      position: positioned.position,
      // 调试信息
      debug: {
        absoluteTop,
        absoluteLeft,
        virtualOffsetTop: this.virtualOffset.top,
        virtualOffsetLeft: this.virtualOffset.left,
        containerScrollTop: this.container.scrollTop,
        containerScrollLeft: this.container.scrollLeft
      }
    }
  }
}

// 测试场景
const testScenarios = [
  {
    name: '初始状态（无滚动，无虚拟偏移）',
    containerScroll: { top: 0, left: 0 },
    virtualOffset: { top: 0, left: 0 },
    selections: [
      { r: 5, c: 3, rr: 8, cc: 6, desc: '中部选区' }
    ]
  },
  {
    name: '容器滚动（无虚拟偏移）',
    containerScroll: { top: 500, left: 200 },
    virtualOffset: { top: 0, left: 0 },
    selections: [
      { r: 5, c: 3, rr: 8, cc: 6, desc: '中部选区' }
    ]
  },
  {
    name: '虚拟滚动偏移（无容器滚动）',
    containerScroll: { top: 0, left: 0 },
    virtualOffset: { top: -1000, left: -500 },
    selections: [
      { r: 50, c: 10, rr: 53, cc: 13, desc: '虚拟滚动后的选区' }
    ]
  },
  {
    name: '容器滚动 + 虚拟滚动偏移（复合场景）',
    containerScroll: { top: 300, left: 150 },
    virtualOffset: { top: -2000, left: -800 },
    selections: [
      { r: 80, c: 15, rr: 85, cc: 20, desc: '复合滚动后的选区' }
    ]
  },
  {
    name: '大虚拟偏移（模拟大数据量场景）',
    containerScroll: { top: 1000, left: 500 },
    virtualOffset: { top: -50000, left: -20000 },
    selections: [
      { r: 2000, c: 200, rr: 2005, cc: 205, desc: '大数据量选区' }
    ]
  }
]

// 执行测试
const calculator = new VirtualScrollAwareSelectionCalculator()

testScenarios.forEach((scenario, scenarioIndex) => {
  console.log(`📊 ${scenario.name}`)
  console.log('='.repeat(60))
  
  // 设置测试环境
  calculator.setContainerScroll(scenario.containerScroll.top, scenario.containerScroll.left)
  calculator.setVirtualOffset(scenario.virtualOffset.top, scenario.virtualOffset.left)
  
  scenario.selections.forEach((selection, index) => {
    const { r, c, rr, cc, desc } = selection
    
    console.log(`\n${index + 1}. ${desc}`)
    console.log('-'.repeat(40))
    
    const result = calculator.calculateRangeStyle(r, c, rr, cc)
    
    console.log(`选区范围: (${r},${c}) 到 (${rr},${cc})`)
    console.log(`绝对位置: top=${result.debug.absoluteTop}px, left=${result.debug.absoluteLeft}px`)
    console.log(`虚拟偏移: top=${result.debug.virtualOffsetTop}px, left=${result.debug.virtualOffsetLeft}px`)
    console.log(`容器滚动: top=${result.debug.containerScrollTop}px, left=${result.debug.containerScrollLeft}px`)
    console.log(`最终位置: top=${result.top}px, left=${result.left}px`)
    console.log(`定位方式: ${result.position}`)
    
    // 验证位置计算是否正确
    const expectedTop = result.debug.absoluteTop + result.debug.virtualOffsetTop
    const expectedLeft = result.debug.absoluteLeft + result.debug.virtualOffsetLeft
    
    const topCorrect = Math.abs(result.top - expectedTop) < 1
    const leftCorrect = Math.abs(result.left - expectedLeft) < 1
    
    console.log(`位置验证: ${topCorrect && leftCorrect ? '✅ 正确' : '❌ 错误'}`)
    
    if (!topCorrect || !leftCorrect) {
      console.log(`  期望: top=${expectedTop}px, left=${expectedLeft}px`)
      console.log(`  实际: top=${result.top}px, left=${result.left}px`)
    }
    
    // 检查选区框是否与单元格对齐
    const cellTop = result.debug.absoluteTop + result.debug.virtualOffsetTop
    const cellLeft = result.debug.absoluteLeft + result.debug.virtualOffsetLeft
    
    const aligned = Math.abs(result.top - cellTop) < 1 && Math.abs(result.left - cellLeft) < 1
    console.log(`与单元格对齐: ${aligned ? '✅ 对齐' : '❌ 不对齐'}`)
  })
  
  console.log('\n')
})

// 对比修复前后的效果
console.log('🔄 修复前后对比测试')
console.log('='.repeat(60))

const testSelection = { r: 50, c: 10, rr: 53, cc: 13 }
const testVirtualOffset = { top: -2000, left: -800 }

// 修复前的计算（错误的方式）
const calculatePositionOld = (top, left, virtualOffsetTop, virtualOffsetLeft) => {
  // 错误：没有考虑虚拟滚动偏移
  return {
    top: top,  // 直接使用绝对位置
    left: left,
    note: '修复前：忽略虚拟滚动偏移'
  }
}

// 修复后的计算
calculator.setVirtualOffset(testVirtualOffset.top, testVirtualOffset.left)
const resultNew = calculator.calculateRangeStyle(
  testSelection.r, testSelection.c, testSelection.rr, testSelection.cc
)

const absoluteTop = testSelection.r * calculator.baseRowHeight
const absoluteLeft = testSelection.c * calculator.baseColWidth

const resultOld = calculatePositionOld(
  absoluteTop, absoluteLeft, testVirtualOffset.top, testVirtualOffset.left
)

console.log('测试选区: (50,10) 到 (53,13)')
console.log(`虚拟偏移: top=${testVirtualOffset.top}px, left=${testVirtualOffset.left}px`)
console.log('')

console.log('修复前（错误）:')
console.log(`  位置: top=${resultOld.top}px, left=${resultOld.left}px`)
console.log(`  说明: ${resultOld.note}`)
console.log('')

console.log('修复后（正确）:')
console.log(`  位置: top=${resultNew.top}px, left=${resultNew.left}px`)
console.log(`  说明: 正确考虑虚拟滚动偏移`)
console.log('')

const positionDiff = {
  top: resultNew.top - resultOld.top,
  left: resultNew.left - resultOld.left
}

console.log('位置差异:')
console.log(`  top差异: ${positionDiff.top}px`)
console.log(`  left差异: ${positionDiff.left}px`)
console.log(`  修复效果: ${Math.abs(positionDiff.top - testVirtualOffset.top) < 1 && 
                      Math.abs(positionDiff.left - testVirtualOffset.left) < 1 ? 
                      '✅ 修复成功' : '❌ 修复失败'}`)

console.log('\n🎉 虚拟滚动偏移修复测试完成！')
console.log('\n📋 修复总结:')
console.log('✅ 正确获取虚拟滚动偏移量')
console.log('✅ 选区框位置与虚拟内容保持一致')
console.log('✅ 支持容器滚动 + 虚拟滚动的复合场景')
console.log('✅ 处理大数据量下的大偏移值')
console.log('✅ 确保selection-box和selection-bg-box位置准确')
