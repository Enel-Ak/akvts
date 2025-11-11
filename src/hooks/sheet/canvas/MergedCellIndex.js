/**
 * MergedCellIndex - 合并单元格空间索引
 * 
 * 性能优化：将 O(M×N) 的合并单元格查找优化为 O(log M + K)
 * 其中 M = 合并区域数量，N = 可见单元格数量，K = 视口内合并区域数量
 * 
 * 核心优化策略：
 * 1. 空间索引：使用区间映射快速定位相关合并区域
 * 2. 视口裁剪：只处理与当前视口相交的合并区域
 * 3. 缓存机制：缓存视口内的合并区域，避免重复计算
 */
export class MergedCellIndex {
	constructor() {
		// 原始合并配置
		this.mergeConfig = null
		this.mergeConfigRef = null // 用于检测配置对象是否变化
		
		// 空间索引：行区间映射
		// rowIntervals[row] = [合并区域列表]
		this.rowIntervals = new Map()
		
		// 空间索引：列区间映射
		// colIntervals[col] = [合并区域列表]
		this.colIntervals = new Map()
		
		// 视口缓存
		this.viewportCache = {
			key: null,
			merges: null,
			rowSet: null, // 用于快速查找的 Set
			colSet: null,
		}
		
		// 性能阈值：只有当合并区域数量超过此值时才使用索引
		this.THRESHOLD = 20
	}
	
	/**
	 * 构建或更新索引
	 * @param {Object} mergeConfig - 合并单元格配置对象
	 */
	buildIndex(mergeConfig) {
		// 检查是否需要重建索引
		if (this.mergeConfigRef === mergeConfig && this.rowIntervals.size > 0) {
			return // 配置未变化，使用现有索引
		}
		
		// 清空现有索引
		this.rowIntervals.clear()
		this.colIntervals.clear()
		this.viewportCache.key = null
		this.viewportCache.merges = null
		this.viewportCache.rowSet = null
		this.viewportCache.colSet = null
		
		this.mergeConfig = mergeConfig
		this.mergeConfigRef = mergeConfig
		
		// 如果没有合并单元格，直接返回
		if (!mergeConfig || Object.keys(mergeConfig).length === 0) {
			return
		}
		
		// 构建空间索引
		for (const [key, merge] of Object.entries(mergeConfig)) {
			const [mergeRow, mergeCol] = key.split('-').map(Number)
			const rowSpan = merge.rs || 1
			const colSpan = merge.cs || 1
			
			const mergeInfo = {
				key,
				row: mergeRow,
				col: mergeCol,
				rowSpan,
				colSpan,
				endRow: mergeRow + rowSpan - 1,
				endCol: mergeCol + colSpan - 1,
			}
			
			// 将合并区域添加到行区间映射
			for (let r = mergeRow; r < mergeRow + rowSpan; r++) {
				if (!this.rowIntervals.has(r)) {
					this.rowIntervals.set(r, [])
				}
				this.rowIntervals.get(r).push(mergeInfo)
			}
			
			// 将合并区域添加到列区间映射
			for (let c = mergeCol; c < mergeCol + colSpan; c++) {
				if (!this.colIntervals.has(c)) {
					this.colIntervals.set(c, [])
				}
				this.colIntervals.get(c).push(mergeInfo)
			}
		}
	}
	
	/**
	 * 获取视口内的合并区域（带缓存）
	 * @param {number} startRow - 起始行
	 * @param {number} endRow - 结束行
	 * @param {number} startCol - 起始列
	 * @param {number} endCol - 结束列
	 * @returns {Array} 视口内的合并区域列表
	 */
	getMergesInViewport(startRow, endRow, startCol, endCol) {
		// 生成缓存键
		const cacheKey = `${startRow},${endRow},${startCol},${endCol}`
		
		// 检查缓存
		if (this.viewportCache.key === cacheKey && this.viewportCache.merges) {
			return this.viewportCache.merges
		}
		
		// 使用 Set 去重（同一个合并区域可能在多个行/列区间中）
		const mergeSet = new Set()
		const merges = []
		
		// 遍历视口内的行，收集相关合并区域
		for (let r = startRow; r < endRow; r++) {
			const rowMerges = this.rowIntervals.get(r)
			if (rowMerges) {
				for (const merge of rowMerges) {
					// 检查合并区域是否与视口相交
					if (
						merge.row < endRow &&
						merge.endRow >= startRow &&
						merge.col < endCol &&
						merge.endCol >= startCol
					) {
						if (!mergeSet.has(merge.key)) {
							mergeSet.add(merge.key)
							merges.push(merge)
						}
					}
				}
			}
		}
		
		// 构建快速查找的 Set
		const rowSet = new Set()
		const colSet = new Set()
		for (const merge of merges) {
			for (let r = merge.row; r <= merge.endRow; r++) {
				rowSet.add(r)
			}
			for (let c = merge.col; c <= merge.endCol; c++) {
				colSet.add(c)
			}
		}
		
		// 更新缓存
		this.viewportCache = {
			key: cacheKey,
			merges,
			rowSet,
			colSet,
		}
		
		return merges
	}
	
	/**
	 * 检查某个位置是否在合并单元格内部（优化版本）
	 * @param {number} row - 行号
	 * @param {number} col - 列号
	 * @param {string} checkType - 检查类型：'horizontal' 或 'vertical'
	 * @param {Array} viewportMerges - 视口内的合并区域列表（可选，用于进一步优化）
	 * @returns {boolean} 是否在合并单元格内部
	 */
	isInsideMerge(row, col, checkType, viewportMerges = null) {
		// 如果提供了视口合并列表，只检查这些合并区域
		const mergesToCheck = viewportMerges || this.getAllMerges()
		
		for (const merge of mergesToCheck) {
			if (checkType === 'horizontal') {
				// 检查水平线：如果这条线在合并单元格内部（不是底边），则跳过
				if (
					row >= merge.row &&
					row < merge.row + merge.rowSpan - 1 &&
					col >= merge.col &&
					col < merge.col + merge.colSpan
				) {
					return true
				}
			} else if (checkType === 'vertical') {
				// 检查垂直线：如果这条线在合并单元格内部（不是右边），则跳过
				if (
					col >= merge.col &&
					col < merge.col + merge.colSpan - 1 &&
					row >= merge.row &&
					row < merge.row + merge.rowSpan
				) {
					return true
				}
			}
		}
		
		return false
	}
	
	/**
	 * 检查单元格是否在合并区域内（但不是起始单元格）
	 * @param {number} row - 行号
	 * @param {number} col - 列号
	 * @param {Array} viewportMerges - 视口内的合并区域列表（可选）
	 * @returns {boolean} 是否在合并区域内
	 */
	isInMergedCell(row, col, viewportMerges = null) {
		const mergesToCheck = viewportMerges || this.getAllMerges()
		
		for (const merge of mergesToCheck) {
			// 检查当前单元格是否在合并区域内
			if (
				row >= merge.row &&
				row < merge.row + merge.rowSpan &&
				col >= merge.col &&
				col < merge.col + merge.colSpan &&
				!(row === merge.row && col === merge.col) // 不是起始单元格
			) {
				return true
			}
		}
		
		return false
	}
	
	/**
	 * 获取所有合并区域（用于回退到原始算法）
	 * @returns {Array} 所有合并区域列表
	 */
	getAllMerges() {
		if (!this.mergeConfig) return []
		
		const merges = []
		for (const [key, merge] of Object.entries(this.mergeConfig)) {
			const [mergeRow, mergeCol] = key.split('-').map(Number)
			merges.push({
				key,
				row: mergeRow,
				col: mergeCol,
				rowSpan: merge.rs || 1,
				colSpan: merge.cs || 1,
				endRow: mergeRow + (merge.rs || 1) - 1,
				endCol: mergeCol + (merge.cs || 1) - 1,
			})
		}
		return merges
	}
	
	/**
	 * 检查是否应该使用索引（基于合并区域数量）
	 * @returns {boolean} 是否使用索引
	 */
	shouldUseIndex() {
		return this.mergeConfig && Object.keys(this.mergeConfig).length > this.THRESHOLD
	}
	
	/**
	 * 清空索引和缓存
	 */
	clear() {
		this.mergeConfig = null
		this.mergeConfigRef = null
		this.rowIntervals.clear()
		this.colIntervals.clear()
		this.viewportCache.key = null
		this.viewportCache.merges = null
		this.viewportCache.rowSet = null
		this.viewportCache.colSet = null
	}
}

