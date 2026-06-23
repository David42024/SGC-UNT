const http = require('http');

console.log('Testing /api/test/acciones...');

http.get('http://127.0.0.1:4000/api/test/acciones', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log(`Success! Found ${json.datos?.length || 0} acciones!`);
      if (json.datos?.length > 0) {
        console.log('First acción:', JSON.stringify(json.datos[0], null, 2));
      }
    } catch (err) {
      console.error('Failed to parse JSON:', data.substring(0, 200));
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
