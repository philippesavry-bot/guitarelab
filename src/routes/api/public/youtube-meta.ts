import { createFileRoute } from '@tanstack/react-router'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
}

function extractId(raw: string): string | null {
  if (!raw) return null
  const direct = raw.trim().match(/^[a-zA-Z0-9_-]{11}$/)
  if (direct) return direct[0]
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*\bv=)([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = raw.match(p)
    if (m && m[1]) return m[1]
  }
  return null
}

async function fetchOembed(videoId: string) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as { title?: string; author_name?: string }
    if (!data?.title) return null
    return {
      videoTitle: String(data.title || ''),
      channel: String(data.author_name || '').replace(/\s*-\s*Topic$/i, '').trim(),
    }
  } catch {
    return null
  }
}

const STYLE_OPTIONS = [
  'Rock',
  'Pop',
  'Folk',
  'Blues',
  'Chanson française',
  'Variété',
  'Country',
  'Jazz',
  'Soul',
  'Funk',
  'Reggae',
  'Latin',
  'Metal',
  'Classique',
  'Instrumental',
]

async function analyseWithAi(videoTitle: string, channel: string) {
  const key = process.env['LOVABLE_API_KEY']
  if (!key || !videoTitle) return null
  const prompt = `Voici le titre d'une vidéo YouTube et le nom de la chaîne. Identifie le morceau de musique original.

Titre de la vidéo: ${videoTitle}
Chaîne: ${channel || '(inconnue)'}

Réponds uniquement en JSON avec ces clés:
{"title": "titre du morceau seul, sans mention de tuto/cover/lyrics/live/officiel/HD",
 "artist": "artiste ou groupe d'origine du morceau (jamais la chaîne si c'est un tutoriel ou une reprise)",
 "language": "FR, EN, ES ou Instrumental",
 "style": "un seul style choisi STRICTEMENT dans cette liste: ${STYLE_OPTIONS.join(', ')}",
 "bpm": tempo du morceau original en nombre entier SEULEMENT si tu le connais réellement, sinon null (n'invente jamais de tempo),
 "isTutorial": true si la vidéo est un tutoriel/leçon/cover et non la version originale, sinon false}`

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': key,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.8-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) {
      return { error: `ai_${res.status}` as const }
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = data?.choices?.[0]?.message?.content || ''
    const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    const bpm = Number(parsed['bpm'])
    const rawStyle = String(parsed['style'] || '').trim()
    const style =
      STYLE_OPTIONS.find((s) => s.toLowerCase() === rawStyle.toLowerCase()) || ''
    return {
      title: String(parsed['title'] || '').trim(),
      artist: String(parsed['artist'] || '').trim(),
      language: ['FR', 'EN', 'ES', 'Instrumental'].includes(String(parsed['language']))
        ? String(parsed['language'])
        : 'FR',
      style,
      bpm: Number.isFinite(bpm) && bpm > 0 ? Math.max(40, Math.min(300, Math.round(bpm))) : null,
      isTutorial: parsed['isTutorial'] === true,
    }
  } catch {
    return null
  }
}

export const Route = createFileRoute('/api/public/youtube-meta')({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
          },
        }),
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const input = url.searchParams.get('url') || ''
        const videoId = extractId(input)
        if (!videoId) {
          return new Response(JSON.stringify({ error: 'invalid_url' }), {
            status: 400,
            headers: JSON_HEADERS,
          })
        }
        const oembed = await fetchOembed(videoId)
        const ai = oembed ? await analyseWithAi(oembed.videoTitle, oembed.channel) : null
        const aiOk = ai && !('error' in ai) ? ai : null
        return new Response(
          JSON.stringify({
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            videoTitle: oembed?.videoTitle || '',
            channel: oembed?.channel || '',
            ai: aiOk,
            aiError: ai && 'error' in ai ? ai.error : null,
          }),
          { headers: JSON_HEADERS },
        )
      },
    },
  },
})
