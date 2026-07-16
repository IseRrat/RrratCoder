import { describe, it, expect, afterEach } from 'vitest';
import { MemoryStore } from '../../src/memory/memory-store';
import * as fs from 'fs';

const TEST_FILE = '.harness/test-memory.json';

describe('MemoryStore', () => {
  afterEach(() => {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  });

  it('set 后 get 应返回相同值', () => {
    const store = new MemoryStore(TEST_FILE);
    store.set('conventions', 'indent', '2 spaces');
    const value = store.get('conventions', 'indent');
    expect(value).toBe('2 spaces');
  });

  it('持久化后重新加载可读到数据', () => {
    const store1 = new MemoryStore(TEST_FILE);
    store1.set('conventions', 'quotes', 'single');

    const store2 = new MemoryStore(TEST_FILE);
    expect(store2.get('conventions', 'quotes')).toBe('single');
  });

  it('query 应按关键词匹配', () => {
    const store = new MemoryStore(TEST_FILE);
    store.set('decisions', 'use-fetch', '本项目使用 fetch API');
    store.set('decisions', 'use-vitest', '使用 vitest 测试');
    const results = store.query('fetch');
    expect(results).toContain('[decisions] 本项目使用 fetch API');
  });

  it('不匹配的关键词应返回空', () => {
    const store = new MemoryStore(TEST_FILE);
    const results = store.query('nonexistent');
    expect(results).toEqual([]);
  });

  it('buildContextPrompt 应生成格式化提示词', () => {
    const store = new MemoryStore(TEST_FILE);
    store.set('conventions', 'indent', '2 spaces');
    const prompt = store.buildContextPrompt();
    expect(prompt).toContain('<project_memory>');
    expect(prompt).toContain('indent: 2 spaces');
    expect(prompt).toContain('</project_memory>');
  });

  it('空记忆时 buildContextPrompt 应返回空字符串', () => {
    const store = new MemoryStore(TEST_FILE);
    expect(store.buildContextPrompt()).toBe('');
  });
});
