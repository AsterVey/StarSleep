export function NotesField({value='',onChange}:{value?:string;onChange:(value:string)=>void}){
 return <label className="field notes-field">备注 · 到点时一起提醒<textarea aria-label="计划备注" rows={3} maxLength={500} value={value} onChange={e=>onChange(e.target.value)} placeholder="例如：先保存文件，再检查 Agent 构建结果。"/><span className="notes-count">{value.length} / 500 · 只保存在本机；导出计划时会包含备注</span></label>;
}
