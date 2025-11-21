import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // 开启 Vite 内置的 Terser 混淆
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console.log
        drop_debugger: true, // 移除 debugger
        pure_funcs: ['console.info', 'console.debug', 'console.trace'], // 移除特定函数调用
        passes: 2, // 多次压缩以进一步减小体积
        unsafe: true, // 启用不安全的优化（更激进的压缩）
        unsafe_comps: true, // 优化比较操作
        unsafe_math: true, // 优化数学运算
        unsafe_methods: true, // 优化方法调用
      },
      mangle: {
        toplevel: true, // 混淆顶级作用域
        properties: {
          regex: /^_/, // 混淆以下划线开头的属性（可选，根据你的代码风格调整）
        },
      },
      format: {
        comments: false, // 移除所有注释
      },
    },
    rollupOptions: {
      // 配置多页面应用入口
      // 确保你项目中的 HTML 文件都在这里列出
      input: {
        main: 'index.html',
        story: 'story.html',
        stats: 'stats.html',
        words: 'words.html',
        settings: 'settings.html',
        guide: 'guide.html',
      },
      output: {
        // 进一步压缩输出文件名
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
      },
    },
    // 生产构建时启用 sourcemap（可选，用于调试，但会增加文件大小）
    sourcemap: false,
    // 启用 CSS 代码分割和压缩
    cssCodeSplit: true,
    cssMinify: true,
  },
});

