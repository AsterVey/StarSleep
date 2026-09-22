import type { LogEntry, LogFilter } from '../src/shared';
import { localDate } from './scheduler';

export function filterLogs(logs: LogEntry[], filter: LogFilter) {
  if (!filter || typeof filter.query !== 'string' || filter.query.length > 200 || typeof filter.date !== 'string' || (filter.date && !/^\d{4}-\d{2}-\d{2}$/.test(filter.date)) || typeof filter.errorsOnly !== 'boolean') throw new Error('记录筛选条件无效');
  const query = filter.query.trim().toLocaleLowerCase();
  return logs.filter(log => (!query || log.text.toLocaleLowerCase().includes(query)) && (!filter.date || localDate(new Date(log.at)) === filter.date) && (!filter.errorsOnly || log.level === 'error'));
}

export function exportLogText(logs: LogEntry[], filter: LogFilter) {
  return filterLogs(logs, filter).map(log => `${new Date(log.at).toLocaleString('zh-CN', {hour12:false})} [${log.level === 'error' ? '错误' : '记录'}] ${log.text}`).join('\r\n') + '\r\n';
}
