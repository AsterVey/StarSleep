import {useEffect,useState} from 'react';
import {Download,FileUp,ExternalLink,Trash2,Image as ImageIcon} from 'lucide-react';
import type {WallpaperItem} from '../integration-types';
import {Modal} from './UI';

export function Wallpapers(){
  const api=window.starSleep!;
  const [items,setItems]=useState<WallpaperItem[]>([]),[selected,setSelected]=useState('tidal-glass'),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[remove,setRemove]=useState(false),[loading,setLoading]=useState(true);
  const item=items.find(i=>i.id===selected)||items[0];
  async function refresh(){const value=await api.wallpaperList();setItems(value.items);setError(value.error);}
  useEffect(()=>{let live=true;void api.wallpaperList().then(value=>{if(live){setItems(value.items);setError(value.error);}}).catch(e=>{if(live)setError(String(e));}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
  useEffect(()=>{let live=true;setPreview('');if(item)void api.wallpaperPreview(item.id).then(value=>{if(live)setPreview(value);}).catch(e=>{if(live)setError(String(e));});return()=>{live=false;};},[item?.id]);
  useEffect(()=>{api.panelOpen(busy||remove);return()=>api.panelOpen(false);},[busy,remove]);
  async function run(action:()=>Promise<void>){if(busy)return;setBusy(true);setMessage('');try{await action();}catch(e){setMessage(String(e).replace(/^Error:.*Error: /,''));}finally{setBusy(false);}}
  return <div className="integration-body wallpaper-layout">
    <section className="wallpaper-collection" aria-label="DeepSeek 背景库">
      <div className="wallpaper-title"><div><h2>给工作留一点风景</h2><p>为 DeepSeek Mist 准备的浅色背景。</p></div><button className="secondary" disabled={busy} onClick={()=>void run(async()=>{const id=await api.wallpaperImport();if(id){await refresh();setSelected(id);setMessage('图片已加入背景库，尚未应用到 DeepSeek。');}})}><FileUp size={17}/> 导入图片</button></div>
      {loading&&<p role="status">正在读取背景…</p>}
      {error&&<p role="alert">{error}</p>}
      <div className="wallpaper-thumbnails">{items.map(i=><button className={`wallpaper-tile ${item?.id===i.id?'selected':''}`} aria-pressed={item?.id===i.id} disabled={busy} key={i.id} onClick={()=>setSelected(i.id)}><img src={i.thumbnail} alt=""/><span><strong>{i.name}</strong><small>{i.builtin?'星枢原创 · AI 生成':'我的图片'} · {i.width} × {i.height}</small></span></button>)}</div>
      <p className="wallpaper-limit">支持 PNG、JPEG、WebP，单张不超过 10 MB。最多保存 24 张个人图片，原文件保持不变。</p>
    </section>
    <section className="wallpaper-stage" aria-label="背景预览与导入说明">
      {item&&<><div className="wallpaper-title"><div><h2>{item.name}</h2><p>{item.description}</p></div>{!item.builtin&&<button className="icon-button" aria-label="移除背景" disabled={busy} onClick={()=>setRemove(true)}><Trash2 size={18}/></button>}</div>
        <figure className="wallpaper-figure"><img src={preview||item.thumbnail} alt={`${item.name}背景大图`}/><figcaption>背景图片预览 · 实际效果以 DeepSeek 界面为准</figcaption></figure>
        <div className="wallpaper-actions"><button className="primary" disabled={busy} onClick={()=>void run(async()=>{setMessage(await api.wallpaperDshApply(item.id));})}>配置到 DeepSeek</button><button className="secondary" disabled={busy} onClick={()=>void run(async()=>{if(await api.wallpaperExport(item.id))setMessage('背景已导出。请在 DeepSeek → 设置 → Theme / 外观 → 选择图片中导入。');})}><Download size={17}/> 导出这张背景</button></div>
        <div className="wallpaper-howto"><h3><ImageIcon size={17}/> 在 DeepSeek 中使用</h3><ol><li>在「原界面美化」页选择 DeepSeek 数据目录，检测 Dream Skin 插件。</li><li>完全退出 DeepSeek，再选择上方「配置到 DeepSeek」；重新打开客户端核对背景。</li><li>在客户端 Theme / 外观中调整透明度与模糊。Mist 建议透明度 80%，模糊 1–3 px。</li></ol><p>也可以导出图片，再由插件的「选择图片」手动导入。星枢不会中断任务；可在原界面美化页恢复星枢修改的 DeepSeek 外观。</p><button className="text-button" disabled={busy} onClick={()=>void run(async()=>{await api.integrationLink('dsh-theme');})}>打开 Dream Skin 插件说明 <ExternalLink size={14}/></button></div>
      </>}
      {message&&<p className="wallpaper-feedback" role="status">{message}</p>}
    </section>
    {remove&&item&&<Modal title="从背景库移除？" onClose={()=>{if(!busy)setRemove(false);}}><p>{item.name}</p><p className="muted">已导出的图片和 DeepSeek 当前背景不会改变。</p><button className="danger-button" disabled={busy} onClick={()=>void run(async()=>{await api.wallpaperRemove(item.id);await refresh();setSelected('tidal-glass');setRemove(false);setMessage('已移除个人背景');})}>移除背景</button>{message&&<p role="alert">{message}</p>}</Modal>}
  </div>;
}
