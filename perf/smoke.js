import http from 'k6/http';
import { check, sleep } from 'k6';

/** 5 VUs por 30s, p95 < 400ms */
export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.01']
  }
};

export default function () {
  const res = http.get('http://localhost:3000/api/partners');
  check(res, { 'status is 200': r => r.status === 200 });
  sleep(1);
}
