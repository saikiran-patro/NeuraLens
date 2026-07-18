import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { KnowledgeChunk } from "./types.js";

const PACKS: Record<string, { name: string; description: string; locked: boolean }> = {
  developer_debugging: {
    name: "Developer Debugging",
    description: "Practical React, JavaScript, npm, browser console, and Git diagnostics.",
    locked: false,
  },
  leetcode_patterns: {
    name: "Problem Solving",
    description: "Reusable algorithm patterns, complexity checks, and wrong-answer debugging.",
    locked: false,
  },
  browser_workflows: {
    name: "Browser Workflows",
    description: "Reliable guidance for forms, comparisons, research, and booking flows.",
    locked: false,
  },
  safety: {
    name: "Safety & Privacy",
    description: "Non-negotiable boundaries for screen context and approved actions.",
    locked: true,
  },
  product_docs: {
    name: "NeuraLens AI Guide",
    description: "Product behavior, modes, capabilities, and interaction guidance.",
    locked: false,
  },
};

const knowledgeRoot = path.resolve(process.cwd(), "knowledge");
let cache: KnowledgeChunk[] | null = null;

function titleFromMarkdown(markdown: string, fallback: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback.replace(/[_-]/g, " ");
}

function tokenize(value: string) {
  return [...new Set(value.toLowerCase().match(/[a-z0-9+#.-]{2,}/g) || [])].filter(
    (token) => !["the", "and", "for", "that", "with", "this", "from", "into", "your", "are", "you"].includes(token),
  );
}

export async function loadKnowledge(force = false) {
  if (cache && !force) return cache;
  const chunks: KnowledgeChunk[] = [];

  for (const [pack, meta] of Object.entries(PACKS)) {
    const directory = path.join(knowledgeRoot, pack);
    let files: string[] = [];
    try {
      files = (await readdir(directory)).filter((file) => file.endsWith(".md"));
    } catch {
      continue;
    }

    for (const file of files) {
      const markdown = await readFile(path.join(directory, file), "utf8");
      const title = titleFromMarkdown(markdown, path.basename(file, ".md"));
      const sections = markdown
        .split(/\n(?=##?\s)/)
        .map((section) => section.trim())
        .filter(Boolean);

      sections.forEach((content, index) => {
        chunks.push({
          id: `${pack}:${file}:${index}`,
          pack,
          packName: meta.name,
          title,
          file,
          content,
        });
      });
    }
  }

  cache = chunks;
  return chunks;
}

export async function retrieveKnowledge(query: string, limit = 5) {
  const chunks = await loadKnowledge();
  const tokens = tokenize(query);

  return chunks
    .map((chunk) => {
      const haystack = `${chunk.title} ${chunk.pack} ${chunk.content}`.toLowerCase();
      const score = tokens.reduce((total, token) => {
        const occurrences = haystack.split(token).length - 1;
        const titleBoost = chunk.title.toLowerCase().includes(token) ? 4 : 0;
        return total + Math.min(occurrences, 5) + titleBoost;
      }, 0);
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function getKnowledgePacks() {
  const chunks = await loadKnowledge();
  return Object.entries(PACKS).map(([id, meta]) => {
    const packChunks = chunks.filter((chunk) => chunk.pack === id);
    const documents = [...new Map(packChunks.map((chunk) => [chunk.file, chunk])).values()];
    return {
      id,
      ...meta,
      documents: documents.map((document) => ({
        title: document.title,
        file: document.file,
        excerpt: document.content.replace(/^#+\s+.+\n?/, "").replace(/\s+/g, " ").slice(0, 150),
      })),
    };
  });
}

export async function knowledgeDocumentCount() {
  const packs = await getKnowledgePacks();
  return packs.reduce((count, pack) => count + pack.documents.length, 0);
}
