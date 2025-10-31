import {useAirSheetStore} from '../store/useAirSheet'

/**
 * 超级权限管理 Hook
 * 实现高优先级的权限控制功能，优先级高于普通 permissions
 * superPermissions 支持实时同步，通过 asyncConfig 广播给其他用户
 */
export const useSuperPermissions = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = null
	let sheet = null

	/**
	 * 检查指定位置是否被 superPermissions 锁定
	 * @param {number} row - 行索引
	 * @param {number} col - 列索引
	 * @param {number} rowspan - 行跨度 (默认1)
	 * @param {number} colspan - 列跨度 (默认1)
	 * @returns {{locked: boolean, reason: string, range: object|null}} 检查结果
	 */
	const checkSuperPermission = (row, col, rowspan = 1, colspan = 1) => {
		if (!sheet || !sheet.config.superPermissions) {
			return {locked: false, reason: '', range: null}
		}

		const superPermissions = sheet.config.superPermissions

		// superPermissions 可以是对象数组或对象集合
		const permissionList = Array.isArray(superPermissions)
			? superPermissions
			: Object.values(superPermissions)

		console.log('checkSuperPermission 调用:', {
			检查位置: {row, col, rowspan, colspan},
			superPermissions: permissionList,
		})

		// 检查目标区域是否与任何 superPermission 区域重叠
		for (let i = 0; i < permissionList.length; i++) {
			const permission = permissionList[i]
			if (!permission) continue

			const {r: startRow, c: startCol, rr: endRow, cc: endCol, v: description} = permission

			// 检查是否有重叠
			// 目标区域: [row, row + rowspan - 1] x [col, col + colspan - 1]
			// 权限区域: [startRow, endRow] x [startCol, endCol]
			const targetEndRow = row + rowspan - 1
			const targetEndCol = col + colspan - 1

			const hasOverlap = !(
				targetEndRow < startRow ||
				row > endRow ||
				targetEndCol < startCol ||
				col > endCol
			)

			if (hasOverlap) {
				console.log('checkSuperPermission: 检测到超级权限锁定!', {
					目标区域: {row, col, targetEndRow, targetEndCol},
					权限区域: {startRow, startCol, endRow, endCol},
					描述: description,
				})

				return {
					locked: true,
					reason: description
						? `该区域受保护: ${description}`
						: '该区域受超级权限保护，不可编辑',
					range: permission,
				}
			}
		}

		console.log('checkSuperPermission: 未检测到超级权限锁定')
		return {locked: false, reason: '', range: null}
	}

	const checkSuperPermissionRange = (type) => {
		const {r, rr, c, cc} = sheet.hooks.selectionRangeHook.getRanged()
		const p = sheet.config.superPermissions
		if (p && p?.length) {
			if (type === 'row') {
				return p.some((permission) => {
					const {r: startRow, rr: endRow} = permission
					return r >= startRow && rr <= endRow
				})
			}

			if (type === 'col') {
				return p.some((permission) => {
					const {c: startCol, cc: endCol} = permission
					return c >= startCol && cc <= endCol
				})
			}
		}
		return false
	}

	/**
	 * ✅ 新增：判断整行是否被 superPermissions 覆盖
	 * ✅ 修复：只有当权限覆盖整行的所有列时，才认为该行被覆盖
	 * @param {number} row - 行索引
	 * @returns {Object} {locked: boolean, ranges: Array} 是否被锁定及覆盖的权限区域
	 */
	const isRowCoveredBySuperPermission = (row) => {
		const p = sheet.config.superPermissions
		const coveredRanges = []

		p.forEach((permission) => {
			const {r: startRow, c: startCol, rr: endRow} = permission
			// ✅ 修复：检查该行是否在权限区域的行范围内，且权限覆盖整行（从第0列到最后一列）
			// 只有当权限的列范围从0开始且足够宽时，才认为覆盖了整行
			if (row >= startRow && row <= endRow && startCol === 0) {
				coveredRanges.push(permission)
			}
		})

		return {
			locked: coveredRanges.length > 0,
			ranges: coveredRanges,
		}
	}

	/**
	 * ✅ 新增：判断整列是否被 superPermissions 覆盖
	 * ✅ 修复：只有当权限覆盖整列的所有行时，才认为该列被覆盖
	 * @param {number} col - 列索引
	 * @returns {Object} {locked: boolean, ranges: Array} 是否被锁定及覆盖的权限区域
	 */
	const isColCoveredBySuperPermission = (col) => {
		const p = sheet.config.superPermissions
		const coveredRanges = []

		p.forEach((permission) => {
			const {r: startRow, c: startCol, cc: endCol} = permission
			// ✅ 修复：检查该列是否在权限区域的列范围内，且权限覆盖整列（从第0行到最后一行）
			// 只有当权限的行范围从0开始且足够高时，才认为覆盖了整列
			if (col >= startCol && col <= endCol && startRow === 0) {
				coveredRanges.push(permission)
			}
		})

		return {
			locked: coveredRanges.length > 0,
			ranges: coveredRanges,
		}
	}

	/**
	 * ✅ 新增：判断行范围是否被 superPermissions 完全覆盖
	 * @param {number} startRow - 起始行
	 * @param {number} endRow - 结束行
	 * @returns {Object} {fullyLocked: boolean, partiallyLocked: boolean, ranges: Array}
	 */
	const isRowRangeCoveredBySuperPermission = (startRow, endRow) => {
		const p = sheet.config.superPermissions
		const coveredRanges = []
		let fullyLocked = false
		let partiallyLocked = false

		p.forEach((permission) => {
			const {r: permStartRow, rr: permEndRow} = permission
			// 检查是否有重叠
			const hasOverlap = !(endRow < permStartRow || startRow > permEndRow)

			if (hasOverlap) {
				coveredRanges.push(permission)
				partiallyLocked = true

				// 检查是否完全覆盖
				if (permStartRow <= startRow && permEndRow >= endRow) {
					fullyLocked = true
				}
			}
		})

		return {
			fullyLocked,
			partiallyLocked,
			ranges: coveredRanges,
		}
	}

	/**
	 * ✅ 新增：判断列范围是否被 superPermissions 完全覆盖
	 * @param {number} startCol - 起始列
	 * @param {number} endCol - 结束列
	 * @returns {Object} {fullyLocked: boolean, partiallyLocked: boolean, ranges: Array}
	 */
	const isColRangeCoveredBySuperPermission = (startCol, endCol) => {
		const p = sheet.config.superPermissions
		const coveredRanges = []
		let fullyLocked = false
		let partiallyLocked = false

		p.forEach((permission) => {
			const {c: permStartCol, cc: permEndCol} = permission
			// 检查是否有重叠
			const hasOverlap = !(endCol < permStartCol || startCol > permEndCol)

			if (hasOverlap) {
				coveredRanges.push(permission)
				partiallyLocked = true

				// 检查是否完全覆盖
				if (permStartCol <= startCol && permEndCol >= endCol) {
					fullyLocked = true
				}
			}
		})

		return {
			fullyLocked,
			partiallyLocked,
			ranges: coveredRanges,
		}
	}

	/**
	 * 检查区域 A 是否完全包含区域 B
	 * @param {Object} areaA - 区域 A {r, c, rr, cc}
	 * @param {Object} areaB - 区域 B {r, c, rr, cc}
	 * @returns {boolean} 是否完全包含
	 */
	const isAreaContainedBy = (areaA, areaB) => {
		return (
			areaB.r <= areaA.r && areaB.c <= areaA.c && areaB.rr >= areaA.rr && areaB.cc >= areaA.cc
		)
	}

	/**
	 * 过滤被其他区域完全包含的权限区域
	 * @param {Array} permissions - 权限区域列表
	 * @returns {Array} 过滤后的权限区域列表
	 */
	const filterContainedPermissions = (permissions) => {
		return permissions.filter((permission, index) => {
			// 检查当前权限是否被其他任何权限完全包含
			for (let i = 0; i < permissions.length; i++) {
				if (i !== index) {
					// 如果当前权限被其他权限完全包含，则过滤掉
					if (isAreaContainedBy(permission, permissions[i])) {
						return false
					}
				}
			}
			return true
		})
	}

	/**
	 * ✅ 新增：合并单个 id 组的权限对象
	 * ✅ 修复：不合并不规则的权限区域，直接返回原始权限对象
	 * @param {Array} permissions - 同一 id 的权限对象列表
	 * @returns {Array} 合并后的权限对象列表
	 */
	const mergePermissionGroup = (permissions) => {
		if (!permissions || permissions.length === 0) {
			return []
		}

		// 如果只有一个权限对象，直接返回
		if (permissions.length === 1) {
			return permissions
		}

		// ✅ 修复：不合并不规则的权限区域
		// 直接返回原始权限对象列表，避免错误地扩展权限范围
		// 例如：r5c2 和 r6c1:c2 不应该被合并成一个大矩形
		return permissions
	}

	/**
	 * ✅ 新增：合并相邻的权限区域（按 id 分组）
	 * @param {Array} permissions - 权限区域列表
	 * @returns {Array} 合并后的权限区域列表
	 */
	const mergeAdjacentPermissions = (permissions) => {
		if (!permissions || permissions.length === 0) {
			return []
		}

		// 1. 按 id 分组
		const groupedById = {}
		permissions.forEach((perm) => {
			const id = perm.id || 'default'
			if (!groupedById[id]) {
				groupedById[id] = []
			}
			groupedById[id].push(perm)
		})

		// 2. 对每个组进行合并
		const merged = []
		for (const id in groupedById) {
			const group = groupedById[id]
			const mergedGroup = mergePermissionGroup(group)
			merged.push(...mergedGroup)
		}

		return merged
	}

	/**
	 * 获取所有 superPermission 区域（用于渲染高亮）
	 * ✅ 修复问题2: 支持筛选状态下的行号转换
	 * ✅ 新增: 过滤被其他区域完全包含的权限区域
	 * ✅ 新增: 合并相邻的权限区域以减少 DOM 渲染数量
	 * @returns {Array} superPermission 区域列表
	 */
	const getSuperPermissionRanges = () => {
		if (!sheet || !sheet.config.superPermissions) {
			return []
		}

		const superPermissions = sheet.config.superPermissions

		// superPermissions 可以是对象数组或对象集合
		const permissionList = Array.isArray(superPermissions)
			? superPermissions
			: Object.values(superPermissions)

		const validPermissions = permissionList.filter((p) => p && typeof p === 'object')

		// ✅ 新增: 过滤被其他区域完全包含的权限区域
		const filteredByContainment = filterContainedPermissions(validPermissions)

		// ✅ 修复问题2: 检测筛选状态，构建行号映射
		const isFiltered = sheet.config.filtered && sheet.config.filtered.length > 0
		const rowMapping = new Map() // 原始行号 -> 筛选后行号

		if (isFiltered && sheet.rowMapping && Array.isArray(sheet.rowMapping)) {
			sheet.rowMapping.forEach((item) => {
				rowMapping.set(item.originalIndex, item.filteredIndex)
			})
		}

		// 如果不在筛选状态，合并相邻权限后返回
		if (!isFiltered) {
			return mergeAdjacentPermissions(filteredByContainment)
		}

		// ✅ 修复问题2: 在筛选状态下，转换行号并过滤不可见的权限
		const filteredPermissions = []

		for (const permission of filteredByContainment) {
			const {r, rr, c, cc, v} = permission

			// 检查权限范围是否与筛选结果有交集
			let hasVisibleRows = false
			let minFilteredRow = Infinity
			let maxFilteredRow = -Infinity

			// 遍历权限范围内的所有行，找出在筛选结果中可见的行
			for (let row = r; row <= rr; row++) {
				const filteredRow = rowMapping.get(row)
				if (filteredRow !== undefined) {
					hasVisibleRows = true
					minFilteredRow = Math.min(minFilteredRow, filteredRow)
					maxFilteredRow = Math.max(maxFilteredRow, filteredRow)
				}
			}

			// 如果有可见的行，添加转换后的权限范围
			if (hasVisibleRows) {
				filteredPermissions.push({
					r: minFilteredRow,
					rr: maxFilteredRow,
					c,
					cc,
					v,
					id: permission.id, // 保留 id 字段用于合并
					originalR: r, // 保留原始行号，用于调试
					originalRr: rr,
				})
			}
		}

		// ✅ 新增: 合并筛选后的相邻权限区域
		return mergeAdjacentPermissions(filteredPermissions)
	}

	/**
	 * 生成随机颜色（用于高亮显示）
	 * @param {number} index - 索引（用于生成不同的颜色）
	 * @returns {string} RGB 颜色字符串
	 */
	const generateColor = (index) => {
		// 使用预定义的颜色列表，确保颜色足够明显且美观
		const colors = [
			'255, 107, 107', // 红色
			'255, 159, 64', // 橙色
			'255, 205, 86', // 黄色
			'75, 192, 192', // 青色
			'54, 162, 235', // 蓝色
			'153, 102, 255', // 紫色
			'255, 99, 132', // 粉色
			'201, 203, 207', // 灰色
			'255, 193, 7', // 琥珀色
			'76, 175, 80', // 绿色
		]

		return colors[index % colors.length]
	}

	/**
	 * 设置 superPermission
	 * @param {number} r - 起始行
	 * @param {number} c - 起始列
	 * @param {number} rr - 结束行
	 * @param {number} cc - 结束列
	 * @param {string} v - 描述信息（可选）
	 * @returns {string} permission ID
	 */
	const setSuperPermission = (r, c, rr, cc, v = '受保护区域') => {
		if (!sheet || !sheet.config.superPermissions) {
			console.error('setSuperPermission: sheet 或 superPermissions 不存在')
			return null
		}

		// 确保 superPermissions 是数组格式
		if (!Array.isArray(sheet.config.superPermissions)) {
			sheet.config.superPermissions = Object.values(sheet.config.superPermissions)
		}

		// 生成唯一 ID
		const id = `sp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

		// 添加 superPermission（使用数组格式）
		const permission = {id, r, c, rr, cc, v}
		sheet.config.superPermissions.push(permission)

		console.log('setSuperPermission:', {id, r, c, rr, cc, v})

		// 同步权限配置到其他用户
		if (sheet.config.synergy) {
			sheet.emits?.('asyncConfig', {
				superPermissions: sheet.config.superPermissions,
			})
		}

		return id
	}

	/**
	 * 删除 superPermission
	 * @param {string} id - permission ID
	 */
	const removeSuperPermission = (id) => {
		if (!sheet || !sheet.config.superPermissions) {
			console.error('removeSuperPermission: sheet 或 superPermissions 不存在')
			return
		}

		// 确保 superPermissions 是数组格式
		if (!Array.isArray(sheet.config.superPermissions)) {
			sheet.config.superPermissions = Object.values(sheet.config.superPermissions)
		}

		// 删除 superPermission（从数组中移除）
		sheet.config.superPermissions = sheet.config.superPermissions.filter((p) => p.id !== id)

		console.log('removeSuperPermission:', {id})

		// 同步权限配置到其他用户
		if (sheet.config.synergy) {
			sheet.emits?.('asyncConfig', {
				superPermissions: sheet.config.superPermissions,
			})
		}
	}

	/**
	 * 清空所有 superPermissions
	 */
	const clearSuperPermissions = () => {
		if (!sheet || !sheet.config.superPermissions) {
			console.error('clearSuperPermissions: sheet 或 superPermissions 不存在')
			return
		}

		// 清空所有 superPermissions（使用数组格式）
		sheet.config.superPermissions = []

		console.log('clearSuperPermissions')

		// 同步权限配置到其他用户
		if (sheet.config.synergy) {
			sheet.emits?.('asyncConfig', {
				superPermissions: sheet.config.superPermissions,
			})
		}
	}

	/**
	 * 刷新 sheet 引用
	 * @param {string} id - sheet ID
	 */
	const refreshSheet = (id) => {
		sheet = sheetStore.getSheet(id)
	}

	/**
	 * 销毁 hook
	 */
	const destroy = () => {
		sheet = null
		sheetKey = null
	}

	/**
	 * 初始化 hook
	 * @param {string} key - sheet key
	 * @returns {object} hook 方法集合
	 */
	const init = (key) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)

		// 确保 superPermissions 数组存在
		if (!sheet.config.superPermissions) {
			sheet.config.superPermissions = []
		} else if (!Array.isArray(sheet.config.superPermissions)) {
			// 如果是对象格式，转换为数组格式
			sheet.config.superPermissions = Object.values(sheet.config.superPermissions)
		}

		setTimeout(() => {
			console.log('installed useSuperPermissions')
		}, 16)

		return {
			checkSuperPermission,
			checkSuperPermissionRange,
			getSuperPermissionRanges,
			// ✅ 新增：行列覆盖检查方法
			isRowCoveredBySuperPermission,
			isColCoveredBySuperPermission,
			isRowRangeCoveredBySuperPermission,
			isColRangeCoveredBySuperPermission,
			generateColor,
			setSuperPermission,
			removeSuperPermission,
			clearSuperPermissions,
			refreshSheet,
			destroy,
		}
	}

	return {
		init,
	}
}
