const urls = [
  'https://sabbath-school.adventech.io/api/v2/en/quarterlies/index.json',
  'https://sabbath-school.adventech.io/api/v1/en/quarterlies/index.json',
  'https://sabbath-school.adventech.io/api/v2/index.json',
  'https://sabbath-school.adventech.io/api/v1/index.json',
  'https://www.adventist.org/wp-json/wp/v2/posts?per_page=1',
  'https://ssnet.org/api/v1/lessons'
];
for (const url of urls) {
  try {
    const res = await fetch(url, { method: 'GET' });
    console.log(url, res.status, res.headers.get('content-type'));
    const text = await res.text();
    console.log(text.slice(0, 120).replace(/\s+/g, ' '));
  } catch (e) {
    console.log(url, 'ERR', e.message);
  }
  console.log('---');
}
