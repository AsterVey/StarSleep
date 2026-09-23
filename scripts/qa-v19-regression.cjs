const fs=require('fs'),path=require('path'),Module=require('module');
const file=path.join(__dirname,'qa-v18-regression.cjs');let source=fs.readFileSync(file,'utf8');
source=source.replace('const moduleInstance=',`source=source.replaceAll("name:'Agent 与美化',exact:true","name:'夜间联动',exact:true").replaceAll('星眠','星枢');\nconst moduleInstance=`);
const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(__dirname);m._compile(source,file);
