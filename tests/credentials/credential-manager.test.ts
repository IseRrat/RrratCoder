import { describe, it, expect, afterEach } from 'vitest';
import { CredentialManager } from '../../src/credentials/credential-manager';
import * as fs from 'fs';
import { join, dirname } from 'path';

const TEST_PATH = '.harness/test-credentials.enc';
const TEST_PLAIN = join(dirname(TEST_PATH), 'api-key');

describe('CredentialManager', () => {
  afterEach(() => {
    if (fs.existsSync(TEST_PATH)) fs.unlinkSync(TEST_PATH);
    if (fs.existsSync(TEST_PLAIN)) fs.unlinkSync(TEST_PLAIN);
  });

  it('store 后 retrieve 应返回相同值', () => {
    const cm = new CredentialManager(TEST_PATH);
    cm.init('my-secret-password');
    cm.store('sk-test-api-key-12345');
    expect(cm.retrieve()).toBe('sk-test-api-key-12345');
  });

  it('未初始化时 store 应抛出错误', () => {
    const cm = new CredentialManager(TEST_PATH);
    expect(() => cm.store('key')).toThrow('未初始化');
  });

  it('status 应显示已配置而不回显明文', () => {
    const cm = new CredentialManager(TEST_PATH);
    cm.init('password');
    cm.store('sk-secret');
    expect(cm.status()).toContain('已配置');
    expect(cm.status()).toContain('****');
    expect(cm.status()).not.toContain('sk-secret');
  });

  it('clear 应删除文件并清除状态', () => {
    const cm = new CredentialManager(TEST_PATH);
    cm.init('password');
    cm.store('sk-secret');
    cm.clear();
    expect(fs.existsSync(TEST_PATH)).toBe(false);
    expect(cm.status()).toBe('未配置');
  });

  it('错误密码应导致解密失败', () => {
    const cm1 = new CredentialManager(TEST_PATH);
    cm1.init('correct-password');
    cm1.store('sk-secret');

    const cm2 = new CredentialManager(TEST_PATH);
    cm2.init('wrong-password');
    expect(() => cm2.retrieve()).toThrow();
  });

  // ==== 无密码模式测试 ====
  it('storePlain 后 retrievePlain 应返回相同值', () => {
    const cm = new CredentialManager(TEST_PATH);
    cm.storePlain('sk-abc123');
    expect(cm.retrievePlain()).toBe('sk-abc123');
  });

  it('hasPlain 应在存储后返回 true', () => {
    const cm = new CredentialManager(TEST_PATH);
    expect(cm.hasPlain()).toBe(false);
    cm.storePlain('sk-abc');
    expect(cm.hasPlain()).toBe(true);
  });

  it('clearPlain 应删除文件', () => {
    const cm = new CredentialManager(TEST_PATH);
    cm.storePlain('sk-abc');
    cm.clearPlain();
    expect(cm.hasPlain()).toBe(false);
  });
});
