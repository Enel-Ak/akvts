<template>
	<div class="super-permissions-test">
		<div class="test-header">
			<h2>SuperPermissions 超级权限测试</h2>
			<p>测试超级权限功能，包括权限检查和视觉呈现</p>
		</div>

		<div class="test-controls">
			<el-button @click="testBasicProtection">测试基础保护</el-button>
			<el-button @click="testMultipleRegions">测试多区域保护</el-button>
			<el-button @click="testOverlap">测试区域重叠</el-button>
			<el-button @click="clearProtection">清除保护</el-button>
			<el-button @click="showConfig">查看配置</el-button>
		</div>

		<div class="test-info">
			<el-alert
				title="使用说明"
				type="info"
				:closable="false"
				description="尝试编辑受保护的区域（带有彩色背景和🔐图标），系统会阻止编辑并显示提示信息。"
			/>
		</div>

		<AirSheet ref="sheetRef" :modelValue="sheetData" :config="config" />
	</div>
</template>

<script setup>
import {ref, reactive} from 'vue'
import {ElMessage} from 'element-plus'
import AirSheet from '@/components/AirSheet.vue'

const sheetRef = ref(null)

// 初始配置
const config = reactive({
	rowCount: 30,
	colCount: 15,
	showToolBar: true,
	edit: true,
	superPermissions: [],
})

// 初始数据
const sheetData = ref({
	celldata: [
		// 表头数据
		['姓名', '年龄', '部门', '职位', '工资', '奖金', '总计', '', '', '', '', '', '', '', ''],
		['张三', 28, '技术部', '工程师', 10000, 2000, 12000, '', '', '', '', '', '', '', ''],
		['李四', 32, '销售部', '经理', 15000, 3000, 18000, '', '', '', '', '', '', '', ''],
		['王五', 25, '技术部', '实习生', 5000, 500, 5500, '', '', '', '', '', '', '', ''],
		['赵六', 35, '人事部', '主管', 12000, 2500, 14500, '', '', '', '', '', '', '', ''],
	],
	config: config,
})

// 测试基础保护
const testBasicProtection = () => {
	config.superPermissions = [
		{
			r: 0,
			c: 0,
			rr: 0,
			cc: 14,
			v: '表头行，不可编辑',
		},
	]
	ElMessage.success('已设置表头保护（第1行）')
}

// 测试多区域保护
const testMultipleRegions = () => {
	config.superPermissions = [
		{
			r: 0,
			c: 0,
			rr: 0,
			cc: 14,
			v: '表头区域',
		},
		{
			r: 1,
			c: 6,
			rr: 4,
			cc: 6,
			v: '总计列（公式列）',
		},
		{
			r: 10,
			c: 0,
			rr: 15,
			cc: 5,
			v: '汇总数据区域',
		},
	]
	ElMessage.success('已设置多个保护区域')
}

// 测试区域重叠
const testOverlap = () => {
	config.superPermissions = [
		{
			r: 0,
			c: 0,
			rr: 5,
			cc: 5,
			v: '区域A',
		},
		{
			r: 3,
			c: 3,
			rr: 8,
			cc: 8,
			v: '区域B（与A重叠）',
		},
		{
			r: 6,
			c: 6,
			rr: 10,
			cc: 10,
			v: '区域C（与B重叠）',
		},
	]
	ElMessage.success('已设置重叠保护区域')
}

// 清除保护
const clearProtection = () => {
	config.superPermissions = []
	ElMessage.info('已清除所有保护区域')
}

// 查看配置
const showConfig = () => {
	console.log('当前 superPermissions 配置:', config.superPermissions)
	ElMessage.info('配置已输出到控制台')
}
</script>

<style scoped lang="scss">
.super-permissions-test {
	padding: 20px;
	height: 100vh;
	display: flex;
	flex-direction: column;

	.test-header {
		margin-bottom: 20px;

		h2 {
			margin: 0 0 10px 0;
			color: var(--z-font-color);
		}

		p {
			margin: 0;
			color: var(--z-font-color-secondary);
		}
	}

	.test-controls {
		margin-bottom: 20px;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.test-info {
		margin-bottom: 20px;
	}
}
</style>

