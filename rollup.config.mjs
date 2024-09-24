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
import url from '@rollup/plugin-url';


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
            extensions: ['.less',], // 支持 .less 文件
            use: [
                ['less', { javascriptEnabled: true }], // 配置 Less
            ],
        }),
        del({ targets: 'dist/*', verbose: true }),
        serve({
            contentBase: '',  // 指定 public 作为静态资源路径
            port: 8020,
        }),
        livereload('dist'),
        url({
            // 限制文件大小，小于 10kb 的文件将转换为 base64
            limit: 10 * 1024,
            // 包含图片的文件夹
            include: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg'],
            // 输出的文件夹
            emitFiles: true,
            fileName: '[name][hash][extname]'
        })
    ],
    external: ['react'], // 将这些库排除在打包之外

}
