export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2,
			'always',
			[
				'build',
				'chore',
				'ci',
				'docs',
				'feat',
				'fix',
				'perf',
				'refactor',
				'revert',
				'style',
				'test',
				'wip',
			],
		],
		'type-empty': [2, 'never'], // 确保 type 不为空
		'subject-empty': [2, 'never'], // 确保 subject 不为空
	},
}
