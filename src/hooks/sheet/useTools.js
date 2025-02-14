export const useTools = (config) => {
	// 预置字体列表
	const fonts = {
		宋体: 'FZSSJW, sans-serif',
		楷体: 'FZKTJW, sans-serif',
		黑体: 'FZHTJW, sans-serif',
		Arial: 'Arial, sans-serif',
		Helvetica: 'Helvetica, sans-serif',
		'Times New Roman': 'Times New Roman, sans-serif',
		'Courier New': 'Courier New, sans-serif',
	}
	const fontSize = [12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40]

	return {
		fonts,
		fontSize,
	}
}
