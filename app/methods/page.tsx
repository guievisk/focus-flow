// app/methods/page.tsx
'use client'

import { motion } from 'framer-motion'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/Card'
import { useMethod, MethodId } from '@/components/MethodContext'
import {
  Repeat, Brain, MessageSquare, Columns, Clock, Shuffle,
  CheckCircle2, ArrowRight,
} from 'lucide-react'

/*
 🧠 LINGUAGEM → Estrutura de dados (array de objetos)
    Cada método é um objeto com id, categoria, título,
    descrição, como aplicar e cor. Isso deixa o código
    organizado e fácil de adicionar novos métodos.
*/
const methods = [
  {
    id: 'spaced' as MethodId,
    category: 'Memorização e Retenção',
    Icon: Repeat,
    color: '#9333FF',
    title: 'Repetição Espaçada',
    desc: 'Revise o conteúdo em intervalos que aumentam progressivamente (1 dia, 3 dias, 1 semana, 1 mês). Combate diretamente a curva do esquecimento.',
    how: 'Muito associado a flashcards. Você revisa cada cartão em intervalos crescentes — o que você acerta volta menos vezes, o que erra volta mais.',
    best: 'Fórmulas, vocabulário, datas, conceitos que precisam ser memorizados.',
  },
  {
    id: 'active-recall' as MethodId,
    category: 'Memorização e Retenção',
    Icon: Brain,
    color: '#9333FF',
    title: 'Recordação Ativa',
    desc: 'Force o cérebro a buscar a informação na memória sem olhar o material. Reler cria falsa familiaridade — testar a si mesmo constrói memória real.',
    how: 'Feche o livro e escreva tudo que lembra numa folha em branco. Ou resolva questões antes mesmo de revisar a teoria.',
    best: 'Praticamente qualquer matéria. É um dos métodos mais eficazes que existem.',
  },
  {
    id: 'feynman' as MethodId,
    category: 'Compreensão e Organização',
    Icon: MessageSquare,
    color: '#9333FF',
    title: 'Técnica Feynman',
    desc: 'Se você não consegue explicar algo de forma simples, você não entendeu de verdade. Valida se você compreendeu ou só decorou.',
    how: 'Escolha um tópico e finja ensiná-lo para uma criança de 10 anos. Use analogias. Quando travar, volte ao material e corrija a falha.',
    best: 'Conceitos complexos, matérias que exigem entendimento profundo.',
  },
  {
    id: 'cornell' as MethodId,
    category: 'Compreensão e Organização',
    Icon: Columns,
    color: '#9333FF',
    title: 'Método Cornell',
    desc: 'Um sistema estruturado de anotações que divide a página em três seções para organizar o pensamento durante e depois da aula.',
    how: 'Coluna esquerda: palavras-chave e perguntas. Direita: anotações da aula. Rodapé: resumo de 3-4 linhas feito na revisão.',
    best: 'Aulas, leituras longas, organização de conteúdo denso.',
  },
  {
    id: 'pomodoro' as MethodId,
    category: 'Gestão de Tempo e Foco',
    Icon: Clock,
    color: '#9333FF',
    title: 'Técnica Pomodoro',
    desc: 'Mantém a concentração alta e evita fadiga mental dividindo o tempo em blocos de foco total e descanso.',
    how: '25 minutos de foco total (sem celular), 5 minutos de descanso real. A cada 4 ciclos, pausa maior de 15 a 30 minutos.',
    best: 'Quem se distrai fácil ou tem dificuldade de manter o foco por muito tempo.',
  },
  {
    id: 'interleaving' as MethodId,
    category: 'Gestão de Tempo e Foco',
    Icon: Shuffle,
    color: '#9333FF',
    title: 'Intercalação',
    desc: 'Alternar entre diferentes matérias numa mesma sessão, em vez de passar o dia todo em um único assunto. Melhora a adaptabilidade do cérebro.',
    how: 'Tem 3 horas? Faça 1h de Matemática, 1h de História, 1h de Biologia. O cérebro se desapega e recupera contextos diferentes.',
    best: 'Quem estuda várias matérias e quer evitar a estagnação do estudo em bloco.',
  },
]

// Agrupa os métodos por categoria
const categories = [...new Set(methods.map(m => m.category))]

export default function Methods() {
  // Lê e altera o método ativo no Context global
  const { method, setMethod } = useMethod()

  return (
    <AppShell>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .4 }} style={{ marginBottom: 10 }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)' }}>Métodos de estudo</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, maxWidth: 620, lineHeight: 1.6 }}>
          Estudar não é uma atividade única para todo mundo. A ciência do aprendizado
          mostra que os métodos mais eficientes exigem esforço cognitivo ativo. Escolha
          o seu e o FocusFlow se adapta a ele.
        </p>
      </motion.div>

      {/* Banner do método ativo */}
      {method && (
        <motion.div
          initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}
          style={{ marginTop: 20, marginBottom: 24 }}
        >
          <Card style={{ padding: '16px 22px', background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle2 size={20} color="#8B5CF6" />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Método ativo: </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                  {methods.find(m => m.id === method)?.title}
                </span>
              </div>
              <button
                onClick={() => setMethod(null)}
                style={{
                  background: 'transparent', border: '1px solid rgba(139,92,246,0.3)',
                  color: '#A78BFA', borderRadius: 8, padding: '6px 14px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Product Sans', sans-serif",
                }}
              >
                Trocar método
              </button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Métodos agrupados por categoria */}
      <div style={{ marginTop: method ? 0 : 24, display: 'flex', flexDirection: 'column', gap: 32 }}>
        {categories.map((cat, ci) => (
          <div key={cat}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 14, letterSpacing: 0.3 }}>
              {cat}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {methods.filter(m => m.category === cat).map((m, i) => {
                const active = method === m.id
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .4, delay: (ci * 0.1) + (i * 0.06) }}
                  >
                    <Card style={{
                      padding: 24,
                      borderColor: active ? `${m.color}66` : undefined,
                      background: active ? `${m.color}12` : undefined,
                    }}>
                      {/* Cabeçalho do método */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 11,
                          background: `${m.color}1A`, border: `1px solid ${m.color}33`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <m.Icon size={21} color={m.color} strokeWidth={2} />
                        </div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{m.title}</h3>
                      </div>

                      {/* Descrição */}
                      <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65, marginBottom: 14 }}>
                        {m.desc}
                      </p>

                      {/* Como aplicar */}
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: m.color, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Como aplicar
                        </div>
                        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>{m.how}</p>
                      </div>

                      {/* Melhor para */}
                      <div style={{ marginBottom: 18 }}>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Ideal para: </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{m.best}</span>
                      </div>

                      {/* Botão escolher */}
                      <button
                        onClick={() => setMethod(active ? null : m.id)}
                        style={{
                          width: '100%', padding: 12, borderRadius: 10,
                          border: active ? `1px solid ${m.color}` : 'none',
                          background: active ? 'transparent' : `linear-gradient(135deg, ${m.color}, ${m.color}CC)`,
                          color: active ? m.color : '#fff',
                          fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                          fontFamily: "'Product Sans', sans-serif",
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          boxShadow: active ? 'none' : `0 4px 16px ${m.color}55`,
                        }}
                      >
                        {active ? (
                          <><CheckCircle2 size={15} /> Método escolhido</>
                        ) : (
                          <>Escolher este método <ArrowRight size={15} /></>
                        )}
                      </button>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}