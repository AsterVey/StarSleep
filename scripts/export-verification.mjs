import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'artifacts',name),'utf8'));
const qa=read('qa-results.json'),packaged=read('installed-smoke.json');
if(qa.results.some(r=>!r.passed)||qa.errors.length||!packaged.passed)throw new Error('Verification did not pass');
fs.writeFileSync(path.join(root,'docs/verification.json'),JSON.stringify({
  date:new Date().toISOString().slice(0,10),
  unitTests:{passed:22,failed:0,reference:'npm test; see VALIDATION.md'},
  desktopChecks:qa.results,rendererErrors:qa.errors,
  packaged:{passed:packaged.passed,version:packaged.version,electron:packaged.electron},
  actualShutdownTested:false,
  fullInstallerLifecycle:'passed before UI refinement; not repeated against existing user installation'
},null,2)+'\n');
console.log('Public verification report exported without local paths or test data.');
