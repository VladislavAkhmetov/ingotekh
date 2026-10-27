// Convert the saved Figma reference into dependency-free HTML and native CSS.
// Re-run with node scripts/build-static.cjs after updating the reference.
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync('design-reference/figma-reference.jsx', 'utf8');
const prefix = source.match(/assetPathPrefix = "([^"]+)/)[1];
const assets = Object.fromEntries([...source.matchAll(/const (img\w+) = `\$\{assetPathPrefix\}\/([^`]+)`;/g)].map(m => [m[1], {url: `${prefix}/${m[2]}`, file: `public/assets/figma/${m[1].slice(3)}${path.extname(m[2])}`} ]));
fs.mkdirSync('public/assets/figma', {recursive:true});
fs.writeFileSync('design-reference/assets.json', JSON.stringify(assets, null, 2));
const simple = {
 absolute:'position:absolute',relative:'position:relative',flex:'display:flex',block:'display:block',contents:'display:contents','inline-grid':'display:inline-grid',
 'flex-col':'flex-direction:column','flex-none':'flex:none','shrink-0':'flex-shrink:0','content-stretch':'align-content:stretch',
 'items-center':'align-items:center','items-start':'align-items:flex-start','justify-center':'justify-content:center','justify-between':'justify-content:space-between','justify-end':'justify-content:flex-end','place-items-start':'place-items:start',
 'col-1':'grid-column:1','row-1':'grid-row:1','w-full':'width:100%','h-full':'height:100%','size-full':'width:100%;height:100%',
 'min-w-full':'min-width:100%','min-w-px':'min-width:1px','max-w-none':'max-width:none',
 'inset-0':'inset:0','left-0':'left:0','top-0':'top:0','left-1/2':'left:50%',
 'overflow-hidden':'overflow:hidden','overflow-clip':'overflow:clip','pointer-events-none':'pointer-events:none',
 'object-cover':'object-fit:cover','object-bottom':'object-position:bottom','not-italic':'font-style:normal',
 'text-white':'color:var(--white)','bg-white':'background-color:var(--white)','text-center':'text-align:center','text-right':'text-align:right','text-ellipsis':'text-overflow:ellipsis',
 'whitespace-nowrap':'white-space:nowrap','whitespace-pre-wrap':'white-space:pre-wrap','uppercase':'text-transform:uppercase',
 'leading-none':'line-height:1','font-bold':'font-weight:700','font-medium':'font-weight:500','font-semibold':'font-weight:600',
 'border':'border-width:1px','border-solid':'border-style:solid','ml-0':'margin-left:0','mt-0':'margin-top:0','mb-0':'margin-bottom:0',
 '-translate-x-1/2':'--tx:-50%','-translate-x-full':'--tx:-100%','translate-y-full':'--ty:100%',
 '-scale-x-100':'--sx:-1','-scale-y-100':'--sy:-1','scale-y-99':'--sy:.99','rotate-180':'--r:180deg','rotate-165':'--r:165deg',
 'bg-gradient-to-b':'background-image:linear-gradient(to bottom,var(--from),var(--to))'
};
const props = {w:'width',h:'height',left:'left',top:'top',right:'right',bottom:'bottom',gap:'gap',inset:'inset',leading:'line-height',tracking:'letter-spacing',rounded:'border-radius','rounded-bl':'border-bottom-left-radius','rounded-br':'border-bottom-right-radius',ml:'margin-left',mt:'margin-top','grid-cols':'grid-template-columns','grid-rows':'grid-template-rows',flex:'flex',rotate:'--r','skew-x':'--skew',from:'--from',to:'--to'};
function value(v) {return v.replaceAll('_',' ').replace(/calc\(([^)]+)\)/g, (_,x)=>`calc(${x.replace(/(?<=[%\d])([+-])/g,' $1 ')})`).replaceAll('#0062d2','var(--blue)').replaceAll('#27292b','var(--dark)');}
function declaration(c) {
 if (simple[c]) return simple[c];
 if (c.startsWith('[')) return value(c.slice(1,-1));
 const m=c.match(/^(.+?)-\[(.*)\]$/); if(!m) throw Error(`Unknown class ${c}`);
 let [,k,v]=m; v=value(v);
 if(k==='font') {let [family,weight]=v.replaceAll("'",'').split(':');return `font-family:'${family}',sans-serif;font-weight:${({Light:300,Regular:400,Medium:500,Semi_Bold:600,'Semi Bold':600,Bold:700})[weight]||400}`;}
 if(k==='size')return `width:${v};height:${v}`;
 if(k==='px')return `padding-left:${v};padding-right:${v}`;
 if(k==='py')return `padding-top:${v};padding-bottom:${v}`;
 if(k==='text')return v.startsWith('color:')?v:/^[\d.]+px$/.test(v)?`font-size:${v}`:`color:${v}`;
 if(k==='bg')return `background-color:${v}`;
 if(k==='border')return /^\d/.test(v)?`border-width:${v}`:`border-color:${v}`;
 if(props[k])return `${props[k]}:${v}`;
 throw Error(`Unknown property ${c}`);
}
let html=source.slice(source.indexOf('    <div className='),source.lastIndexOf('\n  );'));
// Existing x2 exports already contain the crop and rotation. Flatten those
// illustration wrappers so the transform is not applied a second time.
const sourceIllustrations = {
 '5748:2744':['Hero_Illustration.png',548,682],
 '5748:2772':['Hero_ArrowDecor.png',214,295.5],
 '5748:3559':['About_ArrowDecor_Left.png',57.5,79],
 '5748:3560':['About_ArrowDecor_Right.png',57.5,79],
 '5748:2811':['Projects_Card_Illustration.png',131,146],
 '5748:2812':['Projects_Card_Illustration-2.png',151.5,121],
 '5748:2813':['Projects_Card_Illustration-3.png',191.5,164],
 '5748:2814':['Projects_Card_Illustration-4.png',129,130],
 '5748:2997':['Benefits_Card_Illustration.png',206,197],
 '5748:2999':['Benefits_Card_Illustration-2.png',248,208],
 '5748:3004':['Benefits_Card_Illustration-3.png',232,230],
 '5748:3012':['Benefits_Card_Illustration-4.png',258,219],
 '5748:3017':['Benefits_Card_Illustration-5.png',243,214],
 '5748:3022':['Benefits_Card_Illustration-6.png',239,186],
 '5748:2896':['Team_Illustration_1.png',497,532],
 '5748:2897':['Team_Illustration_2.png',481,446],
 '5748:2898':['Team_Illustration_3.png',486,506],
 '5748:3152':['Office_IconDecor_Shield.png',393,446],
 '5748:3153':['Office_IconDecor_Folder.png',295.5,295.5],
 '5748:3155':['Office_CTA_Illustration_Small.png',234.5,235.5],
 '5748:3156':['Office_CTA_Illustration_Large.png',415,382.5]
};
for(const [id,[file,w,h]] of Object.entries(sourceIllustrations)) {
 const at=html.indexOf(`data-node-id="${id}"`),start=html.lastIndexOf('<div',at),openEnd=html.indexOf('>',at);
 if(at<0)throw Error(`Missing source illustration ${id}`);
 let depth=1,end=openEnd+1; const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=end;
 let tag;while(depth&&(tag=tags.exec(html))){depth+=tag[0].startsWith('</')?-1:tag[0].endsWith('/>')?0:1;end=tags.lastIndex;}
 let opening=html.slice(start,openEnd+1).replace(/h-\[[^\]]+\]/,`h-[${h}px]`).replace(/w-\[[^\]]+\]/,`w-[${w}px]`);
 opening=opening.replace(/size-\[[^\]]+\]/,`w-[${w}px] h-[${h}px]`);
 html=html.slice(0,start)+opening+`<img alt="" className="block size-full" src="public/assets/source/${file}" width="${w}" height="${h}" /></div>`+html.slice(end);
}
html=html.replace(/\{`([^`]*)`\}/g,(_,v)=>v.replaceAll('&','&amp;').replaceAll('<','&lt;'));
html=html.replace(/src=\{(img\w+)\}/g,(_,v)=>`src="${assets[v].file}"`);
html=html.replace(/<br aria-hidden\s*\/>/g,'<br aria-hidden="true">');
html=html.replace(/<(div|span|p)([^>]*?)\s*\/>/g,'<$1$2></$1>');
html=html.replace(/aria-hidden(?=\s|>)/g,'aria-hidden="true"');
html=html.replace(/style=\{\{\s*(\w+):\s*"([^"]*)"\s*\}\}/g,(_,key,v)=>`style="${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}:${v}"`);
// JSX ignores indentation between adjacent spans; HTML would render a space.
html=html.replace(/>\s*\n\s*/g,'>').replace(/\s*\n\s*</g,'<');
const rules=[]; let n=0;
html=html.replace(/className="([^"]*)"([^>]*)(?=>)/g,(_,classes,rest)=>{
 const name=rest.match(/data-name="([^"]+)"/)?.[1];
 const cls=(name?name.replace(/[^a-zA-Z0-9_-]/g,'-').toLowerCase().replace(/^(?=\d)/,'section-'):'layer')+'-'+(++n);
 const declarations=classes.split(' ').map(declaration);
 if(classes.split(' ').some(c=>/^(?:-?scale|rotate|skew|-?translate)/.test(c))) declarations.push('transform:translate(var(--tx,0),var(--ty,0)) rotate(var(--r,0deg)) skewX(var(--skew,0deg)) scale(var(--sx,1),var(--sy,1))');
 rules.push(`.${cls} { ${declarations.join(';')}; }`);
 return `class="${cls}"${rest}`;
});
// Mark the eleven design sections while preserving their measured geometry.
html=html.replace(/<div([^>]*data-name="(\d\d_([^" ]+))"[^>]*)>/g,(_,attrs,name,id)=>`<div${attrs} id="${id.toLowerCase()}" role="${name.startsWith('01')?'banner':name.startsWith('11')?'contentinfo':'region'}" aria-label="${id}">`);
html=html.replace(/data-name="Hero_Logo"/,'data-name="Hero_Logo" role="heading" aria-level="1" aria-label="Инготех"');
const head='<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Инготех — Технологии уверенности</title>\n<meta name="description" content="Инготех — цифровые продукты, команда и технологии Ингосстраха.">\n<link rel="stylesheet" href="css/fonts.css">\n<link rel="stylesheet" href="css/variables.css">\n<link rel="stylesheet" href="css/base.css">\n<link rel="stylesheet" href="css/sections.css">\n</head>\n<body>\n<main class="landing-canvas">\n';
// Keep block markup readable without adding whitespace inside text spans.
html=html.replace(/(<\/?div\b[^>]*>)/g,'\n$1\n').replace(/\n+/g,'\n');
let indent=1;
html=html.split('\n').filter(Boolean).map(line=>{if(line.startsWith('</div'))indent--;const formatted='  '.repeat(Math.max(0,indent))+line.trim();if(line.startsWith('<div'))indent++;return formatted;}).join('\n');
fs.writeFileSync('index.html',head+html+'\n</main>\n</body>\n</html>\n');
const usedAssets=Object.fromEntries(Object.entries(assets).filter(([,asset])=>html.includes(asset.file)));
fs.writeFileSync('design-reference/assets.json',JSON.stringify(usedAssets,null,2));
fs.writeFileSync('css/sections.css','/* Static 1440px Figma geometry. Source node IDs are retained in index.html. */\n'+rules.join('\n')+'\n');
console.log(`Built ${n} layers, ${Object.keys(assets).length} assets.`);
fs.writeFileSync('css/base.css', `*, *::before, *::after { box-sizing: border-box; border-width: 0; border-style: solid; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--dark); color: var(--white); font-family: 'IngoStem', sans-serif; font-size: 16px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
p, h1, h2, h3 { margin: 0; }
img { display: block; max-width: 100%; }
.landing-canvas { width: 1440px; margin: 0 auto; }
/* Fixed desktop composition. Mobile layout will be designed separately. */
@media (max-width: 1440px) { .landing-canvas { margin: 0; } }
`);
