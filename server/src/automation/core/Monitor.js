export class Monitor {
  constructor() {
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: 0,
      totalDuration: 0
    };
  }

  record(result) {
    this.stats.total++;
    if (result.status === 'success') {
      this.stats.success++;
      this.stats.totalDuration += result.metrics?.duration || 0;
    } else if (result.status === 'failed') {
      this.stats.failed++;
    } else {
      this.stats.errors++;
    }
  }

  getReport() {
    const avgDuration = this.stats.success > 0 ? this.stats.totalDuration / this.stats.success : 0;
    return {
      ...this.stats,
      successRate: this.stats.total > 0 ? (this.stats.success / this.stats.total) * 100 : 0,
      avgDurationMs: avgDuration
    };
  }
}
