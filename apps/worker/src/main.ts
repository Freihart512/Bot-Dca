import { WorkerModule } from "./worker.module";

const TICK_INTERVAL_MS = 5_000;

function createDbPlaceholder() {
  return {
    async connect(): Promise<void> {
      console.log("worker db placeholder connected");
    }
  };
}

async function bootstrap(): Promise<void> {
  const module = new WorkerModule(createDbPlaceholder());
  await module.initialize();

  console.log("worker started");
  setInterval(() => {
    // Placeholder loop. Trading logic starts in later TECH tasks.
    console.log("worker tick placeholder");
  }, TICK_INTERVAL_MS);
}

void bootstrap();
