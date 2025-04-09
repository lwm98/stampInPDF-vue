<template>
  <div class="pdf-viewer">
    <input type="file" @change="onFileChange" accept=".pdf" />
    <div ref="pdfContainer" class="pdf-container"></div>
  </div>
</template>

<script>
// TODO: 放大缩小、填空、撤销等
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.entry'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export default {
  name: 'PdfStamp',
  data() {
    return {
      pdfDoc: null,
      scale: 1.5,
      stampList: [], // 用于记录贴图位置
      columns: 1, // 默认单列显示
      containerWidth: 0
    }
  },
  mounted() {
    this.updateLayout()
    window.addEventListener('resize', this.updateLayout)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateLayout)
  },
  methods: {
    updateLayout() {
      const container = this.$refs.pdfContainer
      if (!container) return

      this.containerWidth = container.clientWidth
      // 根据容器宽度决定列数
      if (this.containerWidth >= 1600) {
        this.columns = 3
      } else if (this.containerWidth >= 1200) {
        this.columns = 2
      } else {
        this.columns = 1
      }

      // 如果PDF已经加载，重新渲染以适应新的布局
      if (this.pdfDoc) {
        this.renderPdf()
      }
    },
    onFileChange(e) {
      const file = e.target.files[0]
      if (file) {
        const fileReader = new FileReader()
        fileReader.onload = async e => {
          const typedArray = new Uint8Array(e.target.result)
          this.loadPdf(typedArray)
        }
        fileReader.readAsArrayBuffer(file)
      }
    },
    async loadPdf(data) {
      const loadingTask = pdfjsLib.getDocument({ data })
      this.pdfDoc = await loadingTask.promise
      this.renderPdf()
    },
    async renderPdf() {
      const numPages = this.pdfDoc.numPages
      this.$refs.pdfContainer.innerHTML = ''

      // 创建页面容器
      const pagesContainer = document.createElement('div')
      pagesContainer.className = 'pages-container'
      pagesContainer.style.display = 'grid'
      pagesContainer.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`
      pagesContainer.style.gap = '20px'
      this.$refs.pdfContainer.appendChild(pagesContainer)

      for (let i = 1; i <= numPages; i++) {
        const page = await this.pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: this.scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.border = '1px solid #ccc'
        canvas.style.width = '100%'
        canvas.style.height = 'auto'
        canvas.dataset.page = i
        canvas.dataset.originalWidth = viewport.width
        canvas.dataset.originalHeight = viewport.height

        const context = canvas.getContext('2d')
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }

        await page.render(renderContext).promise
        canvas.addEventListener('click', e => this.handleStamp(e, canvas, i))
        pagesContainer.appendChild(canvas)

        // 使用相对位置渲染印章
        const pageStamps = this.stampList.flat().filter(stamp => stamp.page === i)
        pageStamps.forEach(stamp => {
          const img = new Image()
          img.src = require('@/assets/logo.png')
          img.onload = () => {
            // 将相对位置转换为实际坐标
            const x = stamp.relativeX * canvas.width
            const y = stamp.relativeY * canvas.height
            context.drawImage(
              img,
              x - stamp.width / 2,
              y - stamp.height / 2,
              stamp.width,
              stamp.height
            )
          }
        })
      }
    },
    handleStamp(event, canvas, pageNum) {
      const rect = canvas.getBoundingClientRect()
      const originalWidth = parseFloat(canvas.dataset.originalWidth)
      const originalHeight = parseFloat(canvas.dataset.originalHeight)

      // 计算点击位置相对于canvas的百分比
      const clickX = event.clientX - rect.left
      const clickY = event.clientY - rect.top
      const relativeX = clickX / rect.width
      const relativeY = clickY / rect.height

      // 将百分比转换为原始canvas上的实际坐标
      const x = relativeX * originalWidth
      const y = relativeY * originalHeight

      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.src = require('@/assets/logo.png')
      img.onload = () => {
        const size = 60
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size)

        // 存储相对位置
        this.stampList.push({
          page: pageNum,
          relativeX: relativeX,
          relativeY: relativeY,
          width: size,
          height: size
        })

        console.log('贴图位置：', this.stampList)
      }
    }
  }
}
</script>

<style scoped>
.pdf-viewer {
  width: 100%;
  max-width: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.pdf-container {
  width: 100%;
  margin-top: 20px;
}

.pages-container {
  width: 100%;
}

#pdfContainer canvas {
  cursor: pointer;
  max-width: 100%;
  height: auto;
}
</style>
