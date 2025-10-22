import {useAirSheetStore} from '@/hooks/sheet/store/useAirSheet'
import {focusableStack} from 'element-plus/es/components/focus-trap/index.mjs'

const EventMap = {
	EventClicked: 'OnEventClicked', // 接收到单元格点击
	CreateSheet: 'OnSheetCreated', // 创建sheet
	DeletedSheet: 'OnSheetDeleted', // 删除Sheet
	JoinSheetGroup: 'OnJoinSheetGroup', // 加入sheet
	LeaveSheetGroup: 'OnLeaveSheetGroup', // 离开sheet, 切换sheet
	CellDataChanged: 'OnCellDataChanged', // 单元格数据变化
	OnlineUsered: 'OnOnlineUsered', // 获取在线用户
	UserLeaved: 'OnUserLeaved', //  用户离开
	SheetUpdated: 'OnSheetUpdated', // sheet更新(名称)
	RowInserted: 'OnRowInserted', // 添加行
	ColInserted: 'OnColInserted', // 添加列
	RowDeleted: 'OnRowDeleted', // 删除行
	ColDeleted: 'OnColDeleted', // 删除列
	OperationReverted: 'OnOperationReverted', // 撤销行列添加/删除
	DynamicTableCreated: 'OnDynamicTableCreated', // 动态表创建完成
	PermissionsChanged: 'OnSheetPermissionsChanged', // 权限变化
}

export const useSynergyEvent = (sheetId, signalr) => {
	// 🔍 调试日志: 追踪 useSynergyEvent 调用
	console.log('🔍 [DEBUG] useSynergyEvent called', {
		sheetId,
		signalrInstance: signalr,
		stack: new Error().stack,
	})

	const sheetStore = useAirSheetStore()
	let sheetKey = sheetId
	let sheet = sheetStore.getSheet(sheetKey) // 初始化时就获取 sheet
	const dynamic = []

	useSynergyEvent.refreshSheet = (id) => {
		sheetKey = id
		sheet = sheetStore.getSheet(sheetKey)
	}

	// 生成用户颜色的辅助函数
	const generateUserColor = (userId) => {
		// 使用预定义的颜色列表
		const colors = [
			'hsl(0, 75%, 55%)', // 红色
			'hsl(30, 75%, 55%)', // 橙色
			'hsl(60, 75%, 55%)', // 黄色
			'hsl(120, 75%, 45%)', // 绿色
			'hsl(180, 75%, 45%)', // 青色
			'hsl(210, 75%, 55%)', // 蓝色
			'hsl(270, 75%, 55%)', // 紫色
			'hsl(300, 75%, 55%)', // 粉色
			'hsl(330, 75%, 55%)', // 玫红
			'hsl(45, 75%, 50%)', // 金色
		]

		// 基于 userId 生成一致的颜色索引
		let hash = 0
		for (let i = 0; i < userId.length; i++) {
			hash = userId.charCodeAt(i) + ((hash << 5) - hash)
		}
		const index = Math.abs(hash) % colors.length

		return colors[index]
	}

	// 高亮组用户
	useSynergyEvent.groupUsers = (user) => {
		console.log('🔍 [DEBUG] groupUsers 被调用，原始 user 对象:', user)
		console.log('🔍 [DEBUG] sheet.props.userKeys:', sheet.props.userKeys)

		const userId = user[sheet.props.userKeys[0]]
		console.log('🔍 [DEBUG] 提取的 userId:', userId)

		const u = sheet.config.online.find((f) => f.id === userId)

		console.log('🔍 [DEBUG] groupUsers 调用:', {
			userId,
			row: user.row,
			col: user.col,
			rowEnd: user.rowEnd,
			colEnd: user.colEnd,
			existingUser: u ? '更新' : '新增',
			currentOnlineUsers: sheet.config.online.length,
		})

		if (u) {
			// 更新在线用户，包含完整的选区范围
			const updated = {
				r: user.row !== null ? user.row : u.r,
				c: user.col !== null ? user.col : u.c,
				rr:
					user.rowEnd !== null && user.rowEnd !== undefined
						? user.rowEnd
						: user.row !== null
						? user.row
						: u.rr,
				cc:
					user.colEnd !== null && user.colEnd !== undefined
						? user.colEnd
						: user.col !== null
						? user.col
						: u.cc,
			}
			Object.assign(u, updated)
			console.log('groupUsers 更新后:', {userId, ...updated})
			return
		}

		// 生成用户专属颜色
		const userColor = generateUserColor(userId)

		const newUser = {
			id: userId,
			name: user[sheet.props.userKeys[1]] || '用户',
			r: user.row,
			c: user.col,
			rr: user.rowEnd !== null && user.rowEnd !== undefined ? user.rowEnd : user.row,
			cc: user.colEnd !== null && user.colEnd !== undefined ? user.colEnd : user.col,
			state: 1,
			color: userColor, // ✅ 添加颜色字段
		}
		sheet.config.online.push(newUser)
		console.log('✅ [接收] groupUsers 新增用户:', newUser, '颜色:', userColor)
		console.log('✅ [接收] 当前 online 数组:', sheet.config.online)
	}

	// 移除高亮组用户
	useSynergyEvent.removeGroupUser = (id) => {
		sheet.config.online = sheet.config.online.filter((f) => f.id !== id)
	}

	const isCurrentSheet = (sheetId) => sheet.original.sheetId !== sheetId

	signalr.on(EventMap.SheetUpdated, (res) => {
		console.log('onSheetUpdated', res)
		sheetStore.setSheetName(res.sheetId, res.sheetName)
	})

	signalr.on(EventMap.CreateSheet, (res) => {
		console.log('onCreateSheet', res)
		const originalConfig = sheet.original.config
		sheetStore.addSheet(
			{id: res.sheetId, name: res.sheetName},
			sheet.props,
			sheet.emits,
			(curSheet) => {
				Object.assign(curSheet.config, originalConfig)
				Object.assign(curSheet.original, {
					config: originalConfig,
				})
			}
		)
	})

	signalr.on(EventMap.DeletedSheet, (res) => {
		console.log('onDeletedSheet 接收到删除通知:', res)

		const deleteId = res.sheetId

		console.log('协同删除 sheet:', {
			deleteId,
			allSheets: sheetStore.getAllSheet.map(([k, v]) => ({
				key: k,
				id: v.id,
				sheetId: v.original?.sheetId,
				name: v.name,
			})),
		})

		// 执行删除操作（让组件层的 watch 来处理切换）
		sheetStore.deleteSheet(deleteId)
		console.log('协同删除：sheet 已删除，等待组件层 watch 触发切换')
	})

	signalr.on(EventMap.JoinSheetGroup, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
	})

	signalr.on(EventMap.LeaveSheetGroup, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		const userId = res[sheet.props.userKeys[0]]
		console.log('OnLeaveSheetGroup - 用户离开 sheet:', userId)

		// 移除高亮
		useSynergyEvent.removeGroupUser(userId)

		// 清理离开用户的权限锁定
		if (sheet.hooks.permissionsHook) {
			sheet.hooks.permissionsHook.releasePermissions(userId)
			console.log('OnLeaveSheetGroup - 已清除用户权限:', userId)
		}
	})

	signalr.on(EventMap.EventClicked, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}

		// 处理配置同步
		if (res.config) {
			const config = JSON.parse(res.config)
			const configKeys = Object.keys(config)
			console.log(
				'EventCell 配置键:',
				configKeys,
				sheet.config,
				JSON.parse(res.config),
				config
			)

			configKeys.forEach((key) => {
				sheet.config[key] = config[key]
			})

			if (configKeys.includes('formulaed')) {
				// 协同同步时，需要清除所有公式单元格的计算值，然后重新计算
				const formulaedKeys = Object.keys(config.formulaed || {})
				formulaedKeys.forEach((key) => {
					const [r, c] = key.split('-').map(Number)
					const formula = config.formulaed[key]
					if (formula && formula.startsWith('=')) {
						// 清除计算值，保留公式
						if (sheet.celldata.has(r) && sheet.celldata.get(r)[c] !== undefined) {
							sheet.celldata.get(r)[c] = formula
						}
					}
				})

				// 确保公式配置更新后重新计算所有公式
				setTimeout(() => {
					sheet.hooks.editHook.setFormulaValue()
				}, 0)
			}

			if (configKeys.includes('merged')) {
				sheet.hooks.mergeHook.refreshMerge()

				// 强制触发界面重新渲染，确保合并单元格状态变化立即生效
				setTimeout(() => {
					// 触发重新渲染以更新合并单元格的显示状态
					if (sheet.hooks.renderHook && sheet.hooks.renderHook.getRenderResult) {
						// 通过更新一个无关紧要的状态来触发重新渲染
						sheet.state.lastMergeUpdate = Date.now()
					}
				}, 0)
			}

			// 只有在特定配置更新时才触发公式重新计算
			// permissions 和 superPermissions 的更新不应该触发公式重新计算
			const formulaRelatedKeys = [
				'formulaed',
				'formulaMap',
				'merged',
				'rResize',
				'cResize',
				'styled',
				'locked',
			]
			const hasFormulaRelatedUpdate = configKeys.some((key) =>
				formulaRelatedKeys.includes(key)
			)

			if (hasFormulaRelatedUpdate && Object.keys(sheet.config.formulaed || {}).length > 0) {
				// 清除所有公式单元格的计算值，确保重新计算
				const formulaedKeys = Object.keys(sheet.config.formulaed || {})
				formulaedKeys.forEach((key) => {
					const [r, c] = key.split('-').map(Number)
					const formula = sheet.config.formulaed[key]
					if (formula && formula.startsWith('=')) {
						// 清除计算值，保留公式
						if (sheet.celldata.has(r) && sheet.celldata.get(r)[c] !== undefined) {
							sheet.celldata.get(r)[c] = formula
						}
					}
				})

				setTimeout(() => {
					sheet.hooks.editHook.setFormulaValue()
				}, 100) // 增加延迟，确保所有配置和数据都已更新
			} else if (configKeys.length > 0) {
				console.log('检测到非公式相关配置更新，跳过公式重新计算:', configKeys)
			}
		}

		if (
			res.hasOwnProperty('row') &&
			res.hasOwnProperty('col') &&
			res.row >= 0 &&
			res.col >= 0
		) {
			useSynergyEvent.groupUsers(res)
		} else {
			console.warn('⚠️ [WARNING] EventCell 缺少 row/col 信息，无法更新在线用户选区', res)
		}
	})

	signalr.on(EventMap.CellDataChanged, async (res) => {
		console.log('CellDataChanged 接收到协同消息:', {
			sheetId: res.sheetId,
			row: res.row,
			col: res.col,
			value: res.value,
			currentSheet: sheet.original.sheetId,
			isCurrentSheet: isCurrentSheet(res.sheetId),
		})
		if (isCurrentSheet(res.sheetId)) {
			return
		}

		const cellEl = document
			.querySelector(`#${sheet.containerId}`)
			.querySelector(`[data-cell="${res.row}-${res.col}"]`)

		if (cellEl) {
			cellEl.innerText = res.value
		}

		if (!sheet.celldata.get(res.row)) {
			sheet.celldata.set(res.row, [])
		}

		setTimeout(() => {
			sheet.hooks.editHook.setCellValue(res.row, res.col, res.value)
			sheet.hooks.editHook.setRowHeight(res.row, res.col, false)

			// 检查这个单元格是否被其他公式引用，如果是，需要重新计算那些公式
			let needsFormulaRecalculation = false

			// 遍历所有公式的引用映射，查找是否有公式引用了这个单元格
			Object.keys(sheet.config.formulaMap || {}).forEach((formulaKey) => {
				const references = sheet.config.formulaMap[formulaKey] || []
				const isReferenced = references.some(
					(ref) => ref.r === res.row && ref.c === res.col
				)

				if (isReferenced) {
					needsFormulaRecalculation = true
					// 清除引用这个单元格的公式的计算值
					const [formulaRow, formulaCol] = formulaKey.split('-').map(Number)
					const formula = sheet.config.formulaed[formulaKey]
					if (formula && formula.startsWith('=')) {
						if (
							sheet.celldata.has(formulaRow) &&
							sheet.celldata.get(formulaRow)[formulaCol] !== undefined
						) {
							sheet.celldata.get(formulaRow)[formulaCol] = formula
						}
					}
				}
			})

			// 如果有公式引用了这个单元格，触发重新计算
			if (needsFormulaRecalculation) {
				setTimeout(() => {
					sheet.hooks.editHook.setFormulaValue()
				}, 50)
			}
		}, 120)
	})

	signalr.on(EventMap.RowInserted, async (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		console.log('RowInserted 接收到添加行事件:', {
			startIndex: res.startIndex,
			count: res.count,
			hasCelldata: !!res.celldata,
			celldataLength: res.celldata?.length || 0,
		})

		// ✅ 修复：先恢复 celldata 数据到临时存储，避免被 addRow 的数据移动覆盖
		const tempCelldata = new Map()
		if (res.celldata && Array.isArray(res.celldata)) {
			console.log('RowInserted 预处理 celldata:', res.celldata.length, '个单元格')

			// celldata 格式: [[行索引, 列索引, 值], [行索引, 列索引, 值], ...]
			// 注意：这里的行索引是添加行操作之前的索引，需要在 addRow 之后再写入
			res.celldata.forEach(([row, col, value]) => {
				if (!tempCelldata.has(row)) {
					tempCelldata.set(row, new Map())
				}
				tempCelldata.get(row).set(col, value)
			})
		}

		// 执行添加行操作（会移动 >= startIndex 的所有行）
		await sheet.hooks.toolsHook.addRow(null, false, false, {
			startIndex: res.startIndex,
			count: res.count,
		})

		// ✅ 修复：在 addRow 之后，将临时存储的 celldata 写入正确的位置
		// 关键：celldata 中的行索引需要根据 startIndex 和 count 进行映射
		if (tempCelldata.size > 0) {
			console.log('RowInserted 恢复 celldata 到正确位置')

			tempCelldata.forEach((colMap, originalRow) => {
				// ✅ 修复：计算新的行索引
				// 如果原始行 >= startIndex，需要加上 count（因为 addRow 会移动这些行）
				const newRow = originalRow >= res.startIndex ? originalRow + res.count : originalRow

				console.log(`RowInserted 行索引映射: ${originalRow} -> ${newRow}`)

				// 确保行存在
				if (!sheet.celldata.get(newRow)) {
					sheet.celldata.set(newRow, [])
				}

				const rowData = sheet.celldata.get(newRow)
				colMap.forEach((value, col) => {
					// 设置单元格值
					rowData[col] = value

					// 更新 DOM 元素
					setTimeout(() => {
						const cellEl = document
							.querySelector(`#${sheet.containerId}`)
							?.querySelector(`[data-cell="${newRow}-${col}"]`)

						if (cellEl) {
							cellEl.innerText = value || ''
						}

						// 使用 editHook 的方法来正确设置单元格值和行高
						if (sheet.hooks.editHook) {
							sheet.hooks.editHook.setCellValue(newRow, col, value)
							sheet.hooks.editHook.setRowHeight(newRow, col, false)
						}
					}, 100)
				})
			})
		}
	})

	signalr.on(EventMap.RowDeleted, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		console.log('RowDeleted', res)
		sheet.hooks.toolsHook.removeRow(null, false, {
			startIndex: res.startIndex,
			count: res.count,
		})
	})

	signalr.on(EventMap.ColInserted, async (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		console.log('ColInserted 接收到添加列事件:', {
			startIndex: res.startIndex,
			count: res.count,
			hasCelldata: !!res.celldata,
			celldataLength: res.celldata?.length || 0,
		})

		// ✅ 修复：先恢复 celldata 数据到临时存储，避免被 addColumn 的数据移动覆盖
		const tempCelldata = new Map()
		if (res.celldata && Array.isArray(res.celldata)) {
			console.log('ColInserted 预处理 celldata:', res.celldata.length, '个单元格')

			// celldata 格式: [[行索引, 列索引, 值], [行索引, 列索引, 值], ...]
			// 注意：这里的列索引是添加列操作之前的索引，需要在 addColumn 之后再写入
			res.celldata.forEach(([row, col, value]) => {
				if (!tempCelldata.has(row)) {
					tempCelldata.set(row, new Map())
				}
				tempCelldata.get(row).set(col, value)
			})
		}

		// 执行添加列操作（会移动 >= startIndex 的所有列）
		await sheet.hooks.toolsHook.addColumn(null, false, false, {
			startIndex: res.startIndex,
			count: res.count,
		})

		// ✅ 修复：在 addColumn 之后，将临时存储的 celldata 写入正确的位置
		// 关键：celldata 中的列索引需要根据 startIndex 和 count 进行映射
		if (tempCelldata.size > 0) {
			console.log('ColInserted 恢复 celldata 到正确位置')

			tempCelldata.forEach((colMap, row) => {
				// 确保行存在
				if (!sheet.celldata.get(row)) {
					sheet.celldata.set(row, [])
				}

				const rowData = sheet.celldata.get(row)
				colMap.forEach((originalCol, value) => {
					// ✅ 修复：计算新的列索引
					// 如果原始列 >= startIndex，需要加上 count（因为 addColumn 会移动这些列）
					const newCol =
						originalCol >= res.startIndex ? originalCol + res.count : originalCol

					console.log(`ColInserted 列索引映射: ${originalCol} -> ${newCol}`)

					// 设置单元格值
					rowData[newCol] = value

					// 更新 DOM 元素
					setTimeout(() => {
						const cellEl = document
							.querySelector(`#${sheet.containerId}`)
							?.querySelector(`[data-cell="${row}-${newCol}"]`)

						if (cellEl) {
							cellEl.innerText = value || ''
						}

						// 使用 editHook 的方法来正确设置单元格值和行高
						if (sheet.hooks.editHook) {
							sheet.hooks.editHook.setCellValue(row, newCol, value)
							sheet.hooks.editHook.setRowHeight(row, newCol, false)
						}
					}, 100)
				})
			})
		}
	})

	signalr.on(EventMap.ColDeleted, (res) => {
		console.log('ColDeleted', res)
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		console.log('ColDeleted', res)
		sheet.hooks.toolsHook.removeColumn(null, false, {
			startIndex: res.startIndex,
			count: res.count,
		})
	})

	signalr.on(EventMap.OnlineUsered, (res) => {
		console.log('OnlineUsered', res)

		const arr = []
		res.forEach((item) => {
			arr.push({
				id: item.userId,
				name: item.userName || '用户',
				bigDepartmentId: item.bigDepartmentId,
				bigDepartmentName: item.bigDepartmentName,
				departmentId: item.departmentId,
				departmentName: item.departmentName,
				isOnline: item.isOnline,
			})
		})

		sheetStore.setOnline(arr)
	})

	signalr.on(EventMap.UserLeaved, (res) => {
		console.log('OnUserLeaved', res)
		// useSynergyEvent.removeGroupUser(res.userId)
		sheetStore.removeOnlineUser(res.userId)
		console.log('OnUserLeaved', sheetStore.getOnline)
		// 清理离开用户的权限锁定
		if (sheet.hooks.permissionsHook) {
			sheet.hooks.permissionsHook.releasePermissions(res.userId)
		}
	})

	signalr.on(EventMap.OperationReverted, async (res) => {
		console.log('OperationReverted 接收到撤销通知:', res, isCurrentSheet(res.sheetId))

		if (isCurrentSheet(res.sheetId)) {
			return
		}

		// actionType: 1 插入, 3 删除
		// targetType: 1 cell, row 2, col 3, sheet 4, table 5

		try {
			// 撤销插入操作 = 执行删除
			if (res.actionType === 1) {
				if (res.targetType === 2) {
					// 撤销插入行 = 删除行
					console.log('执行撤销插入行操作(删除行)', {
						startIndex: res.startIndex,
						count: res.count,
					})
					await sheet.hooks.toolsHook.removeRow(null, false, {
						startIndex: res.startIndex,
						count: res.count,
					})
				} else if (res.targetType === 3) {
					// 撤销插入列 = 删除列
					console.log('执行撤销插入列操作(删除列)', {
						startIndex: res.startIndex,
						count: res.count,
					})
					await sheet.hooks.toolsHook.removeColumn(null, false, {
						startIndex: res.startIndex,
						count: res.count,
					})
				}
			}
			// 撤销删除操作 = 执行插入
			else if (res.actionType === 3) {
				if (res.targetType === 2) {
					// 撤销删除行 = 插入行
					console.log('执行撤销删除行操作(插入行)', {
						startIndex: res.startIndex,
						count: res.count,
					})
					await sheet.hooks.toolsHook.addRow(null, false, false, {
						startIndex: res.startIndex,
						count: res.count,
					})
				} else if (res.targetType === 3) {
					// 撤销删除列 = 插入列
					console.log('执行撤销删除列操作(插入列)', {
						startIndex: res.startIndex,
						count: res.count,
					})
					await sheet.hooks.toolsHook.addColumn(null, false, false, {
						startIndex: res.startIndex,
						count: res.count,
					})
				}
			}

			// 处理单元格数据恢复 (参考 CellDataChanged 事件处理器)
			if (res.cellData && Array.isArray(res.cellData)) {
				try {
					// celldata 格式: [[行索引, 列索引, 值], [行索引, 列索引, 值], ...]
					res.cellData.forEach(([row, col, value]) => {
						// 更新 DOM 元素
						const cellEl = document
							.querySelector(`#${sheet.containerId}`)
							?.querySelector(`[data-cell="${row}-${col}"]`)

						if (cellEl) {
							cellEl.innerText = value || ''
						}

						// 更新数据模型
						if (!sheet.celldata.get(row)) {
							sheet.celldata.set(row, [])
						}

						sheet.celldata.get(row)[col] = value
					})
				} catch (error) {
					console.error('OperationReverted 恢复单元格数据失败:', error)
				}
			}

			// 处理配置恢复 (参考 EventClicked 事件处理器)
			if (res.config) {
				try {
					const config = JSON.parse(res.config)
					const configKeys = Object.keys(config)
					console.log('OperationReverted 恢复配置:', configKeys, config)

					configKeys.forEach((key) => {
						sheet.config[key] = config[key]
					})

					// 如果包含公式配置,需要清除计算值并重新计算
					if (configKeys.includes('formulaed')) {
						const formulaedKeys = Object.keys(config.formulaed || {})

						formulaedKeys.forEach((key) => {
							const [r, c] = key.split('-').map(Number)
							const formula = config.formulaed[key]
							if (formula && formula.startsWith('=')) {
								// 清除计算值，保留公式
								if (
									sheet.celldata.has(r) &&
									sheet.celldata.get(r)[c] !== undefined
								) {
									sheet.celldata.get(r)[c] = formula
								}
							}
						})

						// 重新计算所有公式
						setTimeout(() => {
							sheet.hooks.editHook.setFormulaValue()
						}, 0)
					}

					// 如果包含合并单元格配置,需要刷新合并状态
					if (configKeys.includes('merged')) {
						sheet.hooks.mergeHook.refreshMerge()
						// 强制触发界面重新渲染
						setTimeout(() => {
							if (sheet.hooks.renderHook && sheet.hooks.renderHook.getRenderResult) {
								sheet.state.lastMergeUpdate = Date.now()
							}
						}, 0)
					}
				} catch (error) {
					console.error('OperationReverted 解析配置失败:', error)
				}
			}
		} catch (error) {
			console.error('处理撤销操作失败:', error)
		}
	})

	signalr.on(EventMap.PermissionsChanged, (res) => {
		sheet?.emits('asyncPermissionsChanged', res)
	})

	signalr.on(EventMap.DynamicTableCreated, (res) => {
		if (!dynamic.includes('Row') && res.name === 'Row') {
			dynamic.push('Row')
		}
		if (!dynamic.includes('Col') && res.name === 'Col') {
			dynamic.push('Col')
		}
		if (!dynamic.includes('Cell') && res.name === 'Cell') {
			dynamic.push('Cell')
		}

		if (dynamic.includes('Row') && dynamic.includes('Col') && dynamic.includes('Cell')) {
			dynamic.length = 0
			sheet.state.loading = false
			sheet.state.msg = ''
			sheet?.emits('asyncCompleted')
		}
	})
}

export default {
	useSynergyEvent,
}
