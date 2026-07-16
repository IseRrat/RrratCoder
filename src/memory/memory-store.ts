import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { MemoryData } from '../types/index';

function emptyMemory(): MemoryData {
  return { conventions: {}, decisions: [], projectKnowledge: [] };
}

export class MemoryStore {
  private data: MemoryData;

  constructor(private filePath: string) {
    this.data = this.load();
  }

  private load(): MemoryData {
    if (!existsSync(this.filePath)) return emptyMemory();
    try {
      return JSON.parse(readFileSync(this.filePath, 'utf-8')) as MemoryData;
    } catch {
      return emptyMemory();
    }
  }

  save(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  set(category: 'conventions', key: string, value: string): void;
  set(category: 'decisions' | 'projectKnowledge', key: string, value: string): void;
  set(category: string, key: string, value: string): void {
    if (category === 'conventions') {
      this.data.conventions[key] = value;
    } else {
      const arr = this.data[category as 'decisions' | 'projectKnowledge'];
      const existing = arr.find(d => d.key === key);
      if (existing) {
        existing.value = value;
        existing.timestamp = new Date().toISOString();
      } else {
        arr.push({ key, value, timestamp: new Date().toISOString() });
      }
    }
    this.save();
  }

  get(category: string, key: string): string | undefined {
    if (category === 'conventions') {
      return this.data.conventions[key];
    }
    const arr = this.data[category as 'decisions' | 'projectKnowledge'];
    return arr.find(d => d.key === key)?.value;
  }

  query(keyword: string): string[] {
    const results: string[] = [];
    const lower = keyword.toLowerCase();
    for (const category of ['decisions', 'projectKnowledge'] as const) {
      for (const entry of this.data[category]) {
        if (entry.key.toLowerCase().includes(lower) || entry.value.toLowerCase().includes(lower)) {
          results.push(`[${category}] ${entry.value}`);
        }
      }
    }
    for (const [key, value] of Object.entries(this.data.conventions)) {
      if (key.toLowerCase().includes(lower) || value.toLowerCase().includes(lower)) {
        results.push(`[conventions] ${key}: ${value}`);
      }
    }
    return results;
  }

  buildContextPrompt(): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(this.data.conventions)) {
      parts.push(`- ${key}: ${value}`);
    }
    for (const cat of ['decisions', 'projectKnowledge'] as const) {
      for (const entry of this.data[cat]) {
        parts.push(`- ${entry.key}: ${entry.value}`);
      }
    }
    if (parts.length === 0) return '';
    return '<project_memory>\n' + parts.join('\n') + '\n</project_memory>';
  }
}
