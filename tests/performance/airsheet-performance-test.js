/**
 * AirSheet 性能测试套件
 * 测试多 sheet 功能和 Excel 导入的性能表现
 */

import { usePerformanceMonitor } from '../../src/hooks/sheet/hooks/usePerformanceMonitor.js'

class AirSheetPerformanceTest {
	constructor() {
		this.monitor = usePerformanceMonitor()
		this.testResults = []
	}

	// 初始化测试环境
	async init() {
		console.log('🚀 开始 AirSheet 性能测试...\n')
		this.monitor.startMonitoring()
		this.monitor.resetMetrics()
	}

	// 测试 Sheet 切换性能
	async testSheetSwitching() {
		console.log('📊 测试 Sheet 切换性能...')
		
		const testCases = [
			{ sheetCount: 5, switchCount: 20 },
			{ sheetCount: 10, switchCount: 50 },
			{ sheetCount: 20, switchCount: 100 }
		]

		for (const testCase of testCases) {
			console.log(`  测试场景: ${testCase.sheetCount} 个 Sheet，切换 ${testCase.switchCount} 次`)
			
			// 模拟创建多个 sheet
			const sheets = this.createMockSheets(testCase.sheetCount)
			
			const results = []
			
			// 执行切换测试
			for (let i = 0; i < testCase.switchCount; i++) {
				const targetSheetIndex = Math.floor(Math.random() * testCase.sheetCount)
				const startTime = this.monitor.startSheetSwitchMonitor()
				
				// 模拟 sheet 切换操作
				await this.simulateSheetSwitch(sheets[targetSheetIndex])
				
				const duration = this.monitor.endSheetSwitchMonitor(startTime)
				results.push(duration)
			}

			const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length
			const maxTime = Math.max(...results)
			const minTime = Math.min(...results)

			console.log(`    平均耗时: ${avgTime.toFixed(2)}ms`)
			console.log(`    最大耗时: ${maxTime.toFixed(2)}ms`)
			console.log(`    最小耗时: ${minTime.toFixed(2)}ms`)
			
			this.testResults.push({
				test: 'sheetSwitching',
				scenario: testCase,
				results: { avgTime, maxTime, minTime }
			})
		}
	}

	// 测试 Excel 导入性能
	async testExcelImport() {
		console.log('\n📈 测试 Excel 导入性能...')
		
		const testCases = [
			{ rows: 1000, cols: 20, description: '小文件 (1K行)' },
			{ rows: 5000, cols: 20, description: '中等文件 (5K行)' },
			{ rows: 10000, cols: 20, description: '大文件 (10K行)' },
			{ rows: 20000, cols: 30, description: '超大文件 (20K行)' }
		]

		for (const testCase of testCases) {
			console.log(`  测试场景: ${testCase.description}`)
			
			// 创建模拟 Excel 数据
			const mockData = this.createMockExcelData(testCase.rows, testCase.cols)
			const fileSize = this.estimateFileSize(mockData)
			
			const monitor = this.monitor.startExcelImportMonitor(fileSize)
			
			// 模拟 Excel 导入过程
			await this.simulateExcelImport(mockData)
			
			const duration = this.monitor.endExcelImportMonitor(monitor)
			
			console.log(`    导入耗时: ${duration.toFixed(2)}ms`)
			console.log(`    文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
			console.log(`    处理速度: ${(testCase.rows * testCase.cols / duration * 1000).toFixed(0)} 单元格/秒`)
			
			this.testResults.push({
				test: 'excelImport',
				scenario: testCase,
				results: { duration, fileSize, cellsPerSecond: testCase.rows * testCase.cols / duration * 1000 }
			})
		}
	}

	// 测试内存使用情况
	async testMemoryUsage() {
		console.log('\n💾 测试内存使用情况...')
		
		const initialMemory = this.monitor.checkMemoryUsage()
		console.log(`  初始内存使用: ${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`)
		
		// 创建大量数据
		const largeDataSet = this.createLargeDataSet(50000, 50)
		
		const afterCreationMemory = this.monitor.checkMemoryUsage()
		console.log(`  创建大数据集后: ${(afterCreationMemory.used / 1024 / 1024).toFixed(2)}MB`)
		
		// 清理数据
		largeDataSet.clear()
		
		// 强制垃圾回收（如果支持）
		if (window.gc) {
			window.gc()
		}
		
		// 等待垃圾回收
		await new Promise(resolve => setTimeout(resolve, 1000))
		
		const afterCleanupMemory = this.monitor.checkMemoryUsage()
		console.log(`  清理后内存使用: ${(afterCleanupMemory.used / 1024 / 1024).toFixed(2)}MB`)
		
		const memoryLeak = afterCleanupMemory.used - initialMemory.used
		console.log(`  内存泄漏检测: ${memoryLeak > 0 ? '+' : ''}${(memoryLeak / 1024 / 1024).toFixed(2)}MB`)
		
		this.testResults.push({
			test: 'memoryUsage',
			results: {
				initial: initialMemory.used,
				afterCreation: afterCreationMemory.used,
				afterCleanup: afterCleanupMemory.used,
				potentialLeak: memoryLeak
			}
		})
	}

	// 生成性能报告
	generateReport() {
		console.log('\n📋 性能测试报告')
		console.log('=' * 50)
		
		const report = this.monitor.getPerformanceReport()
		
		console.log('\n📊 Sheet 切换性能:')
		console.log(`  总切换次数: ${report.sheetSwitching.count}`)
		console.log(`  平均耗时: ${report.sheetSwitching.averageTime.toFixed(2)}ms`)
		console.log(`  最大耗时: ${report.sheetSwitching.maxTime.toFixed(2)}ms`)
		
		console.log('\n📈 Excel 导入性能:')
		console.log(`  总导入次数: ${report.excelImport.count}`)
		console.log(`  平均耗时: ${report.excelImport.averageTime.toFixed(2)}ms`)
		console.log(`  平均文件大小: ${(report.excelImport.averageFileSize / 1024 / 1024).toFixed(2)}MB`)
		
		if (report.memoryUsage) {
			console.log('\n💾 内存使用情况:')
			console.log(`  当前使用: ${(report.memoryUsage.used / 1024 / 1024).toFixed(2)}MB`)
			console.log(`  使用率: ${report.memoryUsage.usagePercent.toFixed(2)}%`)
		}
		
		console.log('\n🎯 性能优化建议:')
		report.recommendations.forEach((rec, index) => {
			console.log(`  ${index + 1}. ${rec}`)
		})
		
		return report
	}

	// 辅助方法：创建模拟 Sheet
	createMockSheets(count) {
		const sheets = []
		for (let i = 0; i < count; i++) {
			sheets.push({
				id: `sheet-${i}`,
				name: `Sheet${i + 1}`,
				data: new Map()
			})
		}
		return sheets
	}

	// 辅助方法：模拟 Sheet 切换
	async simulateSheetSwitch(sheet) {
		// 模拟切换过程中的操作
		await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
		
		// 模拟数据加载
		for (let i = 0; i < 100; i++) {
			sheet.data.set(i, `data-${i}`)
		}
	}

	// 辅助方法：创建模拟 Excel 数据
	createMockExcelData(rows, cols) {
		const data = []
		for (let r = 0; r < rows; r++) {
			const row = []
			for (let c = 0; c < cols; c++) {
				row.push(`R${r + 1}C${c + 1}`)
			}
			data.push(row)
		}
		return data
	}

	// 辅助方法：估算文件大小
	estimateFileSize(data) {
		// 简单估算：每个单元格平均 10 字节
		return data.length * data[0].length * 10
	}

	// 辅助方法：模拟 Excel 导入
	async simulateExcelImport(data) {
		const batchSize = 1000
		let processed = 0
		
		while (processed < data.length) {
			const batch = data.slice(processed, processed + batchSize)
			
			// 模拟批处理
			await new Promise(resolve => setTimeout(resolve, 1))
			
			processed += batch.length
		}
	}

	// 辅助方法：创建大数据集
	createLargeDataSet(rows, cols) {
		const dataSet = new Map()
		for (let r = 0; r < rows; r++) {
			const row = []
			for (let c = 0; c < cols; c++) {
				row.push(`Large-${r}-${c}`)
			}
			dataSet.set(r, row)
		}
		return dataSet
	}

	// 运行所有测试
	async runAllTests() {
		await this.init()
		await this.testSheetSwitching()
		await this.testExcelImport()
		await this.testMemoryUsage()
		return this.generateReport()
	}
}

// 导出测试类
export { AirSheetPerformanceTest }

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined') {
	window.runAirSheetPerformanceTest = async () => {
		const test = new AirSheetPerformanceTest()
		return await test.runAllTests()
	}
}
