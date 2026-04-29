// Microsoft Edge TTS — free, no API key, decent quality. Uses msedge-tts which
// hits Microsoft's public endpoint via websocket. Voices available include
// "en-US-GuyNeural", "en-US-JennyNeural", "en-GB-RyanNeural", etc.

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_VOICE = 'en-US-GuyNeural'

export async function synthesizeToFile({ text, voice = DEFAULT_VOICE, outDir, filenamePrefix = 'voiceover' }) {
  if (!text || !text.trim()) throw new Error('TTS text is empty')
  fs.mkdirSync(outDir, { recursive: true })

  const tts = new MsEdgeTTS()
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

  const filename = `${filenamePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`
  const filepath = path.join(outDir, filename)

  // msedge-tts toFile returns a path (newer API) or writes directly. Use stream
  // to be safe across versions.
  const result = await tts.toFile(filepath, text)

  // Some versions return { audioFilePath } object; either way the file exists.
  const finalPath = result?.audioFilePath || filepath
  if (!fs.existsSync(finalPath)) throw new Error('TTS produced no output file')

  return { filename: path.basename(finalPath), filepath: finalPath }
}

export const VOICES = {
  guy: 'en-US-GuyNeural',
  jenny: 'en-US-JennyNeural',
  aria: 'en-US-AriaNeural',
  ryan: 'en-GB-RyanNeural',
  sonia: 'en-GB-SoniaNeural',
}
