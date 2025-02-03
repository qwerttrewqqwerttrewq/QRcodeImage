import axios from "axios";

// 你的 Cloudflare Worker 部署地址
const BASE_URL = "https://cropper.zrjzrj.xyz"; 

const api = {
  /**
   * 上传文件到 Cloudflare Worker
   * @param {File} file - 需要上传的文件对象
   * @returns {Promise<string>} - 上传成功后返回下载路径
   */
  async uploadFile(file) {
    if (!file) throw new Error("No file provided");

    const formData = new FormData();
    formData.append("file", file); // "file" 必须与 Worker 代码里的 formData.get("file") 相对应

    try {
      const response = await axios.post(`${BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data.downloadUrl; // 服务器返回的下载路径
    } catch (error) {
      console.error("Upload failed:", error.response ? error.response.data : error.message);
      throw error;
    }
  },

  /**
   * 以 Blob 形式获取文件（不自动下载）
   * @param {string} fileName - 需要下载的文件名
   * @returns {Promise<Blob>} - 返回文件数据（Blob）
   */
  async getFile(fileName) {
    try {
      const response = await axios.get(`${BASE_URL}/download/${fileName}`, {
        responseType: "blob", // 确保以 Blob 格式接收文件
      });
      return response.data; // 返回 Blob
    } catch (error) {
      console.error("Download failed:", error.response ? error.response.data : error.message);
      throw error;
    }
  },

  /**
   * 下载文件并自动保存到本地
   * @param {string} fileName - 需要下载的文件名
   */
  async downloadFile(fileName) {
    try {
      const blob = await this.getFile(fileName);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName; // 将文件名作为默认下载名
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("File download failed:", error);
    }
  },

  /**
   * 保存一组预设到 Worker
   * @param {Array<object>} presetData - 需要保存的预设数组
   * @returns {Promise<object>} - 服务器返回的数据
   */
  async setPreset(presetData) {
    try {
      const response = await axios.post(`${BASE_URL}/setpreset`, presetData, {
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      });
      return response.data;
    } catch (error) {
      console.error("Set Preset failed:", error.response ? error.response.data : error.message);
      throw error;
    }
  },

  /**
   * 获取所有预设
   * @returns {Promise<Array<object>>} - 返回服务器上保存的预设数组
   */
  async getPreset() {
    try {
      const response = await axios.get(`${BASE_URL}/getpreset`);
      return response.data; // 应该是一个预设数组
    } catch (error) {
      console.error("Get Preset failed:", error.response ? error.response.data : error.message);
      throw error;
    }
  },
};

export default api;
