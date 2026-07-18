export function slugFromDirname(dirname: string): string {
  return dirname.replace(/^\d+-/, '');
}

export function orderFromDirname(dirname: string): number {
  const match = dirname.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : 999;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
