'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'
import { Camera, Loader2, AlertTriangle } from 'lucide-react'

type Props = {
  userId: string
  currentAvatarUrl: string | null
  fallbackText: string // iniciais se não tiver foto
  onUploaded: (newUrl: string) => void // callback pra atualizar a UI lá fora
  size?: number // px, default 96
}

const FORMATOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANHO_MAX_MB = 10

/**
 * Recorta a imagem num quadrado centralizado (lado menor manda).
 * Foto vertical 600x800 → quadrado 600x600 do centro.
 * Foto horizontal 1200x800 → quadrado 800x800 do centro.
 * Resultado: avatar quadrado sem distorção nem zoom estranho.
 */
async function cropQuadradoCentralizado(file: File): Promise<File> {
  const img = document.createElement('img')
  const url = URL.createObjectURL(file)

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = url
  })

  const lado = Math.min(img.width, img.height)
  const x = (img.width - lado) / 2
  const y = (img.height - lado) / 2

  const canvas = document.createElement('canvas')
  canvas.width = lado
  canvas.height = lado
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas não suportado')

  ctx.drawImage(img, x, y, lado, lado, 0, 0, lado, lado)
  URL.revokeObjectURL(url)

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Falha ao gerar imagem'))
        resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.95
    )
  })
}

export default function AvatarUpload({
  userId,
  currentAvatarUrl,
  fallbackText,
  onUploaded,
  size = 96,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [hover, setHover] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    if (!FORMATOS_ACEITOS.includes(file.type)) {
      setError('Use JPG, PNG ou WEBP')
      return
    }

    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setError(`Foto muito grande (máx ${TAMANHO_MAX_MB}MB)`)
      return
    }

    setUploading(true)

    try {
      // 1. Recorta quadrado no centro (resolve distorção)
      const quadrada = await cropQuadradoCentralizado(file)

      // 2. Comprime pra ~500KB, JPEG
      const comprimida = await imageCompression(quadrada, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/jpeg',
      })

      // 3. Caminho fixo
      const caminho = `${userId}/avatar.jpg`

      // 4. Upload
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(caminho, comprimida, {
          upsert: true,
          contentType: 'image/jpeg',
          cacheControl: '3600',
        })

      if (uploadErr) throw uploadErr

      // 5. URL pública com timestamp pra matar cache
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(caminho)
      const urlFinal = `${urlData.publicUrl}?t=${Date.now()}`

      // 6. Salva no banco
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: urlFinal })
        .eq('id', userId)

      if (dbErr) throw dbErr

      // 7. Avisa o pai
      onUploaded(urlFinal)
    } catch (err) {
      console.error('Erro ao subir avatar:', err)
      setError('Não consegui subir a foto. Tenta de novo.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const showOverlay = uploading || hover

  return (
    <div style={{ display: 'inline-block' }}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundImage: currentAvatarUrl
            ? `url(${currentAvatarUrl})`
            : 'linear-gradient(135deg, #7A00FF, #5A00C4)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          position: 'relative',
          color: '#fff',
          fontSize: size * 0.35,
          fontWeight: 700,
          userSelect: 'none',
          border: '2px solid var(--p-line)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {!currentAvatarUrl && !uploading && fallbackText}

        {/* Overlay de hover/upload */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: showOverlay
              ? uploading
                ? 'rgba(0,0,0,0.6)'
                : 'rgba(0,0,0,0.4)'
              : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
            pointerEvents: 'none',
          }}
        >
          {uploading && (
            <Loader2
              size={size * 0.3}
              color="#fff"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          )}
          {!uploading && hover && (
            <Camera size={size * 0.3} color="#fff" />
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {error && (
        <div style={{ color: '#FF4D8D', fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={13} strokeWidth={2.2} /> {error}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
