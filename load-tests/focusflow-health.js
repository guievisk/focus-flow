// focusflow-health.js — teste de carga no endpoint /api/health
// Objetivo: descobrir onde a rota dinâmica começa a sofrer
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend } from 'k6/metrics'

// Métrica customizada — vamos rastrear latência do Supabase separadamente
const supabaseLatency = new Trend('supabase_latency_ms')

export const options = {
  stages: [
    { duration: '30s', target: 5   }, // warm-up: 5 VUs
    { duration: '1m',  target: 20  }, // escala pra 20 VUs em 1 min
    { duration: '1m',  target: 50  }, // sobe pra 50 VUs
    { duration: '30s', target: 100 }, // pico de 100 VUs em 30s
    { duration: '30s', target: 0   }, // cooldown
  ],
  thresholds: {
    http_req_duration:  ['p(95)<3000'],
    http_req_failed:    ['rate<0.05'],
    supabase_latency_ms:['p(95)<2000'],
  },
}

const BASE_URL = 'https://focus-flow-sage-theta.vercel.app'

export default function () {
  const res = http.get(`${BASE_URL}/api/health`)
  
  check(res, {
    'status 200':          (r) => r.status === 200,
    'body tem status ok':  (r) => r.json('status') === 'ok',
    'response < 3s':       (r) => r.timings.duration < 3000,
  })
  
  // Extrai a latência do Supabase do JSON de resposta e adiciona à métrica
  if (res.status === 200) {
    try {
      const body = res.json()
      const latency = body.supabase?.latency_ms
      if (typeof latency === 'number') {
        supabaseLatency.add(latency)
      }
    } catch (e) {
      // ignora erros de parse
    }
  }
  
  sleep(1)
}