import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

/**
 * 给每个 table 外层包一层 div.table-wrapper，便于横向滚动与样式控制。
 * 先收集所有 table 位置，再从后往前替换，避免遍历时修改树导致重复进入。
 */
function rehypeWrapTables() {
  return (tree: Root) => {
    const targets: Array<{ parent: any; index: number }> = [];
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'table' && parent && index !== null) {
        targets.push({ parent, index });
      }
    });
    for (let i = targets.length - 1; i >= 0; i--) {
      const { parent, index } = targets[i];
      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrapper'] },
        children: [parent.children[index]],
      };
      parent.children[index] = wrapper;
    }
  };
}

/**
 * 给普通段落里的 -> 开头行标记样式，并在能匹配到分笔记时自动转成跳转链接。
 * 形如 "-> 详见 Dockerfile 常用指令" 会被包成 <p class="see-also">；
 * 若 matched.title 与某个 subLink.title 匹配，则把「详见 XXX」渲染成指向该分笔记的 <a>。
 */
function rehypeSeeAlsoLinks(options: { subLinks?: Array<{ title: string; url: string }> }) {
  const subLinks = options?.subLinks ?? [];
  return (tree: Root) => {
    // 先收集，遍历结束后再统一改写，避免回调内修改 children 导致 unist 遍历器状态错乱
    const targets: Array<{
      node: Element;
      full: string;
      matched: { title: string; url: string };
    }> = [];

    visit(tree, 'element', (node) => {
      if (node.tagName !== 'p') return;
      const firstChild = node.children?.[0];
      if (!(firstChild && firstChild.type === 'text' && firstChild.value.startsWith('-> '))) return;

      node.properties = node.properties || {};
      (node.properties as Record<string, unknown>).className = ['see-also'];

      if (!subLinks.length) return;

      const full = firstChild.value;
      const matched = matchSubLink(full, subLinks);
      if (!matched) return;

      targets.push({ node, full, matched });
    });

    for (const { node, full, matched } of targets) {
      const seeIdx = full.indexOf('详见 ');
      const before = seeIdx >= 0 ? full.slice(0, seeIdx) : full.slice(0, 2);
      const linkText = seeIdx >= 0 ? `详见 ${matched.title}` : matched.title;
      const after = seeIdx >= 0 ? full.slice(seeIdx + linkText.length) : '';

      const children: Array<{ type: 'text'; value: string } | Element> = [];
      if (before) children.push({ type: 'text', value: before });
      children.push({
        type: 'element',
        tagName: 'a',
        properties: { href: matched.url, className: ['subnote-link'] },
        children: [{ type: 'text', value: linkText }],
      });
      if (after) children.push({ type: 'text', value: after });
      node.children = children;
    }
  };
}

/**
 * 把 "-> 详见 XXX" 中的 XXX 与目标分笔记标题匹配，返回可分链接。
 * 匹配优先级：精确相等 > 子串包含（取最长重叠）。匹配不上返回 null（降级为纯样式文字）。
 */
function matchSubLink(full: string, subLinks: Array<{ title: string; url: string }>) {
  let target = full.slice(2).trim();
  if (target.startsWith('详见 ')) target = target.slice(3).trim();
  if (!target) return null;

  const exact = subLinks.find((s) => s.title === target);
  if (exact) return exact;

  let best: { title: string; url: string } | null = null;
  let bestLen = 0;
  for (const s of subLinks) {
    if (target.includes(s.title) || s.title.includes(target)) {
      const len = Math.min(target.length, s.title.length);
      if (len > bestLen) {
        best = s;
        bestLen = len;
      }
    }
  }
  return best;
}

function createProcessor(subLinks: Array<{ title: string; url: string }> = []) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'prepend',
      properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
      content: {
        type: 'element',
        tagName: 'span',
        properties: {},
        children: [{ type: 'text', value: '#' }],
      },
    })
    .use(rehypeWrapTables)
    .use(rehypeSeeAlsoLinks, { subLinks })
    .use(rehypePrettyCode, {
      theme: 'github-dark',
      keepBackground: true,
    })
    .use(rehypeStringify);
}

/**
 * 将 Markdown 渲染为 HTML。
 * - 支持 GFM 表格、HTML 透传
 * - 代码块用 shiki (github-dark) 高亮
 * - 标题自动加 id + 锚点链接（与 content.ts 的 slug 算法一致，基于 github-slugger）
 * - 表格外层包 .table-wrapper
 * - `-> 详见 XXX` 自动匹配 subLinks 生成跳转到分笔记的链接
 *
 * @param subLinks 当前章节/分笔记可用的分笔记链接（title + 完整 url），用于自动链接
 */
export async function renderMarkdown(
  content: string,
  subLinks?: Array<{ title: string; url: string }>,
): Promise<string> {
  const file = await createProcessor(subLinks ?? []);
  const result = await file.process(content);
  return String(result);
}
