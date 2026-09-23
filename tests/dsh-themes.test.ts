import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DshAppearance,dshPack,dshRequiredTokens,probeDsh} from '../electron/dsh-theme';
import {ThemeLibrary,parseThemeText,parseThemeCss} from '../electron/themes';

const pack={format:'dsh-dream-skin/pack',version:1,manifest:{id:'mist-example',name:'雾色测试',colorScheme:'light',tokens:Object.fromEntries(dshRequiredTokens.map(k=>[k,'#eef4fa']))}};
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'starsleep-dsh-theme-')),home=path.join(root,'dsh');fs.mkdirSync(home);const client=new DshAppearance(home,root);return {root,home,client,read:()=>JSON.parse(fs.readFileSync(client.target,'utf8')),write:(v:unknown)=>fs.writeFileSync(client.target,JSON.stringify(v)),close:()=>{assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('starsleep-dsh-theme-'));fs.rmSync(root,{recursive:true,force:true});}};}
test('community formats accept native Codex JSON, Claude translucent code background, and DSH packs',()=>{
  assert.equal(parseThemeText(JSON.stringify({variant:'light',theme:{accent:'#667788',surface:'#ffffff',ink:'#111111'}})).format,'codex-native');
  assert.equal(parseThemeText(JSON.stringify({bgMain:'#ffffff',textPrimary:'#111111',codeBg:'rgba(0, 255, 10, 0.05)'})).format,'claude-json');
  assert.equal(parseThemeText(JSON.stringify(pack)).format,'dsh-dreamskin');
  assert.throws(()=>dshPack({...pack,manifest:{...pack.manifest,tokens:{}}}),/七个/);
  assert.throws(()=>dshPack({...pack,manifest:{...pack.manifest,tokens:{...pack.manifest.tokens,'--dsw-extra':'url(https://invalid)'}}}),/颜色/);
  assert.throws(()=>parseThemeText(JSON.stringify({bgMain:'#ffffff',textPrimary:'#111111',codeBg:'url(x)'})));
});
test('CSS stays inert and retains its format across library reload and export',()=>{const f=fixture();try{const lib=new ThemeLibrary(f.root),css='/* author preset */\n:root { --accent: #cceeff; }',item=lib.import(Buffer.from(css),'custom.css');assert.equal(item.format,'custom-css');const loaded=new ThemeLibrary(f.root);assert.equal(loaded.raw(item.id).toString(),css);assert.throws(()=>loaded.import(Buffer.from(css),'other.css'),/已在/);assert.throws(()=>parseThemeCss('@import "https://invalid";','bad'));assert.throws(()=>parseThemeCss('','empty'));const dsh=lib.import(Buffer.from(JSON.stringify(pack)),'theme.json');assert.equal(new ThemeLibrary(f.root).get(dsh.id).format,'dsh-dreamskin');}finally{f.close();}});
test('DSH theme and wallpaper share first backup while restoring only owned fields',()=>{const f=fixture();try{
  const initial={'dsh-dream-skin:skin':'mist','dsh-dream-skin:wallpaper':'old','dsh-dream-skin:wallpaper-opacity':'0.2',unrelated:'keep'};f.write(initial);
  f.client.applyPack(JSON.stringify(pack));let state=f.read();assert.equal(state['dsh-dream-skin:skin'],'dream-pack:mist-example');assert.equal(state['dsh-dream-skin:wallpaper'],'old');assert.equal(JSON.parse(state['dsh-dream-skin:packs'])[0].manifest.name,'雾色测试');
  f.client.applyWallpaper('data:image/png;base64,YQ==');f.client.applyPack(JSON.stringify(pack));state=f.read();state.unrelated='changed by client';f.write(state);f.client.restore();assert.deepEqual(f.read(),{...initial,unrelated:'changed by client'});assert.equal(f.client.canRestore,false);
}finally{f.close();}});
test('DSH rejects external appearance edits, corrupted state, and conflicting theme IDs without overwrite',()=>{const f=fixture();try{
  f.write({});f.client.applyPack(JSON.stringify(pack));const changed={...f.read(),'dsh-dream-skin:skin':'dark'};f.write(changed);assert.throws(()=>f.client.restore(),/外部/);assert.throws(()=>f.client.applyWallpaper('data:image/png;base64,YQ=='),/外部/);assert.deepEqual(f.read(),changed);
  assert.throws(()=>f.client.applyPack(JSON.stringify({...pack,manifest:{...pack.manifest,name:'different'}})),/冲突/);
  fs.writeFileSync(f.client.target,'{broken');assert.throws(()=>f.client.applyPack(JSON.stringify(pack)),/损坏/);assert.equal(fs.readFileSync(f.client.target,'utf8'),'{broken');
}finally{f.close();}});
test('DSH loader probe requires enabled plugin with the verified durable format',()=>{const f=fixture();try{
  assert.equal(probeDsh('').ready,false);const profile=path.join(f.home,'profiles','desktop'),plugin=path.join(profile,'node_modules','dsh-dream-skin');fs.mkdirSync(path.join(plugin,'lib'),{recursive:true});fs.writeFileSync(path.join(profile,'package.json'),JSON.stringify({dsh:{profile:{bundles:['dsh-dream-skin']}}}));fs.writeFileSync(path.join(plugin,'package.json'),JSON.stringify({name:'dsh-dream-skin',version:'9.16.0'}));fs.writeFileSync(path.join(plugin,'lib','index.js'),'const file = "dream-skin.json";');assert.equal(probeDsh(f.home).ready,true);
  fs.writeFileSync(path.join(plugin,'package.json'),JSON.stringify({name:'dsh-dream-skin',version:'10.0.0'}));assert.equal(probeDsh(f.home).ready,false);
}finally{f.close();}});
