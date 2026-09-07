import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'artifacts',name),'utf8'));
const qa=read('qa-results.json'),packaged=read('installed-smoke.json');
const enhanced=read('qa-v11-results.json'),upgrade=read('upgrade-results.json');
const tap=fs.readFileSync(path.join(root,'artifacts/unit.tap'),'utf8');
const passed=Number(tap.match(/^# pass (\d+)/m)?.[1]),failed=Number(tap.match(/^# fail (\d+)/m)?.[1]);
if(!Number.isInteger(passed)||!Number.isInteger(failed)||failed)throw new Error('Unit test report missing or failed');
if([...qa.results,...enhanced.results].some(r=>!r.passed)||qa.errors.length||enhanced.errors.length||!packaged.passed||!upgrade.passed)throw new Error('Verification did not pass');
fs.writeFileSync(path.join(root,'docs/verification.json'),JSON.stringify({
  generatedAt:new Date().toISOString(),
  unitTests:{passed,failed,reference:'npm test; see VALIDATION.md'},
  desktopChecks:[...qa.results,...enhanced.results],rendererErrors:[...qa.errors,...enhanced.errors],
  upgrade,
  packaged:{passed:packaged.passed,version:packaged.version,electron:packaged.electron},
  actualShutdownTested:false,
  fullInstallerLifecycle:'passed before UI refinement; not repeated against existing user installation'
},null,2)+'\n');
console.log('Public verification report exported without local paths or test data.');
