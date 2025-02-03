<script setup>
import { ref, computed, onMounted } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { useToast } from 'vue-toastification'
import QRCode from 'qrcode'
import api from './utils/util'

const loading = ref(false)
const toast = useToast()
const customedit = ref(false)
// 主图、裁剪后图像、最终合成图像
const mainImage = ref(null)
const croppedImage = ref(null)
const finalCanvas = ref(null)

// 自动生成二维码使用的 URL（由图片上传后返回）
const url = ref('')
const qrCodeImage = ref(null)

// 位置和尺寸设置
const elementPosition = ref(10)   // 二维码距离相纸顶部 (mm)
const qrCodeSize = ref(10)       // 二维码大小 (mm)
const fontSize = ref(12)         // 这里暂留，如果将来有需要加文字，可再次使用
const columnWidth = ref(8)       // 未使用的演示字段

// **左侧和右侧白边分别固定为 1mm 和 15.666mm**
const leftWhiteBlockWidth = ref(0)
const rightWhiteBlockWidth = ref(15.7)

// 总尺寸（相纸尺寸）
const dimensions = ref({
  width: 150,  // 相纸总宽度 (mm)
  height: 100, // 相纸高度 (mm)
})
// 将 mm 转换为像素（这里采用 300 DPI）
const mmToPixels = (mm) => Math.round((mm * 600) / 25.4)
const qrcodeMargin = ref(5)
// 基于上面数据的像素尺寸计算
const pixelDimensions = computed(() => {
  const totalWidthPx = mmToPixels(dimensions.value.width)
  const totalHeightPx = mmToPixels(dimensions.value.height)
  const leftWhitePx = mmToPixels(leftWhiteBlockWidth.value)
  const rightWhitePx = mmToPixels(rightWhiteBlockWidth.value)
  const mainImageWidthPx = totalWidthPx - leftWhitePx - rightWhitePx

  return {
    width: totalWidthPx,
    height: totalHeightPx,
    leftWhiteBlockWidth: leftWhitePx,
    rightWhiteBlockWidth: rightWhitePx,
    mainImageWidth: mainImageWidthPx,
    qrCodeSize: mmToPixels(qrCodeSize.value),
    elementPosition: mmToPixels(elementPosition.value),
    columnWidth: mmToPixels(columnWidth.value),
  }
})

// 处理图片上传
const handleMainImageUpload = async (event) => {
  mainImage.value = null
  croppedImage.value = null
  finalCanvas.value = null
  url.value = ''
  qrCodeImage.value = null
  const file = event.target.files[0]
  if (!file) return
  loading.value = true
  try {
    // 上传文件后将返回的地址给 url
    url.value = 'https://cropper.zrjzrj.xyz' + await api.uploadFile(file)
  } catch (err) {
    toast.error('上传失败')
    console.error(err)
  } finally {
    loading.value = false
  }

  // 读取本地文件并展示在 Cropper 中
  const reader = new FileReader()
  reader.onload = () => {
    mainImage.value = reader.result
  }
  reader.readAsDataURL(file)
}
const customPresetName=ref('')
// 生成二维码（以 url.value 为内容）
const generateQRCode = async () => {
  if (!url.value) {
    toast.error('上传失败或 URL 无效，无法生成二维码')
    return
  }
  try {
    qrCodeImage.value = await QRCode.toDataURL(url.value, {
      width: pixelDimensions.value.qrCodeSize,
      margin: 0
    })
  } catch (err) {
    toast.error('生成二维码失败')
    console.error(err)
  }
}
const getPreset=async()=>{
  try{
    presets.value=await api.getPreset()
    selectedPreset.value=presets[0]
  }catch{
    toast.error('获取预设失败')
  }
}
onMounted(getPreset)
const savePreset = async()=>{
  if (customPresetName.value.trim() !== '' && !presets.value.some(p => p.name === customPresetName.value)) {
    const newPreset={
      name:customPresetName.value,
      height:dimensions.value.height,
      width:dimensions.value.width,
      rightWhiteBlockWidth:rightWhiteBlockWidth.value,
      leftWhiteBlockWidth:leftWhiteBlockWidth.value,
      qrCodeSize:qrCodeSize.value,
      qrcodeMargin:qrcodeMargin.value,
      elementPosition:elementPosition.value
    }
    presets.value.push(newPreset)
    try {
      console.log(111)
      const res = await api.setPreset(presets.value)
      toast.success('保存预设成功')

    } catch (error) {
      toast.error('保存预设失败')
    }
  } else {
    toast.error('请重新命名')
  }
}
const presets = ref([
{
    name: '自定义',
    height:100,
    width:150,
    rightWhiteBlockWidth:15.7,
    leftWhiteBlockWidth:0,
    qrCodeSize:10,
    qrcodeMargin:5,
    elementPosition:10
    
  },
  {
    name: '富士小俏印二代(150mm x 100mm)',
    width: 150,
    height: 100,
    rightWhiteBlockWidth:15.7,
    leftWhiteBlockWidth:0,
    qrCodeSize:10,
    qrcodeMargin:5,
    elementPosition:10
  },
  
])
const handlePresetChange = () => {
  if (selectedPreset.value.name == '自定义') {
    customedit.value=true
  }else{
    customedit.value=false
  }
  dimensions.value.height=selectedPreset.value.height;
  dimensions.value.width=selectedPreset.value.width;
  rightWhiteBlockWidth.value=selectedPreset.value.rightWhiteBlockWidth;
  leftWhiteBlockWidth.value=selectedPreset.value.leftWhiteBlockWidth;
  qrCodeSize.value=selectedPreset.value.qrCodeSize;
  qrcodeMargin.value=selectedPreset.value.qrcodeMargin
  elementPosition.value=selectedPreset.value.elementPosition

}
const selectedPreset = ref(presets[0])
// 监听裁剪器变动，将裁剪结果保存在 croppedImage
const crop = ({ canvas }) => {
  croppedImage.value = canvas.toDataURL()
}

// 将裁剪后的主图和二维码合成
const combinedImages = async () => {
  if (!croppedImage.value) {
    toast.error('请先上传并裁剪图片')
    return
  }

  // 如果没有 url，就无法继续生成二维码
  if (!url.value) {
    toast.error('生成二维码内容不存在')
    return
  }

  // 生成二维码
  if (!qrCodeImage.value) {
    await generateQRCode()
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  // 设置画布大小
  canvas.width = pixelDimensions.value.width
  canvas.height = pixelDimensions.value.height

  // 加载主图、二维码
  const mainImg = new Image()
  const qrImg = new Image()

  let loadedImages = 0
  const totalImages = 2

  const drawWhenAllLoaded = () => {
    loadedImages++
    if (loadedImages === totalImages) {
      // 背景填充为白色
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 绘制主图
      ctx.drawImage(
        mainImg,
        pixelDimensions.value.leftWhiteBlockWidth, // 从左白边后开始
        0,
        pixelDimensions.value.mainImageWidth,
        pixelDimensions.value.height
      )

      // 在右侧绘制二维码
      const margin =  qrcodeMargin.value

      const qrX = pixelDimensions.value.leftWhiteBlockWidth
        + pixelDimensions.value.mainImageWidth
        + margin

      ctx.drawImage(
        qrImg,
        qrX,   // X 坐标
        pixelDimensions.value.elementPosition,     // Y 坐标（不变）
        pixelDimensions.value.qrCodeSize,         // 宽度
        pixelDimensions.value.qrCodeSize          // 高度
      )

      finalCanvas.value = canvas.toDataURL()
    }
  }

  mainImg.onload = drawWhenAllLoaded
  qrImg.onload = drawWhenAllLoaded

  mainImg.src = croppedImage.value
  qrImg.src = qrCodeImage.value
}

// 下载最终合成图
const downloadFinal = () => {
  if (!finalCanvas.value) return

  const link = document.createElement('a')
  link.download = url.value.slice(36)
  link.href = finalCanvas.value
  link.click()
}
</script>

<template>
  <div class="container">
    <h2>二维码相纸</h2>

    <div class="dimensions-control">
      <label>
        预设:
        <select v-model="selectedPreset" @change="handlePresetChange">
          <option v-for="item in presets" :key="item.name" :value="item">
            {{ item.name }}
          </option>
        </select>
      </label>
      <label>
        相纸总宽度 (mm):
        <input type="number" v-model="dimensions.width" min="1" max="1000" :disabled="!customedit"/>
      </label>
      <label>
        相纸高度 (mm):
        <input type="number" v-model="dimensions.height" min="1" max="1000" :disabled="!customedit"/>
      </label>
      <label>
        二维码距顶部 (mm):
        <input type="number" v-model="elementPosition" min="0" :max="dimensions.height - qrCodeSize" :disabled="!customedit"/>
      </label>
      <label>
        二维码距离左侧 (mm) :
        <input type="number" v-model="qrcodeMargin" min="0.1" :max="rightWhiteBlockWidth" :disabled="!customedit"/>
      </label>
      <label>
        二维码尺寸 (mm):
        <input type="number" v-model="qrCodeSize" min="1" :max="rightWhiteBlockWidth" :disabled="!customedit"/>
      </label>
      <label>
        左侧白边 (mm):
        <input type="number" v-model="leftWhiteBlockWidth" min="0" max="1000" :disabled="!customedit"/>
      </label>
      <label>
        右侧白边（含二维码） (mm):
        <input type="number" v-model="rightWhiteBlockWidth" min="1" :max="rightWhiteBlockWidth" :disabled="!customedit"/>
      </label>
      <label>
        预设名称(仅保存预设须填写):
        <input  v-model="customPresetName" v-if="customedit"/>
      </label>
      
    </div>

    <div class="info">
      <p>主图宽度: {{ dimensions.width - leftWhiteBlockWidth - rightWhiteBlockWidth }} mm</p>
      <p>裁剪比例: {{((dimensions.width - leftWhiteBlockWidth - rightWhiteBlockWidth) / dimensions.height).toFixed(4)}}</p>
      <p>注意事项: 本站使用CloudFlare Pages托管 采用CloudFlare Worker及R2存储原始图片 单个图像最大限制为15MB 无删除功能但不保证存储时效 请自行备份数据</p>
      <p>保存预设仅会公开尺寸及位置设置等 不包括图片</p>
    </div>

    <div class="image-section">
      <h2 v-if="loading">正在上传，请勿重复点击</h2>
      <h2 v-else>上传</h2>
      <input type="file" accept="image/*" @change="handleMainImageUpload" />

      <div v-if="mainImage" class="cropper-container">
        <Cropper class="cropper" :src="mainImage" :stencil-props="{
            aspectRatio: (dimensions.width - leftWhiteBlockWidth - rightWhiteBlockWidth) / dimensions.height
          }" @change="crop" />
      </div>
    </div>

    <div class="actions">
      <button @click="combinedImages" :disabled="!croppedImage">
        预览
      </button>
      <button @click="downloadFinal" :disabled="!finalCanvas">
        下载
      </button>
      <button @click="savePreset" v-if="customedit">保存预设(公开)</button>
    </div>

    <div v-if="finalCanvas" class="final-preview">
      <h2>预览</h2>
      <img :src="finalCanvas" alt="Combined result" />
    </div>
  </div>
</template>

<style>
.container {
  max-width: 100%;
  padding: 1rem;
  margin: 0 auto;
}

.dimensions-control {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.dimensions-control label {
  display: flex;
  flex-direction: column;
  width: auto;
}

.dimensions-control input {

  text-align: center;
  padding: 0.5rem;
  margin-top: 0.25rem;
}

.info {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 1rem;
}

.info p {
  margin: 0.25rem 0;
}

.image-section {
  margin-bottom: 2rem;
}

.cropper-container {
  height: 50vh;
  max-height: 1000px;
  max-width: 70vw;
  background: #f0f0f0;
  margin: 1rem 0;
}

.cropper {
  height: 100%;
  width: 100%;
}

.actions {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
}

button {
  padding: 0.5rem 1rem;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.final-preview {
  background-color: #666;
  margin-top: 2rem;
}

.final-preview img {
  max-width: 70vw;
  height: auto;
}

@media (max-width: 768px) {
  .dimensions-control {
    flex-direction: column;
  }

  .cropper-container {
    height: 40vh;
  }
}
</style>
