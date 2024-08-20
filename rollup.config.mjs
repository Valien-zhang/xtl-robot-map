import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss'
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import del from "rollup-plugin-delete";
// import { terser } from 'rollup-plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import replace from '@rollup/plugin-replace';


export default {
    input: './src/index.jsx', // 入口文件
    output: [
        // {
        //     format: 'cjs', // 打包为commonjs格式
        //     file: 'dist/robotMap.cjs.js', // 打包后的文件路径名称
        //     name: 'robotMap', // 打包后的默认导出文件名称
        //     sourcemap: true
        // },
        // {
        //     format: 'esm', // 打包为esm格式
        //     file: 'dist/robotMap.esm.js',
        //     name: 'robotMap'
        // },
        {
            format: 'umd', // 打包为umd通用格式
            file: 'dist/robotMap.umd.js', // 输出的文件路径
            name: 'robotMap', // 全局变量名称
            sourcemap: true // 可选项，是否生成 sourcemap
        },
    ],
    plugins: [
        replace({
            preventAssignment: true,
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
            '__DEV__': process.env.NODE_ENV !== 'production',
        }),
        resolve({
            browser: true, // 优先使用适用于浏览器的版本
            preferBuiltins: false, // 不使用 Node.js 内置模块
        }),
        json(),
        commonjs(),
        babel({
            presets: ['@babel/preset-env', '@babel/preset-react'],
            babelHelpers: 'bundled',
            exclude: 'node_modules/**',
            extensions: ['.js', '.jsx'],
        }),
        typescript({ tsconfig: './tsconfig.json' }),
        postcss({
            extensions: ['.less'],
            use: [
                ['less', { javascriptEnabled: true }],
            ],
        }),
        del({ targets: 'dist/*', verbose: true }),
        serve({
            contentBase: "", //服务器启动的文件夹，默认是项目根目录，需要在该文件下创建index.html
            port: 8020,
        }),
        livereload('dist'),
    ],
    external: ['react'], // 将这些库排除在打包之外

}
