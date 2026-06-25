import https from 'https';

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'user-agent': 'Mozilla/5.0',
        accept: 'application/json, text/plain, */*',
        referer: 'https://www.easypte.com/pte/questionbank/speaking',
      },
    }, (res) => {
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
          reject(new Error(`Failed to parse ${url}: ${error.message}\n${data.slice(0, 400)}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const listUrl = 'https://www.easypte.com/api/pte/question/?category_id=1&type_id=19&page=1';
  const list = await getJson(listUrl);
  const candidates = [
    ...(Array.isArray(list?.results) ? list.results : []),
    ...(Array.isArray(list?.data) ? list.data : []),
    ...(Array.isArray(list?.list) ? list.list : []),
    ...(Array.isArray(list?.detail) ? list.detail : []),
  ];
  const sample = candidates[0];
  console.log('LIST_KEYS', Object.keys(list || {}));
  console.log('LIST_RAW', JSON.stringify(list, null, 2).slice(0, 6000));
  console.log('SAMPLE_LIST', sample ? JSON.stringify(sample, null, 2).slice(0, 2000) : 'NO_SAMPLE');

  const questionId = sample?.id || sample?.question_id || sample?.questionId;
  if (!questionId) {
    console.log('NO_QUESTION_ID');
    return;
  }

  const detailUrl = `https://www.easypte.com/api/pte/question/details/?category_id=1&type_id=19&question_id=${questionId}`;
  const detail = await getJson(detailUrl);
  console.log('DETAIL_KEYS', Object.keys(detail || {}));
  console.log('DETAIL_SAMPLE', JSON.stringify(detail, null, 2).slice(0, 6000));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
