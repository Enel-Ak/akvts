export default function useColor() {
	// 随机色相：0 ~ 360
	const h = Math.floor(Math.random() * 360)
	// 保证颜色不会太灰暗或太浅
	const s = Math.floor(Math.random() * 40) + 60 // 饱和度 60%~100%
	const l = Math.floor(Math.random() * 30) + 30 // 亮度 30%~60%

	return `hsl(${h}, ${s}%, ${l}%)`
}
