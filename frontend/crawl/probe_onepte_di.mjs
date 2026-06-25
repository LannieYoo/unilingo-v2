import https from 'https';

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse JSON from ${url}: ${error.message}\n${data.slice(0, 500)}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  for (const category of [4, 5, 6, 7, 8, 9, 10]) {
    const list = await getJson(`https://api.onepte.com/api/question-bank/public/v1/questions/?category=${category}&page=1&page_size=3`);
    const first = Array.isArray(list?.results) ? list.results[0] : null;
    let detail = null;
    if (first?.id) {
      detail = await getJson(`https://api.onepte.com/api/question-bank/public/v3/questions/${first.id}/details/`);
    }
    console.log(JSON.stringify({
      category,
      count: Array.isArray(list?.results) ? list.results.length : 0,
      first,
      detailKeys: detail ? Object.keys(detail) : null,
      detailPreview: detail ? {
        id: detail.id,
        title: detail.title,
        text: detail.text,
        passage: detail.passage,
        media: detail.media,
        answer_details: detail.answer_details?.slice?.(0, 3),
      } : null,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
