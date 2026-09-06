import fs from 'node:fs';
import path from 'node:path';
const owner=process.argv[2];
if(!owner || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(owner) || owner.includes('--'))throw new Error('Pass a valid GitHub username');
const root=path.resolve(import.meta.dirname,'..');
const packagePath=path.join(root,'package.json');
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
const previous=new URL(pkg.author.url).pathname.slice(1);
const files=['package.json','src/product.ts','README.md','docs/RELEASE-v1.0.0.md','scripts/qa.cjs'];
for(const file of files){const target=path.join(root,file);const source=fs.readFileSync(target,'utf8');fs.writeFileSync(target,source.replaceAll(`https://github.com/${previous}`,`https://github.com/${owner}`));}
console.log(`Updated GitHub URLs from ${previous} to ${owner}. Verify ownership, rebuild and retest before publishing.`);
