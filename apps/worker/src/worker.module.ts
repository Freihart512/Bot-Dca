export type DatabasePlaceholder = {
  connect: () => Promise<void>;
};

export class WorkerModule {
  constructor(private readonly db: DatabasePlaceholder) {}

  async initialize(): Promise<void> {
    await this.db.connect();
  }
}
