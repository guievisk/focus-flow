import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend } from 'k6/metrics'

const supabaseLatency = new Trend('supabase_latency_ms')

export const options = {
  stages: [
    { duration: '30s', target: 5   },
    { duration: '1m',  target: 20  },
    { duration: '1m',  target: 50  },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0   },
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
  
  if (res.status === 200) {
    try {
      const body = res.json()
      const latency = body.supabase?.latency_ms
      if (typeof latency === 'number') {
        supabaseLatency.add(latency)
      }
    } catch (e) {
    }
  }
  
  sleep(1)
}