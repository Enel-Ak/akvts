import {watch} from 'vue'
import {useAirSheetStore} from '../store/useAirSheet'
import {ElMessage} from 'element-plus'

/**
 * 权限管理 Hook
 * 实现细粒度的权限控制功能 (行级/列级/单元格级)
 */
export const usePermissions = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = null
	let sheet = null
	let authWatcher = null

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
	 * @param {number} row - 行索引
	 * @param {number} col - 列索引
	 * @param {number} rowEnd - 结束行索引
	 * @param {number} colEnd - 结束列索引
	 */
	const updatePermissions = (row, col, rowEnd, colEnd) => {
		if (!sheet || !sheet.config.synergy) return
		if (sheet.config.auth === 0) return // 无权限模式

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
					}
					console.log('updatePermissions - 行级权限:', {
						userId,
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
					}
					console.log('updatePermissions - 列级权限:', {
						userId,
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
					}
					console.log('updatePermissions - 单元格级权限:', {
						userId,
						targets,
						allPermissions: sheet.config.permissions,
					})
				}
				break
		}
	}

	/**
	 * 检查指定位置是否被其他用户锁定
	 * @param {number} row - 行索引
	 * @param {number} col - 列索引
	 * @param {number} rowspan - 行跨度 (默认1)
	 * @param {number} colspan - 列跨度 (默认1)
	 * @returns {{locked: boolean, lockedBy: string|null, reason: string}} 检查结果
	 */
	const checkPermission = (row, col, rowspan = 1, colspan = 1) => {
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
						// 从 online 用户列表中获取用户名
						const user = sheet.config.online?.find((u) => u.id === permUserId)
						const userName = user?.name || '其他用户'
						console.log('checkPermission: 检测到锁定!', {
							位置: {r, c},
							锁定类型: type,
							锁定目标: targets,
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

		console.log('checkPermission: 未检测到锁定')
		return {locked: false, lockedBy: null, reason: ''}
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
						ElMessage.info(`权限模式已切换为: ${modeNames[newAuth]}`)
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
	}

	/**
	 * 销毁 hook
	 */
	const destroy = () => {
		if (authWatcher) {
			authWatcher()
			authWatcher = null
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

		// 开始监听权限模式变化
		watchAuthMode()

		setTimeout(() => {
			console.log('installed usePermissions')
		}, 16)

		return {
			updatePermissions,
			checkPermission,
			releasePermissions,
			clearAllPermissions,
			refreshSheet,
			destroy,
		}
	}

	return {
		init,
	}
}
