import fs from 'node:fs';
import path from 'node:path';
import {zipSync} from 'fflate';
const root=path.resolve(import.meta.dirname,'..');
const allow=['src','electron','resources','scripts','tests','docs','.gitattributes','.gitignore','CHANGELOG.md','DESIGN.md','index.html','LICENSE','package-lock.json','package.json','PRODUCT.md','README.md','THIRD_PARTY_NOTICES.txt','tsconfig.json','VALIDATION.md','vite.config.ts'];
const files={};
function collect(relative){const file=path.join(root,relative),stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw new Error('Source archive must not follow symlinks');if(stat.isDirectory())for(const child of fs.readdirSync(file))collect(path.join(relative,child));else files[relative.replaceAll('\\','/')]=fs.readFileSync(file);}
for(const item of allow)collect(item);
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const brand=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).build.productName==='星枢'?'StarNexus':'StarSleep';
const out=path.join(root,`release/v${version}/${brand}-Source-${version}.zip`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,zipSync(files,{level:6}));
console.log(`Source archive: ${Object.keys(files).length} files; excludes test data, caches, credentials, binaries and node_modules.`);
