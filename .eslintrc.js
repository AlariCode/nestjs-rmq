module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: 'tsconfig.json',
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint/eslint-plugin'],
	extends: [
		'plugin:@typescript-eslint/recommended',
		'plugin:prettier/recommended',
	],
	root: true,
	env: {
		node: true,
		jest: true,
	},
	ignorePatterns: ['.eslintrc.js'],
	rules: {
		"no-empty-function": "off",
		"prettier/prettier": ['error', {
			'singleQuote': true,
			'useTabs': true,
			'semi': true,
			'trailingComma': 'all',
			'bracketSpacing': true,
			'printWidth': 100,
			'endOfLine': 'auto'
		}],
		"@typescript-eslint/no-empty-function": ["off"],
		'@typescript-eslint/interface-name-prefix': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/ban-types': 'off',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-namespace': 'off',
		"prettier/prettier": [
			"error",
			{
				"endOfLine": "auto"
			},
		],
	},

};
