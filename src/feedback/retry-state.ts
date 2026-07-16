export class RetryState {
  private retryCount = 0;

  constructor(private maxRetries: number = 3) {}

  get current(): number { return this.retryCount; }
  get canRetry(): boolean { return this.retryCount < this.maxRetries; }

  increment(): void { this.retryCount++; }
  reset(): void { this.retryCount = 0; }
}
