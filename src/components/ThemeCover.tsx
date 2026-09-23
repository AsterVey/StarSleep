import type {CSSProperties} from 'react';
import {ArrowUpRight} from 'lucide-react';
import type {CommunityTheme} from '../workshop-types';
import fjord from '../../resources/wallpapers/cloud-fjord.png';
import tidal from '../../resources/wallpapers/tidal-glass.png';
const titles:Record<string,[string,string]>={'warm-light':['Warm.','纸与陶土'],'warm-dark':['Afterglow.','暮色余温'],arizona:['Arizona.','薄荷与樱色'],moonside:['Moonside.','霓虹夜航'],'dsh-aurora':['Aurora.','深林极光'],'codex-dream':['Your own view.','把喜欢的风景带进 Codex'],'dsh-dream':['A quieter space.','为 DeepSeek 留一片风景'],'dsh-market':['Discover.','寻找你的下一种风格']};
export function ThemeCover({theme:r,onClick}:{theme:CommunityTheme;onClick:()=>void}){
 const photo=!r.download,words=titles[r.id]??[r.name,'社区配色'];
 return <button className={`community-preview theme-cover ${photo?'photo-cover':'palette-cover'}`} aria-label={`查看 ${r.name}`} onClick={onClick} style={{'--cover-surface':r.colors[0],'--cover-panel':r.colors[1],'--cover-accent':r.colors[2],color:photo?'#223B50':r.style==='light'?'#263532':'#eef4fa'} as CSSProperties}>
 {photo?<img src={r.id==='codex-dream'?fjord:tidal} alt=""/>:<div className="palette-sculpture" aria-hidden="true"><i/><i/><i/></div>}
 <div className="cover-caption"><strong>{words[0]}</strong><span>{words[1]}</span></div><ArrowUpRight className="cover-arrow" size={18}/><div className="cover-swatches">{r.colors.map((c,i)=><i key={i} style={{background:c}}/>)}</div><small>{photo?'星枢背景示意':'配色艺术封面'}</small></button>;
}
