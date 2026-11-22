import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'public/social-studio/fonts');fs.mkdirSync(target,{recursive:true});
const fonts=['outfit','manrope','dm-sans','inter','space-grotesk','sora','syne','archivo','oswald','playfair-display','cormorant-garamond','bodoni-moda','fraunces','rubik','fira-code'];
for(const font of fonts){const directory=path.join(root,'node_modules/@fontsource-variable',font),files=fs.readdirSync(path.join(directory,'files'));const file=files.find(name=>name===font+'-latin-wght-normal.woff2')||files.find(name=>name.startsWith(font+'-latin-')&&name.endsWith('-normal.woff2'));if(!file)throw Error('Missing font '+font);fs.copyFileSync(path.join(directory,'files',file),path.join(target,font+'.woff2'));for(const license of ['LICENSE','LICENSE.md'])if(fs.existsSync(path.join(directory,license))){fs.copyFileSync(path.join(directory,license),path.join(target,font+'-LICENSE.txt'));break;}}
const barlow=path.join(root,'node_modules/@fontsource/barlow-condensed');
for(const weight of [400,700,900])fs.copyFileSync(path.join(barlow,'files',`barlow-condensed-latin-${weight}-normal.woff2`),path.join(target,`barlow-condensed-${weight}.woff2`));
fs.copyFileSync(path.join(barlow,'LICENSE'),path.join(target,'barlow-condensed-LICENSE.txt'));
console.log(JSON.stringify({fonts:16,assets:'public/social-studio/fonts',customerAssetsCopied:false}));
