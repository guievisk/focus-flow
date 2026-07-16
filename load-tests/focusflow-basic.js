import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.01'],
  },
}

const BASE_URL = 'https://focus-flow-sage-theta.vercel.app'

export default function () {
  const res = http.get(`${BASE_URL}/`)
  
  check(res, {
    'status é 200 ou 307': (r) => r.status === 200 || r.status === 307,
    'resposta em menos de 2s': (r) => r.timings.duration < 2000,
  })
  
  sleep(1)
}