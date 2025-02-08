export const useTools = (config) => {
	// 预置字体列表
	const fonts = {
		宋体: 'STSong',
		简宋: 'SimSong-Regular',
		楷体: 'STKaiti',
		黑体: 'STHeitiTC-Medium',
		Arial: 'Arial',
		Helvetica: 'Helvetica',
		'Times New Roman': 'Times New Roman',
		'Courier New': 'Courier New',
	}
	const fontSize = [12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40]

	return {
		fonts,
		fontSize,
	}
}
