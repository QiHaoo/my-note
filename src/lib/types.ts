export interface SiteConfig {
  title: string;
  description: string;
  author: string;
  defaultTheme: 'dark' | 'garden';
  themes: Array<'dark' | 'garden'>;
}

export interface TopicMeta {
  title: string;
  description: string;
  order: number;
  icon?: string;
  tags?: string[];
  modules?: TopicModule[];
}

export interface TopicModule {
  id: string;
  title: string;
  order?: number;
}

export type LearningStatus = 'learning' | 'reviewing' | 'mastered' | 'not-started';

export interface NoteFrontmatter {
  title: string;
  created: string;
  updated?: string;
  status: LearningStatus;
  tags?: string[];
  reviewable?: boolean;
  module?: string;
}

export interface MindmapNode {
  id: string;
  label: string;
  noteRef?: string;
  collapsed?: boolean;
  children?: MindmapNode[];
}

export interface MindmapData {
  title: string;
  subtitle?: string;
  root: MindmapNode;
  layout?: 'right' | 'left' | 'radial';
  theme?: string;
  module?: string;
  nodeStyle?: Record<string, { fill?: string; stroke?: string }>;
}

export interface SubChapter {
  id: string;
  slug: string;
  title: string;
  topicSlug: string;
  chapterSlug: string;
  note?: {
    rawContent: string;
    frontmatter: NoteFrontmatter;
    headings: Array<{ text: string; slug: string; depth: number }>;
  };
  hasNote: boolean;
}

export interface Chapter {
  id: string;
  slug: string;
  title: string;
  order: number;
  topicSlug: string;
  module?: string;
  note?: {
    rawContent: string;
    frontmatter: NoteFrontmatter;
    headings: Array<{ text: string; slug: string; depth: number }>;
  };
  mindmap?: MindmapData;
  subChapters: SubChapter[];
  hasNote: boolean;
  hasMindmap: boolean;
}

export interface Topic {
  slug: string;
  meta: TopicMeta;
  chapters: Chapter[];
  modules: TopicModule[];
}
