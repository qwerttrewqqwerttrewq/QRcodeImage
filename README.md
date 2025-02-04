# QRcodeImage
裁剪图像并添加存储二维码

## 项目在线体验地址
[https://cropper.zrjzrj.xyz](https://cropper.zrjzrj.xyz)

## 使用方法
1. 选择已有预设或自定义
2. 设置长宽，二维码位置大小等基本参数（仅自定义可用）
3. 裁剪图片
4. 点击预览，可更改前面参数并重新裁剪图像
5. 预览后点击下载，保存图像到本地并打印

## 自行部署方法

### 后端
1. **创建 Cloudflare R2 存储库及 KV 存储**（如果需要存储预设的话）
2. **创建 Cloudflare Worker** 并粘贴以下代码：

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/upload" && request.method === "POST") {
      return await handleUpload(request, env);
    }
    if (url.pathname.startsWith("/download/")) {
      const filename = url.pathname.replace("/download/", "");
      return await handleDownload(request, env, filename);
    }
    if (url.pathname === "/getpreset" && request.method === "GET") {
      return await handleGetPreset(request, env);
    }
    if (url.pathname === "/setpreset" && request.method === "POST") {
      return await handleSetPreset(request, env);
    }
    return new Response("Not Found", { status: 404 });
  }
};
async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) {
    return new Response("No file uploaded", { status: 400 });
  }

  const maxSize = 15 * 1024 * 1024; // 15MB
  if (file.size > maxSize) {
    return new Response("File too large (over 15MB)", { status: 413 });
  }
  const originalName = file.name;
  const finalName = await generateUniqueName(originalName, env);
  await env.R2_BUCKET.put(finalName, file.stream());
  return new Response(
    JSON.stringify({ downloadUrl: `/download/${finalName}` }),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function handleDownload(request, env, filename) {
  const object = await env.R2_BUCKET.get(filename);
  if (!object) {
    return new Response("File not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
    },
  });
}
async function generateUniqueName(baseName, env) {
  let tryName = baseName;
  let counter = 1;
  const dotIndex = baseName.lastIndexOf(".");
  let prefix = baseName;
  let extension = "";
  if (dotIndex !== -1) {
    prefix = baseName.slice(0, dotIndex);
    extension = baseName.slice(dotIndex); // 包含“.”
  }

  while (true) {
    const obj = await env.R2_BUCKET.head(tryName);
    if (!obj) {
      return tryName;
    } else {
      tryName = `${prefix}(${counter})${extension}`;
      counter++;
    }
  }
}

async function handleSetPreset(request, env) {
  try {
    const data = await request.json();  // parse JSON body
    // Assuming `data` is your entire array of presets:
    await env.PRESETS_KV.put("presets", JSON.stringify(data));
    return new Response(
      JSON.stringify({ message: "Presets saved successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response("Invalid JSON", { status: 400 });
  }
}

async function handleGetPreset(request, env) {
  const storedPresets = await env.PRESETS_KV.get("presets");
  const presets = storedPresets ? JSON.parse(storedPresets) : [];

  return new Response(JSON.stringify(presets), {
    headers: { "Content-Type": "application/json" },
  });
}
```

3. **绑定 R2 存储桶 `R2_BUCKET` 及 KV 命名空间 `PRESETS_KV`**
4. **设置 Worker 路由**
   - `yourdomain.com/setpreset`
   - `yourdomain.com/getpreset`
   - `yourdomain.com/download/*`
   - `yourdomain.com/upload`
   
   （这里弄复杂了，之前是为了下载链接能短一点，不然一个 `yourdomain.com/api/*` 就行了，有需求自行更改 Worker 代码里的路径判断）

> 这里后端需求较少，所以随便写了接口，没有使用wrangler构建

### 前端
1. **克隆本仓库**
   ```sh
   git clone https://github.com/qwerttrewqqwerttrewq/QRcodeImage.git
   ```
   修改/src/utils/util.js中的baseUrl确保与你的域名一致
2. **创建 Cloudflare Pages**
   - 绑定 `main` 分支
   - Cloudflare 会自动进行 CI/CD 部署
3. **绑定你的域名** `yourdomain.com`与worker域名相同
