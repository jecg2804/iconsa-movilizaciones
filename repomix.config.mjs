/** @type {import('repomix').RepomixConfigFile} */
export default {
  input: {
    maxFileSize: 50000000,
  },
  output: {
    filePath: 'repomix-output.xml',
    style: 'xml',
    compress: true,
    removeComments: false,
    removeEmptyLines: true,
    git: {
      sortByChanges: true,
      includeLogs: true,
    },
  },
  ignore: {
    customPatterns: [
      'node_modules/**',
      '.next/**',
      'test-results/**',
      'playwright-report/**',
      'Docs/archive/**',
      'Docs/test-screenshots/**',
      '.claude/projects/**',
      '.vercel/**',
      '*.lock',
      'package-lock.json',
      'repomix-output.*',
    ],
  },
  security: {
    enableSecurityCheck: true,
  },
}
