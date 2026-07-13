// focusflow-basic.js — teste baseline contra páginas públicas
import http from 'k6/http'
import { check, sleep } from 'k6'

// Configuração escalonada — 3 estágios
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // sobe pra 10 VUs em 30s
    { duration: '1m',  target: 10 },  // mantém 10 VUs por 1 minuto
    { duration: '30s', target: 0 },   // desce pra 0 em 30s
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // P95 deve ficar abaixo de 2s
    http_req_failed:   ['rate<0.01'],    // menos de 1% de erro
  },
}

const BASE_URL = 'https://focus-flow-sage-theta.vercel.app'

export default function () {
  // testa a home / landing (pública)
  const res = http.get(`${BASE_URL}/`)
  
  check(res, {
    'status é 200 ou 307': (r) => r.status === 200 || r.status === 307,
    'resposta em menos de 2s': (r) => r.timings.duration < 2000,
  })
  
  sleep(1)
}