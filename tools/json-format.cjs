/* JSON lesbar formatieren: kurze Objekte und Arrays bleiben in einer Zeile. */
function fmt(v, ind = '') {
  if (v === undefined) return 'null';
  v = JSON.parse(JSON.stringify(v));
  const one = JSON.stringify(v);
  if (one.length + ind.length <= 110 || v === null || typeof v !== 'object') return one;
  const next = ind + '  ';
  if (Array.isArray(v)) return '[\n' + v.map((x) => next + fmt(x, next)).join(',\n') + '\n' + ind + ']';
  return '{\n' + Object.keys(v).map((k) => next + JSON.stringify(k) + ': ' + fmt(v[k], next)).join(',\n') + '\n' + ind + '}';
}
module.exports = (v) => fmt(v) + '\n';
