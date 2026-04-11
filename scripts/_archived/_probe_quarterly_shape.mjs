const res = await fetch('https://sabbath-school.adventech.io/api/v2/en/quarterlies/index.json');
const data = await res.json();
console.log('count', Array.isArray(data) ? data.length : 'na');
console.log('keys', Object.keys(data[0] || {}));
console.log('first id', data[0]?.id || data[0]?.quarterly || data[0]?.index || 'none');
console.log(JSON.stringify(data[0], null, 2).slice(0, 600));
