const useEvalHook = (str, ...argument) => {
	try {
		const func = new Function('argument', `return ${str}`)
		return func(argument)
	} catch (e) {
		console.error('Error: useEvalHook Error', e)
	}
}

export default useEvalHook
