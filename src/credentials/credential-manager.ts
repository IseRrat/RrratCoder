import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

const ALGORITHM = 'aes-256-gcm';
const KEYLEN = 32;
const DEFAULT_PATH = join(homedir(), '.rrratcoder', 'credentials.enc');

export class CredentialManager {
  private masterKey: Buffer | null = null;

  constructor(private filePath: string = DEFAULT_PATH) {}

  /** 使用主密码初始化加密密钥 */
  init(masterPassword: string): void {
    const salt = Buffer.from('rrratcoder-salt-2024', 'utf-8');
    this.masterKey = scryptSync(masterPassword, salt, KEYLEN);
  }

  /** 安全存储 API Key */
  store(apiKey: string): void {
    if (!this.masterKey) throw new Error('CredentialManager 未初始化，请先调用 init()');
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(apiKey, 'utf-8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const data = Buffer.concat([iv, authTag, encrypted]);
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.filePath, data.toString('base64'));
  }

  /** 读取 API Key（仅在内存中，不落盘） */
  retrieve(): string {
    if (!this.masterKey) throw new Error('CredentialManager 未初始化，请先调用 init()');
    if (!existsSync(this.filePath)) throw new Error('没有找到存储的凭据，请先运行 key set');
    const raw = Buffer.from(readFileSync(this.filePath, 'utf-8'), 'base64');
    const iv = raw.subarray(0, 16);
    const authTag = raw.subarray(16, 32);
    const encrypted = raw.subarray(32);
    const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf-8');
  }

  /** 获取脱敏状态信息 */
  status(): string {
    if (!existsSync(this.filePath)) return '未配置';
    return '已配置 (****-unknown)';
  }

  /** 清除凭据 */
  clear(): void {
    if (existsSync(this.filePath)) {
      unlinkSync(this.filePath);
    }
    this.masterKey = null;
  }

  // ==== 无密码模式（明文存储，简单 UX） ====
  private plainPath(): string {
    return join(dirname(this.filePath), 'api-key');
  }

  /** 无密码存储 */
  storePlain(apiKey: string): void {
    const path = this.plainPath();
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(path, apiKey.trim(), 'utf-8');
  }

  /** 无密码读取 */
  retrievePlain(): string {
    const path = this.plainPath();
    if (!existsSync(path)) throw new Error('没有找到存储的凭据');
    return readFileSync(path, 'utf-8').trim();
  }

  /** 检查无密码凭据是否存在 */
  hasPlain(): boolean {
    return existsSync(this.plainPath());
  }

  /** 清除无密码凭据 */
  clearPlain(): void {
    const path = this.plainPath();
    if (existsSync(path)) unlinkSync(path);
  }
}
