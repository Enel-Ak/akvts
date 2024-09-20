export const useGeneratePassword = () => {
	const specialChars = '!@#$%^&*_+<>'
	const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz'
	const numbers = '0123456789'

	const allChars = uppercaseChars + lowercaseChars + numbers

	let password = ''
	password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)]
	password += numbers[Math.floor(Math.random() * numbers.length)]
	password += numbers[Math.floor(Math.random() * numbers.length)]
	password += specialChars[Math.floor(Math.random() * specialChars.length)]
	password += specialChars[Math.floor(Math.random() * specialChars.length)]

	for (let i = password.length; i < 10; i++) {
		password += allChars[Math.floor(Math.random() * allChars.length)]
	}

	// 打乱密码中的字符顺序
	password = password
		.split('')
		.sort(() => Math.random() - 0.5)
		.join('')

	return password
}
