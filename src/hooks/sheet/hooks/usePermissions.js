import {watch, toRaw} from 'vue'
import {useAirSheetStore} from '../store/useAirSheet'
import {ElMessage} from 'element-plus'
import {useDebounce} from '@/hooks'

/**
 * 权限管理 Hook
 * 实现细粒度的权限控制功能 (行级/列级/单元格级)
 */
export const usePermissions = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = null
	let sheet = null
	let authWatcher = null
	let rangeWatcher = null // 监听选区变化

	// 记录当前用户的选区状态
	let currentUserRange = {
		r: -1,
		c: -1,
		rr: -1,
		cc: -1,
		hasEdited: false, // 是否进行过编辑
	}

	/**
	 * 获取当前用户ID
	 * @returns {string|null} 用户ID
	 */
	const getCurrentUserId = () => {
		// 方案1: 从 sheet.config.currentUserId 获取（如果设置了）
		if (sheet?.config?.currentUserId) {
			return sheet.config.currentUserId
		}

		// 方案2: 从 sheetStore 的 currentUserId 获取
		const storeUserId = sheetStore.getCurrentUserId
		if (storeUserId) {
			return storeUserId
		}

		// 方案3: 从 sheet.props 中获取
		if (sheet?.props?.currentUserId) {
			return sheet.props.currentUserId
		}

		// 方案4: 通过比较 online 用户列表，找到不在 permissions 中的用户（即当前用户）
		// 这个方法不可靠，仅作为最后的备用方案
		console.warn('无法获取当前用户ID，权限功能可能无法正常工作')
		return null
	}

	/**
	 * 根据权限模式和选中位置更新权限锁定
	 * ✅ 新需求: permissions 只记录临时锁定(当前选中),不透明
	 * @param {number} row - 行索引
	 * @param {number} col - 列索引
	 * @param {number} rowEnd - 结束行索引
	 * @param {number} colEnd - 结束列索引
	 */
	const updatePermissions = (row, col, rowEnd, colEnd) => {
		if (!sheet || !sheet.config.synergy) return

		const userId = getCurrentUserId()
		if (!userId) {
			console.warn('updatePermissions: 无法获取当前用户ID')
			return
		}

		// 确保 permissions 对象存在
		if (!sheet.config.permissions) {
			sheet.config.permissions = {}
		}

		const timestamp = Date.now()

		// 获取当前用户名（从 sheetStore.getOnline 获取）
		let userName = userId // 默认使用 userId
		const onlineUsers = sheetStore.getOnline
		if (Array.isArray(onlineUsers)) {
			const user = onlineUsers.find((u) => u && u.id === userId)
			if (user && user.name) {
				userName = user.name
			}
		}

		// ✅ 修复：auth=0 时也需要记录用户选区信息（用于高亮显示），但不进行权限锁定
		if (sheet.config.auth === 0) {
			// 无权限模式：只记录用户选区，不锁定
			const targets = []
			for (let r = Math.min(row, rowEnd); r <= Math.max(row, rowEnd); r++) {
				for (let c = Math.min(col, colEnd); c <= Math.max(col, colEnd); c++) {
					targets.push({row: r, col: c})
				}
			}

			sheet.config.permissions[userId] = {
				type: 'cell', // 默认为单元格级
				targets,
				timestamp,
				userName,
				noLock: true, // ✅ 标记为不锁定，仅用于高亮显示
			}
			console.log('✅ updatePermissions - 无权限模式（仅高亮）:', {
				userId,
				userName,
				targets,
			})
			return
		}

		// 根据权限模式设置锁定
		switch (sheet.config.auth) {
			case 1: // 行级权限
				{
					const targets = []
					for (let r = Math.min(row, rowEnd); r <= Math.max(row, rowEnd); r++) {
						targets.push(r)
					}

					sheet.config.permissions[userId] = {
						type: 'row',
						targets,
						timestamp,
						userName,
					}
					console.log('updatePermissions - 行级权限:', {
						userId,
						userName,
						targets,
						allPermissions: sheet.config.permissions,
					})
				}
				break

			case 2: // 列级权限
				{
					const targets = []
					for (let c = Math.min(col, colEnd); c <= Math.max(col, colEnd); c++) {
						targets.push(c)
					}

					sheet.config.permissions[userId] = {
						type: 'column',
						targets,
						timestamp,
						userName,
					}
					console.log('updatePermissions - 列级权限:', {
						userId,
						userName,
						targets,
						allPermissions: sheet.config.permissions,
					})
				}
				break

			case 3: // 单元格级权限
				{
					const targets = []
					for (let r = Math.min(row, rowEnd); r <= Math.max(row, rowEnd); r++) {
						for (let c = Math.min(col, colEnd); c <= Math.max(col, colEnd); c++) {
							targets.push({row: r, col: c})
						}
					}

					sheet.config.permissions[userId] = {
						type: 'cell',
						targets,
						timestamp,
						userName,
					}
					console.log('updatePermissions - 单元格级权限:', {
						userId,
						userName,
						targets,
						allPermissions: sheet.config.permissions,
					})
				}
				break
		}
	}

	/**
	 * 更新深度权限锁定(持久锁定)
	 * ✅ 新需求: deepPermissions 记录用户编辑过的区域,持久保持
	 * @param {number} row - 行索引
	 * @param {number} col - 列索引
	 * @param {number} rowEnd - 结束行索引
	 * @param {number} colEnd - 结束列索引
	 */
	const updateDeepPermissions = (row, col, rowEnd, colEnd) => {
		if (!sheet || !sheet.config.synergy) return
		if (sheet.config.auth === 0) return // 无权限模式

		const userId = getCurrentUserId()
		if (!userId) {
			console.warn('updateDeepPermissions: 无法获取当前用户ID')
			return
		}

		// 确保 deepPermissions 对象存在
		if (!sheet.config.deepPermissions) {
			sheet.config.deepPermissions = {}
		}

		const timestamp = Date.now()

		// 获取当前用户名
		let userName = userId
		const onlineUsers = sheetStore.getOnline
		if (Array.isArray(onlineUsers)) {
			const user = onlineUsers.find((u) => u && u.id === userId)
			if (user && user.name) {
				userName = user.name
			}
		}

		// 获取已有的深度权限记录
		const existingPermission = sheet.config.deepPermissions[userId]

		console.log('✅ updateDeepPermissions 调用:', {
			userId,
			userName,
			auth: sheet.config.auth,
			newRange: {row, col, rowEnd, colEnd},
			existingPermission,
		})

		// 根据权限模式设置锁定
		switch (sheet.config.auth) {
			case 1: // 行级权限
				{
					const newTargets = []
					for (let r = Math.min(row, rowEnd); r <= Math.max(row, rowEnd); r++) {
						newTargets.push(r)
					}

					// 合并已有的锁定行
					let finalTargets = newTargets
					if (existingPermission && existingPermission.type === 'row') {
						const existingTargets = existingPermission.targets || []
						finalTargets = [...new Set([...existingTargets, ...newTargets])]
						console.log('✅ 问题三: 合并行级权限:', {
							existingTargets,
							newTargets,
							finalTargets,
						})
					}

					sheet.config.deepPermissions[userId] = {
						type: 'row',
						targets: finalTargets,
						timestamp,
						userName,
					}
					console.log('updateDeepPermissions - 行级权限:', {
						userId,
						userName,
						targets: finalTargets,
						allDeepPermissions: sheet.config.deepPermissions,
					})
				}
				break

			case 2: // 列级权限
				{
					const newTargets = []
					for (let c = Math.min(col, colEnd); c <= Math.max(col, colEnd); c++) {
						newTargets.push(c)
					}

					let finalTargets = newTargets
					if (existingPermission && existingPermission.type === 'column') {
						const existingTargets = existingPermission.targets || []
						finalTargets = [...new Set([...existingTargets, ...newTargets])]
					}

					sheet.config.deepPermissions[userId] = {
						type: 'column',
						targets: finalTargets,
						timestamp,
						userName,
					}
					console.log('updateDeepPermissions - 列级权限:', {
						userId,
						userName,
						targets: finalTargets,
					})
				}
				break

			case 3: // 单元格级权限
				{
					const newTargets = []

					for (let r = Math.min(row, rowEnd); r <= Math.max(row, rowEnd); r++) {
						for (let c = Math.min(col, colEnd); c <= Math.max(col, colEnd); c++) {
							newTargets.push({
								row: r,
								col: c,
							})
						}
					}

					let finalTargets = newTargets
					if (existingPermission && existingPermission.type === 'cell') {
						const existingTargets = existingPermission.targets || []
						const merged = [...existingTargets, ...newTargets]
						finalTargets = merged.filter(
							(t, index, self) =>
								index === self.findIndex((s) => s.row === t.row && s.col === t.col)
						)
					}

					sheet.config.deepPermissions[userId] = {
						type: 'cell',
						targets: finalTargets,
						timestamp,
						userName,
					}
					console.log('updateDeepPermissions - 单元格级权限:', {
						userId,
						userName,
						targets: finalTargets,
					})
				}
				break
		}

		// 同步深度权限配置到其他用户
		if (sheet.config.synergy) {
			console.log('✅ 问题二: 同步 deepPermissions 到其他用户:', {
				deepPermissions: sheet.config.deepPermissions,
				emitsExists: !!sheet.emits,
			})
			sheet.emits?.('asyncConfig', {
				deepPermissions: sheet.config.deepPermissions,
			})
		} else {
			console.warn('⚠️ 问题二: synergy 未启用,无法同步 deepPermissions')
		}
	}

	/**
	 * 清除指定区域的 deepPermissions（持久锁定）
	 * 用于剪切操作：清空源区域的数据后，移除该区域的持久锁定
	 * @param {number} row - 起始行索引
	 * @param {number} col - 起始列索引
	 * @param {number} rowEnd - 结束行索引
	 * @param {number} colEnd - 结束列索引
	 */
	const clearDeepPermissions = (row, col, rowEnd, colEnd) => {
		if (!sheet || !sheet.config.synergy) return
		if (sheet.config.auth === 0) return // 无权限模式

		const userId = getCurrentUserId()
		if (!userId) {
			console.warn('clearDeepPermissions: 无法获取当前用户ID')
			return
		}

		// 确保 deepPermissions 对象存在
		if (!sheet.config.deepPermissions) {
			sheet.config.deepPermissions = {}
		}

		// 获取已有的深度权限记录
		const existingPermission = sheet.config.deepPermissions[userId]
		if (!existingPermission) {
			console.log('clearDeepPermissions: 当前用户没有 deepPermissions 记录')
			return
		}

		console.log('✅ clearDeepPermissions 调用:', {
			userId,
			auth: sheet.config.auth,
			clearRange: {row, col, rowEnd, colEnd},
			existingPermission,
		})

		// 根据权限模式清除锁定
		switch (sheet.config.auth) {
			case 1: // 行级权限
				{
					if (existingPermission.type === 'row') {
						const existingTargets = existingPermission.targets || []
						const rowsToClear = []
						for (let r = Math.min(row, rowEnd); r <= Math.max(row, rowEnd); r++) {
							rowsToClear.push(r)
						}

						// 从已有的锁定行中移除要清除的行
						const remainingTargets = existingTargets.filter(
							(r) => !rowsToClear.includes(r)
						)

						if (remainingTargets.length > 0) {
							// 还有其他锁定的行，更新记录
							sheet.config.deepPermissions[userId] = {
								...existingPermission,
								targets: remainingTargets,
								timestamp: Date.now(),
							}
							console.log('clearDeepPermissions - 行级权限（部分清除）:', {
								userId,
								rowsToClear,
								remainingTargets,
							})
						} else {
							// 没有剩余的锁定行，删除整个记录
							delete sheet.config.deepPermissions[userId]
							console.log('clearDeepPermissions - 行级权限（完全清除）:', {
								userId,
								rowsToClear,
							})
						}
					}
				}
				break

			case 2: // 列级权限
				{
					if (existingPermission.type === 'column') {
						const existingTargets = existingPermission.targets || []
						const colsToClear = []
						for (let c = Math.min(col, colEnd); c <= Math.max(col, colEnd); c++) {
							colsToClear.push(c)
						}

						// 从已有的锁定列中移除要清除的列
						const remainingTargets = existingTargets.filter(
							(c) => !colsToClear.includes(c)
						)

						if (remainingTargets.length > 0) {
							sheet.config.deepPermissions[userId] = {
								...existingPermission,
								targets: remainingTargets,
								timestamp: Date.now(),
							}
							console.log('clearDeepPermissions - 列级权限（部分清除）:', {
								userId,
								colsToClear,
								remainingTargets,
							})
						} else {
							delete sheet.config.deepPermissions[userId]
							console.log('clearDeepPermissions - 列级权限（完全清除）:', {
								userId,
								colsToClear,
							})
						}
					}
				}
				break

			case 3: // 单元格级权限
				{
					if (existingPermission.type === 'cell') {
						const existingTargets = existingPermission.targets || []
						const cellsToClear = []
						for (let r = Math.min(row, rowEnd); r <= Math.max(row, rowEnd); r++) {
							for (let c = Math.min(col, colEnd); c <= Math.max(col, colEnd); c++) {
								cellsToClear.push({row: r, col: c})
							}
						}

						// 从已有的锁定单元格中移除要清除的单元格
						const remainingTargets = existingTargets.filter(
							(t) =>
								!cellsToClear.some(
									(clear) => clear.row === t.row && clear.col === t.col
								)
						)

						if (remainingTargets.length > 0) {
							sheet.config.deepPermissions[userId] = {
								...existingPermission,
								targets: remainingTargets,
								timestamp: Date.now(),
							}
							console.log('clearDeepPermissions - 单元格级权限（部分清除）:', {
								userId,
								cellsToClear: cellsToClear.length,
								remainingTargets: remainingTargets.length,
							})
						} else {
							delete sheet.config.deepPermissions[userId]
							console.log('clearDeepPermissions - 单元格级权限（完全清除）:', {
								userId,
								cellsToClear: cellsToClear.length,
							})
						}
					}
				}
				break
		}

		// 同步深度权限配置到其他用户
		if (sheet.config.synergy) {
			console.log('✅ clearDeepPermissions: 同步 deepPermissions 到其他用户:', {
				deepPermissions: sheet.config.deepPermissions,
			})
			sheet.emits?.('asyncConfig', {
				deepPermissions: sheet.config.deepPermissions,
			})
		}
	}

	/**
	 * 检查指定位置是否被其他用户锁定
	 * ✅ 新需求: 优先检查 superPermissions, 然后检查 deepPermissions, 最后检查 permissions
	 * @param {number} row - 行索引
	 * @param {number} col - 列索引
	 * @param {number} rowspan - 行跨度 (默认1)
	 * @param {number} colspan - 列跨度 (默认1)
	 * @returns {{locked: boolean, lockedBy: string|null, reason: string}} 检查结果
	 */
	const checkPermission = (row, col, rowspan = 1, colspan = 1) => {
		// 优先检查 superPermissions（高优先级权限）
		if (sheet?.hooks?.superPermissionsHook) {
			const superCheck = sheet.hooks.superPermissionsHook.checkSuperPermission(
				row,
				col,
				rowspan,
				colspan
			)
			if (superCheck.locked) {
				console.log('checkPermission: 被 superPermissions 锁定')
				return {
					locked: true,
					lockedBy: 'super',
					reason: superCheck.reason,
				}
			}
		}

		// 如果没有被 superPermissions 锁定，继续检查 deepPermissions
		if (!sheet || !sheet.config.synergy) {
			return {locked: false, lockedBy: null, reason: ''}
		}

		if (sheet.config.auth === 0) {
			return {locked: false, lockedBy: null, reason: ''}
		}

		const userId = getCurrentUserId()
		if (!userId) {
			console.warn('checkPermission: 无法获取当前用户ID')
			return {locked: false, lockedBy: null, reason: ''}
		}

		// ✅ 新需求: 先检查 deepPermissions (持久锁定)
		const deepPermissions = sheet.config.deepPermissions || {}
		for (const [permUserId, permission] of Object.entries(deepPermissions)) {
			// 跳过当前用户自己的权限
			if (permUserId === userId) {
				continue
			}

			const {type, targets} = permission

			// 检查目标区域是否与深度权限锁定区域冲突
			for (let r = row; r < row + rowspan; r++) {
				for (let c = col; c < col + colspan; c++) {
					let isLocked = false

					switch (type) {
						case 'row':
							isLocked = targets.includes(r)
							break
						case 'column':
							isLocked = targets.includes(c)
							break
						case 'cell':
							isLocked = targets.some((t) => t.row === r && t.col === c)
							break
					}

					if (isLocked) {
						// 获取用户名
						let userName = permission.userName

						if (!userName) {
							const onlineUsers = sheetStore.getOnline
							if (Array.isArray(onlineUsers)) {
								const user = onlineUsers.find((u) => u && u.id === permUserId)
								userName = user?.name || '其他用户'
							} else {
								userName = '其他用户'
							}
						}

						console.log('checkPermission: 检测到 deepPermissions 锁定!', {
							位置: {r, c},
							锁定类型: type,
							锁定用户: permUserId,
							用户名: userName,
						})
						return {
							locked: true,
							lockedBy: permUserId,
							reason: `该${
								type === 'row' ? '行' : type === 'column' ? '列' : '单元格'
							}已被 ${userName} 锁定`,
						}
					}
				}
			}
		}

		// ✅ 然后检查 permissions (临时锁定)
		const permissions = sheet.config.permissions || {}

		console.log('checkPermission 调用:', {
			检查位置: {row, col, rowspan, colspan},
			当前用户: userId,
			所有权限: permissions,
		})

		// 遍历所有用户的权限
		for (const [permUserId, permission] of Object.entries(permissions)) {
			// 跳过当前用户自己的权限
			if (permUserId === userId) {
				console.log('checkPermission: 跳过当前用户自己的权限', permUserId)
				continue
			}

			const {type, targets} = permission

			// 检查目标区域是否与权限锁定区域冲突
			for (let r = row; r < row + rowspan; r++) {
				for (let c = col; c < col + colspan; c++) {
					let isLocked = false

					switch (type) {
						case 'row':
							isLocked = targets.includes(r)
							break
						case 'column':
							isLocked = targets.includes(c)
							break
						case 'cell':
							isLocked = targets.some((t) => t.row === r && t.col === c)
							break
					}

					if (isLocked) {
						// 获取用户名：优先使用 permission.userName，如果没有再从 sheetStore.getOnline 中获取
						let userName = permission.userName

						if (!userName) {
							// 从 sheetStore.getOnline 中获取用户名
							const onlineUsers = sheetStore.getOnline
							if (Array.isArray(onlineUsers)) {
								const user = onlineUsers.find((u) => u && u.id === permUserId)
								userName = user?.name || '其他用户'
							} else {
								userName = '其他用户'
							}
						}

						console.log('checkPermission: 检测到 permissions 锁定!', {
							位置: {r, c},
							锁定类型: type,
							锁定目标: targets,
							锁定用户: permUserId,
							用户名: userName,
							permissionUserName: permission.userName,
						})
						return {
							locked: true,
							lockedBy: permUserId,
							reason: `该${
								type === 'row' ? '行' : type === 'column' ? '列' : '单元格'
							}已被 ${userName} 锁定`,
						}
					}
				}
			}
		}

		console.log('checkPermission: 未检测到锁定')
		return {locked: false, lockedBy: null, reason: ''}
	}

	/**
	 * 检查指定区域是否所有单元格都为空
	 * @param {number} r - 起始行
	 * @param {number} c - 起始列
	 * @param {number} rr - 结束行
	 * @param {number} cc - 结束列
	 * @returns {boolean} 是否为空
	 */
	const isRangeEmpty = (r, c, rr, cc) => {
		if (!sheet || !sheet.celldata) return true

		const authMode = sheet.config.auth

		switch (authMode) {
			case 1: // 行级权限 - 检查所有选中行的所有列
				for (let row = Math.min(r, rr); row <= Math.max(r, rr); row++) {
					const rowData = sheet.celldata.get(row)
					if (rowData && Array.isArray(rowData)) {
						// 检查该行是否有任何非空单元格
						const hasData = rowData.some(
							(cell) => cell !== undefined && cell !== null && cell !== ''
						)
						if (hasData) {
							return false // 有数据,不为空
						}
					}
				}
				return true // 所有行都为空

			case 2: // 列级权限 - 检查所有选中列的所有行
				for (let col = Math.min(c, cc); col <= Math.max(c, cc); col++) {
					// 遍历所有行,检查该列是否有数据
					for (const [rowIndex, rowData] of sheet.celldata.entries()) {
						if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
							const cellValue = rowData[col]
							if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
								return false // 有数据,不为空
							}
						}
					}
				}
				return true // 所有列都为空

			case 3: // 单元格级权限 - 检查选中的单元格
				for (let row = Math.min(r, rr); row <= Math.max(r, rr); row++) {
					for (let col = Math.min(c, cc); col <= Math.max(c, cc); col++) {
						const rowData = sheet.celldata.get(row)
						if (rowData && Array.isArray(rowData)) {
							const cellValue = rowData[col]
							if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
								return false // 有数据,不为空
							}
						}
					}
				}
				return true // 所有单元格都为空

			default:
				return true
		}
	}

	/**
	 * 释放指定用户的所有权限锁定
	 * @param {string} userId - 用户ID (不传则释放当前用户)
	 */
	const releasePermissions = (userId = null) => {
		if (!sheet || !sheet.config.permissions) return

		const targetUserId = userId || getCurrentUserId()
		if (!targetUserId) return

		delete sheet.config.permissions[targetUserId]
		console.log('releasePermissions - 已释放用户权限:', targetUserId)

		// 同步权限配置到其他用户
		if (sheet.config.synergy) {
			sheet.emits?.('asyncConfig', {
				permissions: sheet.config.permissions,
			})
		}
	}

	/**
	 * 释放指定区域的深度权限锁定 (仅当区域为空时)
	 * ✅ 新需求: 检查区域是否为空,如果为空则删除 deepPermissions 中的记录
	 * @param {number} r - 起始行
	 * @param {number} c - 起始列
	 * @param {number} rr - 结束行
	 * @param {number} cc - 结束列
	 */
	const releaseDeepPermissionsIfEmpty = (r, c, rr, cc) => {
		if (!sheet || !sheet.config.synergy || sheet.config.auth === 0) return

		const userId = getCurrentUserId()
		if (!userId) return

		// 检查区域是否为空
		if (!isRangeEmpty(r, c, rr, cc)) {
			console.log('releaseDeepPermissionsIfEmpty: 区域不为空,不释放锁定', {r, c, rr, cc})
			return
		}

		// 区域为空,删除该用户对该区域的深度锁定
		const deepPermission = sheet.config.deepPermissions?.[userId]
		if (!deepPermission) {
			console.log('releaseDeepPermissionsIfEmpty: 用户没有深度权限记录', userId)
			return
		}

		const {type, targets} = deepPermission

		// 根据权限类型删除对应的锁定
		switch (type) {
			case 'row': {
				// 删除空行的锁定
				const emptyRows = []
				for (let row = Math.min(r, rr); row <= Math.max(r, rr); row++) {
					emptyRows.push(row)
				}
				// 从 targets 中移除空行
				const newTargets = targets.filter((row) => !emptyRows.includes(row))
				if (newTargets.length === 0) {
					// 如果没有锁定的行了,删除整个深度权限记录
					delete sheet.config.deepPermissions[userId]
					console.log('releaseDeepPermissionsIfEmpty: 删除用户的所有行级深度权限', userId)
				} else {
					// 更新 targets
					sheet.config.deepPermissions[userId].targets = newTargets
					console.log('releaseDeepPermissionsIfEmpty: 更新用户的行级深度权限', {
						userId,
						oldTargets: targets,
						newTargets,
					})
				}
				break
			}

			case 'column': {
				// 删除空列的锁定
				const emptyCols = []
				for (let col = Math.min(c, cc); col <= Math.max(c, cc); col++) {
					emptyCols.push(col)
				}
				// 从 targets 中移除空列
				const newTargets = targets.filter((col) => !emptyCols.includes(col))
				if (newTargets.length === 0) {
					// 如果没有锁定的列了,删除整个深度权限记录
					delete sheet.config.deepPermissions[userId]
					console.log('releaseDeepPermissionsIfEmpty: 删除用户的所有列级深度权限', userId)
				} else {
					// 更新 targets
					sheet.config.deepPermissions[userId].targets = newTargets
					console.log('releaseDeepPermissionsIfEmpty: 更新用户的列级深度权限', {
						userId,
						oldTargets: targets,
						newTargets,
					})
				}
				break
			}

			case 'cell': {
				// 删除空单元格的锁定
				const emptyCells = []
				for (let row = Math.min(r, rr); row <= Math.max(r, rr); row++) {
					for (let col = Math.min(c, cc); col <= Math.max(c, cc); col++) {
						emptyCells.push({row, col})
					}
				}
				// 从 targets 中移除空单元格
				const newTargets = targets.filter(
					(t) => !emptyCells.some((ec) => ec.row === t.row && ec.col === t.col)
				)
				if (newTargets.length === 0) {
					// 如果没有锁定的单元格了,删除整个深度权限记录
					delete sheet.config.deepPermissions[userId]
					console.log(
						'releaseDeepPermissionsIfEmpty: 删除用户的所有单元格级深度权限',
						userId
					)
				} else {
					// 更新 targets
					sheet.config.deepPermissions[userId].targets = newTargets
					console.log('releaseDeepPermissionsIfEmpty: 更新用户的单元格级深度权限', {
						userId,
						oldTargets: targets,
						newTargets,
					})
				}
				break
			}
		}

		// 同步深度权限配置到其他用户
		if (sheet.config.synergy) {
			sheet.emits?.('asyncConfig', {
				deepPermissions: sheet.config.deepPermissions,
			})
		}
	}

	/**
	 * 清空所有权限锁定
	 */
	const clearAllPermissions = () => {
		if (!sheet) return
		sheet.config.permissions = {}
		console.log('clearAllPermissions - 已清空所有权限')

		// 同步权限配置到其他用户
		if (sheet.config.synergy) {
			sheet.emits?.('asyncConfig', {
				permissions: sheet.config.permissions,
			})
		}
	}

	/**
	 * 获取所有 permission 区域（用于渲染高亮）
	 * ✅ 新需求: permissions 只显示其他用户的临时锁定,不透明
	 * @returns {Array} permission 区域列表
	 */
	const getPermissionRanges = () => {
		if (!sheet || !sheet.config.permissions) {
			return []
		}

		const permissions = sheet.config.permissions
		const ranges = []

		// 获取当前用户 ID
		const currentUserId = getCurrentUserId()

		// 获取在线用户列表（从 sheetStore.getOnline 获取）
		const onlineUsers = sheetStore.getOnline || []
		const userMap = {}

		// 构建用户映射表
		if (Array.isArray(onlineUsers)) {
			onlineUsers.forEach((user) => {
				if (user && user.id && user.name) {
					userMap[user.id] = user.name
				}
			})
		}

		// ✅ 修复问题2: 检测筛选状态，构建行号映射
		const isFiltered = sheet.config.filtered && sheet.config.filtered.length > 0
		const rowMapping = new Map() // 原始行号 -> 筛选后行号

		if (isFiltered && sheet.rowMapping && Array.isArray(sheet.rowMapping)) {
			sheet.rowMapping.forEach((item) => {
				rowMapping.set(item.originalIndex, item.filteredIndex)
			})
		}

		// 遍历所有用户的权限
		for (const userId in permissions) {
			// ✅ 新需求: 跳过当前用户自己的 permissions
			// if (userId === currentUserId) {
			// 	continue
			// }

			const permission = permissions[userId]
			if (!permission || !permission.type || !permission.targets) continue

			const {type, targets} = permission

			// 获取用户名：优先使用 permission.userName，如果没有再从 userMap 中获取
			const userName = permission.userName || userMap[userId] || userId

			if (type === 'row') {
				// 行级权限：每一行作为一个范围
				// targets.forEach((originalRow) => {
				// ✅ 修复问题2: 在筛选状态下，转换原始行号为筛选后行号
				if (isFiltered) {
					const filteredRowStart = rowMapping.get(targets[0])
					const filteredRowEnd = rowMapping.get(targets[targets.length - 1])
					// 如果该行不在筛选结果中，跳过
					if (filteredRowStart === undefined || filteredRowEnd === undefined) {
						return
					}
					ranges.push({
						r: filteredRowStart,
						c: 0,
						rr: filteredRowEnd,
						cc: sheet.config.colCount - 1,
						type: 'row',
						userId,
						userName: userId === currentUserId ? '' : userName,
						noLock: permission.noLock === true, // ✅ 添加 noLock 属性
						originalRow, // 保留原始行号，用于调试
					})
				} else {
					ranges.push({
						r: targets[0],
						c: 0,
						rr: targets[targets.length - 1],
						cc: sheet.config.colCount - 1,
						type: 'row',
						userId,
						userName,
						noLock: permission.noLock === true, // ✅ 添加 noLock 属性
					})
				}
				// })
			} else if (type === 'column') {
				// 列级权限：每一列作为一个范围
				// ✅ 修复问题2: 列级权限不需要转换（列号在筛选前后保持不变）
				// 但需要调整行范围以匹配筛选后的行数
				// targets.forEach((col) => {
				const maxRow = isFiltered
					? sheet.filterCellData.size - 1
					: sheet.config.rowCount - 1
				ranges.push({
					r: 0,
					c: targets[0],
					rr: maxRow,
					cc: targets[targets.length - 1],
					type: 'column',
					userId,
					userName,
					noLock: permission.noLock === true, // ✅ 添加 noLock 属性
				})
				// })
			} else if (type === 'cell') {
				// 单元格级权限：每个单元格作为一个范围
				targets.forEach((cell) => {
					const originalRow = cell.row
					// ✅ 修复问题2: 在筛选状态下，转换原始行号为筛选后行号
					if (isFiltered) {
						const filteredRow = rowMapping.get(originalRow)
						// 如果该行不在筛选结果中，跳过
						if (filteredRow === undefined) {
							return
						}
						ranges.push({
							r: filteredRow,
							c: cell.col,
							rr: filteredRow,
							cc: cell.col,
							type: 'cell',
							userId,
							userName,
							noLock: permission.noLock === true, // ✅ 添加 noLock 属性
							originalRow, // 保留原始行号，用于调试
						})
					} else {
						ranges.push({
							r: originalRow,
							c: cell.col,
							rr: originalRow,
							cc: cell.col,
							type: 'cell',
							userId,
							userName,
							noLock: permission.noLock === true, // ✅ 添加 noLock 属性
						})
					}
				})
			}
		}

		// 返回副本，避免外部修改
		return ranges.map((range) => ({...range}))
	}

	/**
	 * 获取所有 deepPermission 区域（用于渲染高亮）
	 * ✅ 问题二: deepPermissions 需要排除当前用户自己的
	 * @returns {Array} deepPermission 区域列表
	 */
	const getDeepPermissionRanges = () => {
		if (!sheet || !sheet.config.deepPermissions) {
			return []
		}

		const deepPermissions = sheet.config.deepPermissions
		const ranges = []

		// 获取当前用户 ID
		const currentUserId = getCurrentUserId()

		// 获取在线用户列表
		const onlineUsers = sheetStore.getOnline || []
		const userMap = {}

		// 构建用户映射表
		if (Array.isArray(onlineUsers)) {
			onlineUsers.forEach((user) => {
				if (user && user.id && user.name) {
					userMap[user.id] = user.name
				}
			})
		}

		// ✅ 修复问题2: 检测筛选状态，构建行号映射
		const isFiltered = sheet.config.filtered && sheet.config.filtered.length > 0
		const rowMapping = new Map() // 原始行号 -> 筛选后行号

		if (isFiltered && sheet.rowMapping && Array.isArray(sheet.rowMapping)) {
			sheet.rowMapping.forEach((item) => {
				rowMapping.set(item.originalIndex, item.filteredIndex)
			})
		}

		// 遍历所有用户的深度权限
		for (const userId in deepPermissions) {
			// ✅ 修复问题2: 跳过当前用户自己的 deepPermissions（自身排除）
			if (userId === currentUserId) {
				console.log('getDeepPermissionRanges: 跳过当前用户', userId)
				continue
			}

			const permission = deepPermissions[userId]
			if (!permission || !permission.type || !permission.targets) continue

			const {type, targets} = permission

			// 获取用户名
			const userName = permission.userName || userMap[userId] || userId

			if (type === 'row') {
				// 行级权限：每一行作为一个范围
				targets.forEach((originalRow) => {
					// ✅ 修复问题2: 在筛选状态下，转换原始行号为筛选后行号
					if (isFiltered) {
						const filteredRow = rowMapping.get(originalRow)
						// 如果该行不在筛选结果中，跳过
						if (filteredRow === undefined) {
							return
						}
						ranges.push({
							r: filteredRow,
							c: 0,
							rr: filteredRow,
							cc: sheet.config.colCount - 1,
							type: 'row',
							userId,
							userName,
							noLock: permission.noLock === true, // ✅ 添加 noLock 属性
							originalRow, // 保留原始行号，用于调试
						})
					} else {
						ranges.push({
							r: originalRow,
							c: 0,
							rr: originalRow,
							cc: sheet.config.colCount - 1,
							type: 'row',
							userId,
							userName,
							noLock: permission.noLock === true, // ✅ 添加 noLock 属性
						})
					}
				})
			} else if (type === 'column') {
				// 列级权限：每一列作为一个范围
				// ✅ 修复问题2: 列级权限不需要转换（列号在筛选前后保持不变）
				// 但需要调整行范围以匹配筛选后的行数
				targets.forEach((col) => {
					const maxRow = isFiltered
						? sheet.filterCellData.size - 1
						: sheet.config.rowCount - 1
					ranges.push({
						r: 0,
						c: col,
						rr: maxRow,
						cc: col,
						type: 'column',
						userId,
						userName,
						noLock: permission.noLock === true, // ✅ 添加 noLock 属性
					})
				})
			} else if (type === 'cell') {
				// 单元格级权限：每个单元格作为一个范围
				targets.forEach((cell) => {
					const originalRow = cell.row
					// ✅ 修复问题2: 在筛选状态下，转换原始行号为筛选后行号
					if (isFiltered) {
						const filteredRow = rowMapping.get(originalRow)
						// 如果该行不在筛选结果中，跳过
						if (filteredRow === undefined) {
							return
						}
						ranges.push({
							r: filteredRow,
							c: cell.col,
							rr: filteredRow,
							cc: cell.col,
							type: 'cell',
							userId,
							userName,
							noLock: permission.noLock === true, // ✅ 添加 noLock 属性
							originalRow, // 保留原始行号，用于调试
						})
					} else {
						ranges.push({
							r: originalRow,
							c: cell.col,
							rr: originalRow,
							cc: cell.col,
							type: 'cell',
							userId,
							userName,
							noLock: permission.noLock === true, // ✅ 添加 noLock 属性
						})
					}
				})
			}
		}

		console.log('getDeepPermissionRanges 返回:', {
			总数: ranges.length,
			当前用户: currentUserId,
			已排除当前用户: true,
			筛选状态: isFiltered,
			ranges,
		})

		// 返回副本，避免外部修改
		return ranges.map((range) => ({...range}))
	}

	/**
	 * 监听选区变化,实现动态锁定逻辑
	 * ✅ 新需求: 离开选区时检查是否为空,如果为空则释放 deepPermissions
	 */
	const watchRangeChanges = () => {
		if (rangeWatcher) {
			rangeWatcher() // 停止之前的监听
		}

		if (!sheet?.hooks?.selectionRangeHook) {
			console.warn('watchRangeChanges: selectionRangeHook 不存在')
			return
		}

		rangeWatcher = watch(
			() => sheet.hooks.selectionRangeHook.ranged,
			(newRange, oldRange) => {
				console.log('🔍 watchRangeChanges 触发:', {
					oldRange,
					newRange,
					synergy: sheet.config.synergy,
					auth: sheet.config.auth,
					currentUserRange,
				})

				if (!sheet.config.synergy || sheet.config.auth === 0) {
					console.log('⚠️ synergy 未启用或 auth=0,跳过')
					return
				}

				const userId = getCurrentUserId()
				if (!userId) {
					console.log('⚠️ 无法获取当前用户ID,跳过')
					return
				}

				// 检查是否真的切换了选区
				const rangeChanged =
					oldRange &&
					(oldRange.r !== newRange.r ||
						oldRange.c !== newRange.c ||
						oldRange.rr !== newRange.rr ||
						oldRange.cc !== newRange.cc)

				console.log('🔍 检查选区是否变化:', {
					rangeChanged,
					'oldRange.r': oldRange?.r,
					'newRange.r': newRange?.r,
				})

				if (rangeChanged && oldRange.r !== -1) {
					// 用户离开了之前的选区
					console.log('✅ 用户离开选区:', {
						oldRange,
						'currentUserRange.hasEdited': currentUserRange.hasEdited,
					})

					// ✅ 检查之前的选区是否为空,如果为空则释放 deepPermissions
					releaseDeepPermissionsIfEmpty(oldRange.r, oldRange.c, oldRange.rr, oldRange.cc)

					// 重置编辑状态
					currentUserRange.hasEdited = false
					console.log('✅ 重置 hasEdited 标志,允许下次编辑触发 updateDeepPermissions')
				}

				// 更新当前选区
				if (newRange && newRange.r !== -1) {
					currentUserRange.r = newRange.r
					currentUserRange.c = newRange.c
					currentUserRange.rr = newRange.rr
					currentUserRange.cc = newRange.cc
					currentUserRange.hasEdited = false

					console.log('✅ 用户选中新区域:', {
						newRange,
						currentUserRange,
						hasEdited: currentUserRange.hasEdited,
					})
				}
			},
			{deep: true}
		)
	}

	/**
	 * ❌ 已废弃: 监听单元格数据变化,检测编辑操作
	 *
	 * 原因: celldata 是 Map<number, Array>，编辑时通过 celldata.get(r)[c] = value 修改，
	 * 不会触发 celldata.set()，因此这个监听器永远不会被调用。
	 *
	 * 新方案: 在 useEdit.js 的 blur 函数中直接调用 updateDeepPermissions
	 */
	// const watchCellDataChanges = () => {
	// 	... (已移除)
	// }

	/**
	 * 监听权限模式变化
	 */
	const watchAuthMode = () => {
		if (authWatcher) {
			authWatcher() // 停止之前的监听
		}

		authWatcher = watch(
			() => sheet?.config?.auth,
			(newAuth, oldAuth) => {
				if (newAuth !== oldAuth) {
					console.log('权限模式变化:', {oldAuth, newAuth})
					// 清空所有权限锁定
					clearAllPermissions()

					// 提示用户
					const modeNames = ['关闭', '行级', '列级', '单元格级']
					if (newAuth >= 0 && newAuth <= 3) {
						useDebounce(
							() => {
								ElMessage.info(`权限模式已切换为: ${modeNames[newAuth]}`)
							},
							100,
							'airSheetAuthMode'
						)
					}
				}
			}
		)
	}

	/**
	 * 刷新 sheet 引用
	 * @param {string} id - sheet ID
	 */
	const refreshSheet = (id) => {
		sheet = sheetStore.getSheet(id)
		watchAuthMode()
		watchRangeChanges()
		// watchCellDataChanges()
	}

	/**
	 * 销毁 hook
	 */
	const destroy = () => {
		if (authWatcher) {
			authWatcher()
			authWatcher = null
		}
		if (rangeWatcher) {
			rangeWatcher()
			rangeWatcher = null
		}

		// 重置当前用户选区状态
		currentUserRange = {
			r: -1,
			c: -1,
			rr: -1,
			cc: -1,
			hasEdited: false,
		}

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

		// 确保 permissions 对象存在
		if (!sheet.config.permissions) {
			sheet.config.permissions = {}
		}

		// ✅ 确保 deepPermissions 对象存在
		if (!sheet.config.deepPermissions) {
			sheet.config.deepPermissions = {}
		}

		console.log('✅ usePermissions init:', {
			key,
			auth: sheet.config.auth,
			permissions: sheet.config.permissions,
			deepPermissions: sheet.config.deepPermissions,
		})

		// 开始监听权限模式变化
		watchAuthMode()

		// 延迟启动选区监听,确保其他 hooks 已初始化
		setTimeout(() => {
			// 监听选区变化
			watchRangeChanges()

			// ✅ 修复: 移除 watchCellDataChanges，因为 celldata.set 不会被调用
			// 实际的编辑检测已移至 useEdit.js 的 blur 函数中

			console.log('installed usePermissions with dynamic locking')
		}, 100)

		return {
			updatePermissions,
			updateDeepPermissions, // ✅ 修复: 导出深度权限更新函数
			clearDeepPermissions, // ✅ 新增: 导出深度权限清除函数（用于剪切操作）
			checkPermission,
			releasePermissions,
			clearAllPermissions,
			getPermissionRanges,
			getDeepPermissionRanges, // ✅ 新增: 导出深度权限范围
			refreshSheet,
			destroy,
			isRangeEmpty, // 导出供外部使用
			releaseDeepPermissionsIfEmpty, // ✅ 修复: 导出深度权限释放函数
		}
	}

	return {
		init,
	}
}
