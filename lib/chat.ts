import { supabase } from '@/lib/supabase'

export type Message = {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  readAt: string | null
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string
): Promise<{ ok: boolean; error?: string; message?: Message }> {
  const clean = content.trim()
  if (!clean) return { ok: false, error: 'Mensagem vazia' }
  if (clean.length > 2000) return { ok: false, error: 'Mensagem muito longa' }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: clean,
      })
      .select('id, sender_id, receiver_id, content, created_at, read_at')
      .single()

    if (error) {
      console.error('Erro ao enviar mensagem:', error)
      return { ok: false, error: 'Erro ao enviar' }
    }

    return {
      ok: true,
      message: {
        id: data.id,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        content: data.content,
        createdAt: data.created_at,
        readAt: data.read_at,
      },
    }
  } catch (err) {
    console.error('Exceção ao enviar mensagem:', err)
    return { ok: false, error: 'Erro ao enviar' }
  }
}

export async function listMessages(
  myUserId: string,
  friendId: string,
  since?: string
): Promise<Message[]> {
  try {
    let query = supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, created_at, read_at')
      .or(
        `and(sender_id.eq.${myUserId},receiver_id.eq.${friendId}),` +
        `and(sender_id.eq.${friendId},receiver_id.eq.${myUserId})`
      )
      .order('created_at', { ascending: true })

    if (since) {
      query = query.gt('created_at', since)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao listar mensagens:', error)
      return []
    }

    return (data || []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      content: m.content,
      createdAt: m.created_at,
      readAt: m.read_at,
    }))
  } catch (err) {
    console.error('Exceção ao listar mensagens:', err)
    return []
  }
}