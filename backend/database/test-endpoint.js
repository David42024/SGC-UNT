
require('dotenv').config();
const http = require('http');

http.get('http://localhost:4000/api/test/acreditacion/autoevaluaciones/1', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Data:', JSON.parse(data));
  });
}).on('error', (e) => { console.error(e); });
