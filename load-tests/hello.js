// hello.js — primeiro teste k6, só pra entender o formato
import http from 'k6/http'
import { check, sleep } from 'k6'

// options controla como o teste roda
export const options = {
  vus: 5,          // 5 usuários virtuais simultâneos
  duration: '10s', // por 10 segundos
}

// essa função é o que cada "usuário virtual" vai fazer, em loop
export default function () {
  // faz um GET em um site qualquer (test.k6.io é feito pra isso)
  const res = http.get('https://test.k6.io')

  // verifica se voltou status 200
  check(res, {
    'status é 200': (r) => r.status === 200,
  })

  // espera 1 segundo antes de repetir (simula usuário lendo a página)
  sleep(1)
}