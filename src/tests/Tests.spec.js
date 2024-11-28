import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const getThemesDuration = new Trend('get_themes', true);
export const successRate = new Rate('success_rate');

const baseUrl = 'https://api.maribel.cloud';

let params = {
  headers: {
    'Content-Type': 'application/json'
  }
};

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.12'],
    get_themes: ['p(95)<5700'],
    success_rate: ['rate>0.95'] 
  },
  stages: [
    { duration: '15s', target: 10 },
    { duration: '15s', target: 20 },
    { duration: '15s', target: 35 },
    { duration: '15s', target: 50 },
    { duration: '15s', target: 75 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 150 },
    { duration: '30s', target: 200 },
    { duration: '2m', target: 300 }
  ]
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

function getToken() {
  const username = __ENV.USERNAME;
  const password = __ENV.PASSWORD;

  const body = JSON.stringify({ username, password });

  const res = http.post(`${baseUrl}/api/auth/jwt/create/`, body, params);
  const json = res.json();
  return json.access;
}

export default function () {
  const accessToken = getToken();

  params.headers["Authorization"] = `Bearer ${accessToken}`;

  const OK = 200;

  const res = http.get(`${baseUrl}/api/themes`, params);

  getThemesDuration.add(res.timings.duration);

  successRate.add(res.status === OK);

  check(res, {
    'GET Themes - Status 200': () => res.status === OK
  });
}
