import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
const sections=['Star Sleep third-party notices\n\nThird-party components retain their original licenses.\nElectron / Chromium notices are also shipped next to the application executable.\n'];
for(const [relative,entry] of Object.entries(lock.packages)){
  if(!relative || entry.dev || entry.devOptional)continue;
  const directory=path.join(root,relative);
  if(!fs.existsSync(directory))throw new Error(`Missing dependency: ${relative}. Run npm ci first.`);
  const packageInfo=JSON.parse(fs.readFileSync(path.join(directory,'package.json'),'utf8'));
  const files=fs.readdirSync(directory).filter(name=>/^(licen[cs]e|copying|notice|ofl)([.-]|$)/i.test(name)&&fs.statSync(path.join(directory,name)).isFile());
  if(!files.length)throw new Error(`No license file found: ${relative}`);
  sections.push(`\n${'='.repeat(72)}\n${packageInfo.name} ${packageInfo.version} (${entry.license??packageInfo.license??'see below'})\n`);
  for(const file of files)sections.push(fs.readFileSync(path.join(directory,file),'utf8'));
}
fs.writeFileSync(path.join(root,'THIRD_PARTY_NOTICES.txt'),sections.join('\n'));
console.log('Third-party notices prepared from installed production dependencies.');
