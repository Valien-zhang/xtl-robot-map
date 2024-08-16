import globals from "globals";
import pluginReact from "eslint-plugin-react";


export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    ...pluginReact.configs.flat.recommended, // 引入 React 的推荐配置
  },
];