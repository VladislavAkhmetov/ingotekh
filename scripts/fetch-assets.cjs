const fs = require('fs');
const assets = Object.values(require('../design-reference/assets.json'));
let next = 0;
async function worker() {
 while (next < assets.length) {
  const item=assets[next++];
  if(fs.existsSync(item.file) && fs.statSync(item.file).size>0) continue;
  const response=await fetch(item.url);
  if(!response.ok) throw new Error(`${response.status}: ${item.file}`);
  fs.writeFileSync(item.file,Buffer.from(await response.arrayBuffer()));
 }
}
Promise.all(Array.from({length:4},worker)).then(()=>console.log(`${assets.length} design assets available locally.`)).catch(error=>{console.error(error);process.exitCode=1;});
