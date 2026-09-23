const fs=require('fs'),path=require('path'),Module=require('module');
const file=path.join(__dirname,'qa-upgrade-v13.cjs');let source=fs.readFileSync(file,'utf8').replaceAll('1.2.0','1.8.0').replaceAll('1.3.0','1.9.0').replaceAll('upgrade-v13-','upgrade-v19-').replaceAll('artifacts/v13/upgrade.json','artifacts/v19/upgrade.json').replaceAll('1.2 → 1.3 → 1.2','1.8 → 1.9 → 1.8').replace('win-unpacked/星眠.exe','win-unpacked/${version===\'1.9.0\'?\'星枢\':\'星眠\'}.exe');
const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(__dirname);m._compile(source,file);
