import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import type {
  SiteConfig,
  TopicMeta,
  Chapter,
  SubChapter,
  Topic,
  NoteFrontmatter,
  MindmapData,
} from './types';
import { orderFromDirname, slugFromDirname } from './utils';

const slugger = new GithubSlugger();

function extractText(node: any): string {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(extractText).join('');
  return '';
}

const CONTENT_DIR = path.resolve(process.cwd(), 'content');

export function getSiteConfig(): SiteConfig {
  const configPath = path.join(CONTENT_DIR, 'site.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as SiteConfig;
}

export function getTopics(): Topic[] {
  const entries = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });
  const topics: Topic[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const topicSlug = entry.name;
    const topicPath = path.join(CONTENT_DIR, topicSlug);
    const metaPath = path.join(topicPath, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as TopicMeta;
    const chapters = getChapters(topicSlug);
    const modules = meta.modules ?? [];

    topics.push({ slug: topicSlug, meta, chapters, modules });
  }

  return topics.sort((a, b) => a.meta.order - b.meta.order);
}

export function getChapters(topicSlug: string): Chapter[] {
  const topicPath = path.join(CONTENT_DIR, topicSlug);
  const entries = fs.readdirSync(topicPath, { withFileTypes: true });
  const chapters: Chapter[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dirname = entry.name;
    const slug = slugFromDirname(dirname);
    const order = orderFromDirname(dirname);
    const chapterPath = path.join(topicPath, dirname);

    const notePath = path.join(chapterPath, 'note.md');
    const mindmapPath = path.join(chapterPath, 'mindmap.json');

    const hasNote = fs.existsSync(notePath);
    const hasMindmap = fs.existsSync(mindmapPath);

    if (!hasNote && !hasMindmap) continue;

    let note: Chapter['note'] | undefined;
    if (hasNote) {
      const raw = fs.readFileSync(notePath, 'utf-8');
      const parsed = matter(raw);
      const frontmatter = parsed.data as NoteFrontmatter;
      const headings = extractHeadings(parsed.content);

      note = {
        rawContent: parsed.content,
        frontmatter,
        headings,
      };
    }

    let mindmap: MindmapData | undefined;
    if (hasMindmap) {
      const raw = fs.readFileSync(mindmapPath, 'utf-8');
      mindmap = JSON.parse(raw) as MindmapData;
    }

    const title = note?.frontmatter.title ?? mindmap?.title ?? slug;
    const moduleId = note?.frontmatter.module ?? mindmap?.module;

    chapters.push({
      id: `${topicSlug}/${slug}`,
      slug,
      title,
      order,
      topicSlug,
      module: moduleId,
      note,
      mindmap,
      subChapters: getSubChapters(chapterPath, topicSlug, slug),
      hasNote,
      hasMindmap,
    });
  }

  return chapters.sort((a, b) => a.order - b.order);
}

function getSubChapters(chapterPath: string, topicSlug: string, chapterSlug: string): SubChapter[] {
  if (!fs.existsSync(chapterPath)) return [];

  const entries = fs.readdirSync(chapterPath, { withFileTypes: true });
  const subChapters: SubChapter[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dirname = entry.name;
    const slug = slugFromDirname(dirname);
    const order = orderFromDirname(dirname);
    const subChapterPath = path.join(chapterPath, dirname);

    const notePath = path.join(subChapterPath, 'note.md');
    const hasNote = fs.existsSync(notePath);
    if (!hasNote) continue;

    const raw = fs.readFileSync(notePath, 'utf-8');
    const parsed = matter(raw);
    const frontmatter = parsed.data as NoteFrontmatter;
    const headings = extractHeadings(parsed.content);

    const title = frontmatter.title ?? slug;

    subChapters.push({
      id: `${topicSlug}/${chapterSlug}/${slug}`,
      slug,
      title,
      topicSlug,
      chapterSlug,
      note: {
        rawContent: parsed.content,
        frontmatter,
        headings,
      },
      hasNote,
    });
  }

  return subChapters.sort((a, b) => a.order - b.order);
}

function extractHeadings(content: string): Array<{ text: string; slug: string; depth: number }> {
  const tree = remark().use(remarkParse).parse(content);
  const headings: Array<{ text: string; slug: string; depth: number }> = [];

  slugger.reset();
  visit(tree, 'heading', (node: any) => {
    const text = extractText(node);
    const slug = slugger.slug(text);
    headings.push({ text, slug, depth: node.depth });
  });

  return headings;
}

export function getTopicBySlug(slug: string): Topic | undefined {
  return getTopics().find((t) => t.slug === slug);
}

export function getChapterBySlug(topicSlug: string, chapterSlug: string): Chapter | undefined {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return undefined;
  return topic.chapters.find((c) => c.slug === chapterSlug);
}

export function getSubChapterBySlug(
  topicSlug: string,
  chapterSlug: string,
  subChapterSlug: string
): SubChapter | undefined {
  const chapter = getChapterBySlug(topicSlug, chapterSlug);
  if (!chapter) return undefined;
  return chapter.subChapters.find((sc) => sc.slug === subChapterSlug);
}
