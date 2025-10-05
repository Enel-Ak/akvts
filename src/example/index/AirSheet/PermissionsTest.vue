<template>
	<div class="permissions-test">
		<div class="control-panel">
			<h3>权限控制测试面板</h3>

			<div class="control-group">
				<label>权限模式:</label>
				<el-radio-group v-model="authMode" @change="onAuthModeChange">
					<el-radio :label="0">关闭</el-radio>
					<el-radio :label="1">行级权限</el-radio>
					<el-radio :label="2">列级权限</el-radio>
					<el-radio :label="3">单元格级权限</el-radio>
				</el-radio-group>
			</div>

			<div class="control-group">
				<label>协同模式:</label>
				<el-switch v-model="synergyMode" @change="onSynergyModeChange" />
				<span class="hint">权限功能需要启用协同模式</span>
			</div>

			<div class="control-group">
				<el-button @click="showPermissions">查看当前权限状态</el-button>
				<el-button @click="clearPermissions">清空所有权限</el-button>
			</div>

			<div class="info-panel">
				<h4>当前状态:</h4>
				<p>权限模式: {{ authModeText }}</p>
				<p>协同模式: {{ synergyMode ? '已启用' : '未启用' }}</p>
				<p>在线用户数: {{ onlineUsers.length }}</p>
			</div>

			<div class="permissions-info">
				<h4>权限锁定信息:</h4>
				<div v-if="Object.keys(permissions).length === 0" class="empty">暂无权限锁定</div>
				<div v-else>
					<div v-for="(perm, userId) in permissions" :key="userId" class="permission-item">
						<strong>用户 {{ getUserName(userId) }}:</strong>
						<span>类型: {{ permTypeText(perm.type) }}</span>
						<span>锁定: {{ formatTargets(perm) }}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="sheet-container">
			<AirSheet
				ref="sheetRef"
				:sheet-data="sheetData"
				:synergy="synergyMode"
				@ready="onSheetReady"
			/>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, watch} from 'vue'
import {ElMessage} from 'element-plus'
import AirSheet from '@/components/AirSheet.vue'
import {useAirSheetStore} from '@/hooks/sheet/store/useAirSheet'

const sheetStore = useAirSheetStore()
const sheetRef = ref(null)
let sheet = null

// 控制状态
const authMode = ref(0)
const synergyMode = ref(true)

// 权限状态
const permissions = ref({})
const onlineUsers = ref([])

// 计算属性
const authModeText = computed(() => {
	const modes = ['关闭', '行级权限', '列级权限', '单元格级权限']
	return modes[authMode.value] || '未知'
})

// 示例数据
const sheetData = ref([
	{
		name: 'Sheet1',
		config: {
			rowCount: 20,
			colCount: 10,
			auth: 0,
			synergy: true,
			permissions: {},
		},
		data: [
			[
				{v: '姓名', s: {bold: true}},
				{v: '年龄', s: {bold: true}},
				{v: '部门', s: {bold: true}},
				{v: '职位', s: {bold: true}},
			],
			[{v: '张三'}, {v: 25}, {v: '技术部'}, {v: '工程师'}],
			[{v: '李四'}, {v: 30}, {v: '产品部'}, {v: '产品经理'}],
			[{v: '王五'}, {v: 28}, {v: '设计部'}, {v: '设计师'}],
		],
	},
])

// Sheet 就绪回调
const onSheetReady = (key) => {
	console.log('Sheet ready:', key)
	sheet = sheetStore.getSheet(key)

	// 监听权限变化
	watch(
		() => sheet?.config?.permissions,
		(newPerms) => {
			permissions.value = {...newPerms}
		},
		{deep: true}
	)

	// 监听在线用户变化
	watch(
		() => sheet?.config?.online,
		(newOnline) => {
			onlineUsers.value = [...(newOnline || [])]
		},
		{deep: true}
	)
}

// 权限模式变化
const onAuthModeChange = (mode) => {
	if (!sheet) {
		ElMessage.warning('Sheet 未就绪')
		return
	}

	if (!synergyMode.value) {
		ElMessage.warning('请先启用协同模式')
		authMode.value = 0
		return
	}

	sheet.config.auth = mode
	console.log('权限模式已切换为:', mode)
}

// 协同模式变化
const onSynergyModeChange = (enabled) => {
	if (!sheet) {
		ElMessage.warning('Sheet 未就绪')
		return
	}

	sheet.config.synergy = enabled

	if (!enabled) {
		authMode.value = 0
		sheet.config.auth = 0
		ElMessage.info('协同模式已关闭,权限功能已禁用')
	} else {
		ElMessage.success('协同模式已启用')
	}
}

// 查看权限状态
const showPermissions = () => {
	if (!sheet) {
		ElMessage.warning('Sheet 未就绪')
		return
	}

	console.log('当前权限状态:', sheet.config.permissions)
	ElMessage.info('权限状态已输出到控制台')
}

// 清空权限
const clearPermissions = () => {
	if (!sheet || !sheet.hooks.permissionsHook) {
		ElMessage.warning('权限功能未初始化')
		return
	}

	sheet.hooks.permissionsHook.clearAllPermissions()
	ElMessage.success('已清空所有权限锁定')
}

// 获取用户名
const getUserName = (userId) => {
	const user = onlineUsers.value.find((u) => u.id === userId)
	return user?.name || userId
}

// 权限类型文本
const permTypeText = (type) => {
	const types = {
		row: '行级',
		column: '列级',
		cell: '单元格级',
	}
	return types[type] || type
}

// 格式化锁定目标
const formatTargets = (perm) => {
	if (perm.type === 'cell') {
		return perm.targets.map((t) => `(${t.row},${t.col})`).join(', ')
	} else if (perm.type === 'row') {
		return `行 ${perm.targets.join(', ')}`
	} else if (perm.type === 'column') {
		return `列 ${perm.targets.join(', ')}`
	}
	return ''
}
</script>

<style scoped lang="scss">
.permissions-test {
	display: flex;
	height: 100vh;
	gap: 20px;
	padding: 20px;
	background: #f5f5f5;

	.control-panel {
		width: 350px;
		background: white;
		border-radius: 8px;
		padding: 20px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow-y: auto;

		h3 {
			margin: 0 0 20px 0;
			font-size: 18px;
			color: #333;
		}

		h4 {
			margin: 15px 0 10px 0;
			font-size: 14px;
			color: #666;
		}

		.control-group {
			margin-bottom: 20px;

			label {
				display: block;
				margin-bottom: 8px;
				font-size: 14px;
				color: #666;
			}

			.hint {
				display: block;
				margin-top: 5px;
				font-size: 12px;
				color: #999;
			}
		}

		.info-panel {
			padding: 15px;
			background: #f9f9f9;
			border-radius: 4px;
			margin-bottom: 20px;

			p {
				margin: 5px 0;
				font-size: 13px;
				color: #666;
			}
		}

		.permissions-info {
			padding: 15px;
			background: #fff9e6;
			border-radius: 4px;
			border: 1px solid #ffe58f;

			.empty {
				color: #999;
				font-size: 13px;
				text-align: center;
				padding: 10px;
			}

			.permission-item {
				padding: 8px;
				margin-bottom: 8px;
				background: white;
				border-radius: 4px;
				font-size: 12px;

				strong {
					display: block;
					margin-bottom: 4px;
					color: #333;
				}

				span {
					display: block;
					color: #666;
					margin-left: 10px;
				}
			}
		}
	}

	.sheet-container {
		flex: 1;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}
}
</style>

