const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),release=path.join(root,'release/v1.8.0');
const source=require('fflate').unzipSync(fs.readFileSync(path.join(release,'StarSleep-Source-1.8.0.zip')));
const pkg=JSON.parse(Buffer.from(source['package.json']).toString());assert.equal(pkg.version,'1.8.0');assert.equal(pkg.dependencies.three,'0.180.0');
for(const name of ['src/components/StarScene.tsx','src/components/Workshop.tsx','electron/workshop-core.ts','tests/v18.test.ts','resources/licenses/React-Bits-LICENSE.txt'])assert.ok(source[name],name);
assert.ok(Object.keys(source).every(n=>!n.startsWith('.qa-data/')&&!n.startsWith('node_modules/')&&!n.startsWith('release/')&&!n.startsWith('artifacts/')));
const exe=fs.readFileSync(path.join(release,'StarSleep-Setup-1.8.0.exe'));assert.equal(exe.subarray(0,2).toString(),'MZ');assert.ok(exe.length>50*1024*1024);assert.ok(fs.existsSync(path.join(release,'win-unpacked/resources/app.asar')));
for(const v of ['1.0.0','1.1.0','1.2.0','1.7.0'])assert.ok(fs.existsSync(path.join(root,'release/v'+v)),v);
console.log(JSON.stringify({version:pkg.version,installerBytes:exe.length,sourceFiles:Object.keys(source).length,safeEntry:fs.existsSync(path.join(release,'体验新版.cmd')),historicalDirectoriesPreserved:true},null,2));
