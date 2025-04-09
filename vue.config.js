const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === 'production'
    ? '/stampInPDF-vue/'  // 改成你的 GitHub 仓库名
    : '/'
})