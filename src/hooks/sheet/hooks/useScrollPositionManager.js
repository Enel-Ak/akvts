/**
 * 滚动位置管理工具
 * 用于保存和恢复多 sheet 切换时的滚动位置和可视区域
 */
export const useScrollPositionManager = () => {
	// 保存 sheet 的滚动位置
	const saveScrollPosition = (sheet, containerId) => {
		if (!containerId) {
			return null
		}

		try {
			const scrollInfo = {
				scrollTop: 0,
				scrollLeft: 0,
				timestamp: Date.now(),
			}

			// 直接从DOM获取滚动位置 - containerId就是滚动容器的ID
			const scrollContainer = document.querySelector(`#${containerId}`)
			if (scrollContainer) {
				scrollInfo.scrollTop = scrollContainer.scrollTop
				scrollInfo.scrollLeft = scrollContainer.scrollLeft

				console.log('保存滚动位置:', containerId, {
					scrollTop: scrollInfo.scrollTop,
					scrollLeft: scrollInfo.scrollLeft,
					containerScrollHeight: scrollContainer.scrollHeight,
					containerClientHeight: scrollContainer.clientHeight,
				})
			} else {
				console.warn('保存滚动位置时未找到容器:', containerId)
			}

			return scrollInfo
		} catch (error) {
			console.warn('保存滚动位置时发生错误:', error)
			return null
		}
	}

	// 恢复 sheet 的滚动位置
	const restoreScrollPosition = (sheet, scrollInfo, containerId, targetSheet) => {
		if (!scrollInfo || !containerId) {
			return false
		}

		try {
			console.log('恢复滚动位置:', containerId, scrollInfo)

			// 智能校验：如果目标sheet的行数小于来源sheet，设置到最底部
			let adjustedScrollInfo = {...scrollInfo}
			if (targetSheet && sheet) {
				const targetRowCount = targetSheet.config?.rowCount || 0
				const currentRowCount = sheet.config?.rowCount || 0

				if (targetRowCount < currentRowCount && scrollInfo.scrollTop > 0) {
					console.log(
						`目标Sheet行数(${targetRowCount})小于来源Sheet行数(${currentRowCount})，将滚动到最底部`
					)
					adjustedScrollInfo.scrollTop = Number.MAX_SAFE_INTEGER // 设置为最大值，后续会被限制到实际最大值
				}
			}

			// 使用requestAnimationFrame确保DOM完全更新后再恢复滚动位置
			requestAnimationFrame(() => {
				setTimeout(() => {
					// 直接设置DOM滚动位置 - containerId就是滚动容器的ID
					const scrollContainer = document.querySelector(`#${containerId}`)
					if (scrollContainer) {
						// 验证滚动位置是否有效
						const maxScrollTop = Math.max(
							0,
							scrollContainer.scrollHeight - scrollContainer.clientHeight
						)
						const maxScrollLeft = Math.max(
							0,
							scrollContainer.scrollWidth - scrollContainer.clientWidth
						)

						const validScrollTop = Math.min(
							Math.max(0, adjustedScrollInfo.scrollTop),
							maxScrollTop
						)
						const validScrollLeft = Math.min(
							Math.max(0, adjustedScrollInfo.scrollLeft),
							maxScrollLeft
						)

						scrollContainer.scrollTop = validScrollTop
						scrollContainer.scrollLeft = validScrollLeft

						// 同步更新相关元素的滚动位置
						// 查找同级的alphabet、number、fn元素
						const parentContainer = scrollContainer.parentElement
						if (parentContainer) {
							const alphabet = parentContainer.querySelector('.air-sheet-alphabet')
							const number = parentContainer.querySelector('.air-sheet-number')
							const fn = parentContainer.querySelector('.air-sheet-fn')

							if (alphabet) {
								alphabet.scrollLeft = validScrollLeft
							}
							if (number) {
								number.scrollTop = validScrollTop
							}
							if (fn) {
								fn.scrollTop = validScrollTop
							}
						}

						console.log(
							`Container ${containerId} 滚动位置恢复成功:`,
							`原始位置 top=${scrollInfo.scrollTop}, left=${scrollInfo.scrollLeft}`,
							`实际位置 top=${validScrollTop}, left=${validScrollLeft}`,
							`容器尺寸 scrollHeight=${scrollContainer.scrollHeight}, clientHeight=${scrollContainer.clientHeight}`
						)
					} else {
						console.warn(`未找到Container ${containerId} 的滚动容器`)
					}
				}, 250) // 增加延迟时间确保DOM完全更新
			})

			return true
		} catch (error) {
			console.warn('恢复滚动位置时发生错误:', error)
			return false
		}
	}

	// 清理过期的滚动位置信息
	const cleanupExpiredScrollPositions = (sheetStore, maxAge = 30 * 60 * 1000) => {
		const now = Date.now()
		const sheets = sheetStore.getAllSheet

		sheets.forEach((sheet) => {
			if (sheet._temp && sheet._temp.scrollPosition) {
				const age = now - sheet._temp.scrollPosition.timestamp
				if (age > maxAge) {
					delete sheet._temp.scrollPosition

					// 如果临时参数为空，删除整个 _temp 对象
					if (Object.keys(sheet._temp).length === 0) {
						delete sheet._temp
					}
				}
			}
		})
	}

	// 获取滚动位置统计信息
	const getScrollPositionStats = (sheetStore) => {
		const sheets = sheetStore.getAllSheet
		const stats = {
			totalSheets: sheets.length,
			sheetsWithScrollPosition: 0,
			averageScrollTop: 0,
			averageScrollLeft: 0,
			oldestTimestamp: null,
			newestTimestamp: null,
		}

		let totalScrollTop = 0
		let totalScrollLeft = 0
		const timestamps = []

		sheets.forEach((sheet) => {
			if (sheet._temp && sheet._temp.scrollPosition) {
				stats.sheetsWithScrollPosition++
				totalScrollTop += sheet._temp.scrollPosition.scrollTop || 0
				totalScrollLeft += sheet._temp.scrollPosition.scrollLeft || 0
				timestamps.push(sheet._temp.scrollPosition.timestamp)
			}
		})

		if (stats.sheetsWithScrollPosition > 0) {
			stats.averageScrollTop = totalScrollTop / stats.sheetsWithScrollPosition
			stats.averageScrollLeft = totalScrollLeft / stats.sheetsWithScrollPosition
		}

		if (timestamps.length > 0) {
			stats.oldestTimestamp = Math.min(...timestamps)
			stats.newestTimestamp = Math.max(...timestamps)
		}

		return stats
	}

	// 批量保存多个 sheet 的滚动位置
	const batchSaveScrollPositions = (sheets) => {
		const results = []

		sheets.forEach(({sheet, sheetId}) => {
			const scrollInfo = saveScrollPosition(sheet, sheetId)
			results.push({
				sheetId,
				success: scrollInfo !== null,
				scrollInfo,
			})
		})

		return results
	}

	// 批量恢复多个 sheet 的滚动位置
	const batchRestoreScrollPositions = (restoreData) => {
		const results = []

		restoreData.forEach(({sheet, scrollInfo, sheetId}) => {
			const success = restoreScrollPosition(sheet, scrollInfo)
			results.push({
				sheetId,
				success,
			})
		})

		return results
	}

	// 创建滚动位置快照
	const createScrollSnapshot = (sheetStore) => {
		const snapshot = {
			timestamp: Date.now(),
			sheets: {},
		}

		const sheets = sheetStore.getAllSheet
		sheets.forEach((sheet) => {
			if (sheet._temp && sheet._temp.scrollPosition) {
				snapshot.sheets[sheet.id] = {...sheet._temp.scrollPosition}
			}
		})

		return snapshot
	}

	// 从快照恢复滚动位置
	const restoreFromSnapshot = (sheetStore, snapshot) => {
		if (!snapshot || !snapshot.sheets) {
			return false
		}

		try {
			Object.entries(snapshot.sheets).forEach(([sheetId, scrollInfo]) => {
				const sheet = sheetStore.getSheet(sheetId)
				if (sheet) {
					if (!sheet._temp) {
						sheet._temp = {}
					}
					sheet._temp.scrollPosition = {...scrollInfo}
				}
			})

			return true
		} catch (error) {
			console.warn('从快照恢复滚动位置时发生错误:', error)
			return false
		}
	}

	return {
		saveScrollPosition,
		restoreScrollPosition,
		cleanupExpiredScrollPositions,
		getScrollPositionStats,
		batchSaveScrollPositions,
		batchRestoreScrollPositions,
		createScrollSnapshot,
		restoreFromSnapshot,
	}
}
