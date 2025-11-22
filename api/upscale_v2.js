import axios from "axios"
import * as cheerio from "cheerio"
import { fileTypeFromBuffer } from "file-type"
import path from "path"
import FormData from "form-data"
import { Buffer } from "buffer"

// === RESPONSE HELPER ===
function createImageResponse(res, buffer, filename = "upscaled.jpg") {
  res.setHeader("Content-Type", "image/jpeg")
  res.setHeader("Content-Length", buffer.length.toString())
  res.setHeader("Cache-Control", "public, max-age=3600")
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`)
  res.status(200).send(buffer)
}

// === ILoveIMG CLASS dari kode kamu ===
class UpscaleImageAPI {
  api = null
  server = null
  taskId = null
  token = null

  async getTaskId() {
    try {
      const { data: html } = await axios.get("https://www.iloveimg.com/upscale-image", {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      })

      const tokenMatches = html.match(/(ey[a-zA-Z0-9?%-_/]+)/g)
      if (!tokenMatches || tokenMatches.length < 2) throw new Error("Token not found")
      this.token = tokenMatches[1]

      const configMatch = html.match(/var ilovepdfConfig = ({.*?});/s)
      if (!configMatch) throw new Error("Server config not found")
      const configJson = JSON.parse(configMatch[1])

      const servers = configJson.servers
      this.server = servers[Math.floor(Math.random() * servers.length)]
      this.taskId = html.match(/ilovepdfConfig\.taskId\s*=\s*['"](\w+)['"]/)?.[1]

      this.api = axios.create({
        baseURL: `https://${this.server}.iloveimg.com`,
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "User-Agent": "Mozilla/5.0"
        }
      })

      return true
    } catch (err) {
      throw new Error("Failed getTaskId: " + err.message)
    }
  }

  async uploadFromFile(fileBuffer, fileName) {
    const fileType = await fileTypeFromBuffer(fileBuffer)
    const form = new FormData()

    form.append("name", fileName)
    form.append("chunk", "0")
    form.append("chunks", "1")
    form.append("task", this.taskId)
    form.append("preview", "1")
    form.append("file", fileBuffer, {
      filename: fileName,
      contentType: fileType.mime
    })

    const res = await this.api.post("/v1/upload", form, {
      headers: form.getHeaders(),
      responseType: "json"
    })

    return res.data
  }

  async upscaleImage(serverFilename, scale = 2) {
    const form = new FormData()
    form.append("task", this.taskId)
    form.append("server_filename", serverFilename)
    form.append("scale", scale.toString())

    const res = await this.api.post("/v1/upscale", form, {
      headers: form.getHeaders(),
      responseType: "arraybuffer"
    })

    return res.data
  }
}


// === MAIN HANDLER (POST base64) ===
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" })

  try {
    const { image, scale } = req.body
    const upscaleScale = scale == 4 ? 4 : 2

    if (!image) return res.status(400).json({ error: "Image missing" })

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")

    const fileType = await fileTypeFromBuffer(buffer)
    const ext = fileType?.ext || "jpg"
    const fileName = `image_${Math.random().toString(36).slice(2)}.${ext}`

    const upscaler = new UpscaleImageAPI()
    await upscaler.getTaskId()

    const upload = await upscaler.uploadFromFile(buffer, fileName)
    if (!upload.server_filename) throw new Error("Upload failed")

    const resultBuffer = await upscaler.upscaleImage(upload.server_filename, upscaleScale)

    return createImageResponse(res, resultBuffer, `upscaled.${ext}`)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
