// Reuse the established packaged upgrade/downgrade assertions on isolated data.
const fs=require('fs'),path=require('path'),Module=require('module');
const file=path.join(__dirname,'qa-upgrade-v13.cjs');let s=fs.readFileSync(file,'utf8').replaceAll('1.2.0','1.7.0').replaceAll('1.3.0','1.8.0').replaceAll('upgrade-v13-','upgrade-v18-').replaceAll('artifacts/v13/upgrade.json','artifacts/v18/upgrade.json').replaceAll('1.2 → 1.3 → 1.2','1.7 → 1.8 → 1.7');
const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(__dirname);m._compile(s,file);
