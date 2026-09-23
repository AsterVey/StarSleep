// Existing assertions are reused; only navigation and output location changed in v1.8.
const fs=require('fs'),path=require('path'),Module=require('module');
const name=process.argv[2];if(!['qa-market','qa-toolbox','qa-v15','qa-theme-hub'].includes(name))throw Error('Select a known regression suite');
const file=path.join(__dirname,name+'.cjs');let source=fs.readFileSync(file,'utf8');
source=source.replaceAll("name:'Agent 工具箱',exact:true","name:'Agent 工作台',exact:true");
source=source.replace("out=path.join(root,'artifacts/v17')","out=process.env.STARSLEEP_QA_OUT||path.join(root,'artifacts/v18/regression-market')");
source=source.replace("await p.getByRole('button',{name:'Agent 与美化',exact:true}).click();await p.getByRole('button',{name:'原界面美化',exact:true}).click();", "await p.getByRole('navigation',{name:'空间导航'}).getByRole('button',{name:'美化工坊',exact:true}).click();await p.getByRole('button',{name:'我的主题',exact:true}).click();await p.getByText('客户端检测与目标位置',{exact:true}).click();");
const moduleInstance=new Module(file,module);moduleInstance.filename=file;moduleInstance.paths=Module._nodeModulePaths(__dirname);moduleInstance._compile(source,file);
