import https from 'https';

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'user-agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(getJson(new URL(res.headers.location, url).toString()));
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse JSON from ${url}: ${error.message}\n${data.slice(0, 200)}`));
          }
        });
      })
      .on('error', reject);
  });
}

async function main() {
  for (let category = 1; category <= 30; category += 1) {
    const url = `https://api.onepte.com/api/question-bank/public/v1/questions/?category=${category}&page=1&page_size=3`;
    try {
      const payload = await getJson(url);
      const titles = Array.isArray(payload.results) ? payload.results.map((item) => item.title) : [];
      console.log(`CATEGORY ${category}: ${titles.join(' | ')}`);
    } catch (error) {
      console.log(`CATEGORY ${category}: ERROR ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
