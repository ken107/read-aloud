/** Presets for OpenAI-compatible local TTS servers (custom-voices.html). */
const LOCAL_TTS_PRESETS = [
  {
    id: "localhost-7788",
    label: "Local OpenAI-compatible TTS (127.0.0.1:7788)",
    url: "http://127.0.0.1:7788/v1",
    apiKey: "",
    voiceList: [
      {voice: "F1", langs: ["pt-BR", "pt-PT"], model: "tts-1"},
      {voice: "F2", langs: ["pt-BR", "pt-PT"], model: "tts-1"},
      {voice: "F3", langs: ["pt-BR", "pt-PT"], model: "tts-1"},
      {voice: "M1", langs: ["pt-BR", "pt-PT"], model: "tts-1"},
      {voice: "M2", langs: ["pt-BR", "pt-PT"], model: "tts-1"},
      {voice: "M3", langs: ["pt-BR", "pt-PT"], model: "tts-1"},
    ],
  },
]

function getLocalTtsPreset(id) {
  return LOCAL_TTS_PRESETS.find(p => p.id === id) || null
}

function applyLocalTtsPreset(id) {
  const preset = getLocalTtsPreset(id)
  if (!preset) return false
  $(".openai .txt-endpoint-url").val(preset.url)
  $(".openai .txt-api-key").val(preset.apiKey)
  $(".openai .txt-voice-list").val(JSON.stringify(preset.voiceList, null, 2))
  $(".openai .sel-local-preset").val(preset.id)
  $(".openai .sel-endpoint-mode").val("local")
  return true
}

function resolveOpenaiEndpointMode(creds) {
  if (!creds) return "remote"
  if (creds.endpointMode === "local" || creds.endpointMode === "remote") return creds.endpointMode
  return isLocalOpenaiUrl(creds.url) ? "local" : "remote"
}
