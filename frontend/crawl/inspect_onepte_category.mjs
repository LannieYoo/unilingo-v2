import https from 'https';

const category = Number(process.argv[2] || 1);

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
  const listUrl = `https://api.onepte.com/api/question-bank/public/v1/questions/?category=${category}&page=1&page_size=2`;
  const list = await getJson(listUrl);
  const items = Array.isArray(list.results) ? list.results : [];

  for (const item of items) {
    const detail = await getJson(`https://api.onepte.com/api/question-bank/public/v3/questions/${item.id}/details/`);
    const summary = {
      category,
      id: item.id,
      title: detail.title || item.title,
      preparation_time: detail.preparation_time,
      answer_time: detail.answer_time,
      media_type: detail.media?.type || null,
      media_transcript: detail.media?.transcript || null,
      text: detail.text || null,
      passage: detail.passage || null,
      answer_labels: Array.isArray(detail.answer_details) ? detail.answer_details.map((entry) => entry.label) : [],
      options_count: Array.isArray(detail.options) ? detail.options.length : 0,
      first_option: Array.isArray(detail.options) && detail.options[0] ? detail.options[0].text : null,
    };
    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
