import type { MindmapData, MindmapNode } from './types';
import { hierarchy, tree } from 'd3-hierarchy';

export interface RenderedNode {
  id: string;
  label: string;
  x: number;
  y: number;
  depth: number;
  noteRef?: string;
  collapsed: boolean;
  children?: RenderedNode[];
}

export function buildHierarchy(data: MindmapData) {
  const root = hierarchy<MindmapNode>(data.root, (d) => d.children);
  const layout = tree<MindmapNode>().nodeSize([40, 180]);
  layout(root);
  return root;
}

export function flattenNodes(root: any): RenderedNode[] {
  const nodes: RenderedNode[] = [];
  root.each((node: any) => {
    nodes.push({
      id: node.data.id,
      label: node.data.label,
      x: node.x,
      y: node.y,
      depth: node.depth,
      noteRef: node.data.noteRef,
      collapsed: node.data.collapsed ?? false,
    });
  });
  return nodes;
}

export function getLinks(root: any): Array<{ source: any; target: any }> {
  return root.links().map((link: any) => ({
    source: { x: link.source.x, y: link.source.y },
    target: { x: link.target.x, y: link.target.y },
  }));
}

export function getDefaultColors(depth: number, theme: string = 'tech') {
  if (theme === 'garden') {
    const colors = ['#5c7c55', '#7d9b76', '#a3b899'];
    return colors[depth % colors.length];
  }
  const colors = ['#58a6ff', '#238636', '#8957e5', '#d29922'];
  return colors[depth % colors.length];
}
