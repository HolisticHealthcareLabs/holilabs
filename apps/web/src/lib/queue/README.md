# BullMQ Queue System

Background job processing system using BullMQ and Redis for HoliLabs.

## Architecture

```
┌─────────────────┐
│   Web Server    │
│  (Next.js API)  │
└────────┬────────┘
         │ Add jobs
         ▼
┌─────────────────┐      ┌─────────────────┐
│   Redis Queue   │◄────►│  BullMQ Worker  │
│   (BullMQ)      │      │   (Background)  │
└─────────────────┘      └─────────────────┘
```

## Setup

### 1. Install Redis

**macOS (via Homebrew):**
```bash
brew install redis
brew services start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 2. Environment Variables

Add to `.env.local`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional
REDIS_DB=0
REDIS_TLS=false  # Set to 'true' for production with TLS

# Queue Configuration
QUEUE_CONCURRENCY=5  # Number of concurrent jobs per worker
```

### 3. Start Workers

**Development:**

Create a separate script to run workers alongside Next.js:

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "workers": "tsx watch src/lib/queue/workers/index.ts",
    "dev:all": "concurrently \"pnpm dev\" \"pnpm workers\""
  }
}
```

**Production:**

Workers should run as a separate process:

```bash
# Start Next.js server
pnpm start

# Start workers (separate process/container)
node --require dotenv/config dist/lib/queue/workers/index.js
```

## Usage

### Triggering Jobs

#### Via API (Recommended)

```typescript
// Trigger immediate correction aggregation
const response = await fetch('/api/admin/jobs/correction-aggregation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'daily', // or 'range'
    // For range type:
    // startDate: '2024-01-01T00:00:00.000Z',
    // endDate: '2024-01-31T23:59:59.999Z'
  }),
});

const { jobId } = await response.json();
console.log(`Job triggered: ${jobId}`);
```

#### Programmatic

```typescript
import { triggerImmediateCorrectionAggregation } from '@/lib/queue/scheduler';

// Trigger daily aggregation
const jobId = await triggerImmediateCorrectionAggregation();

// Trigger custom date range
const jobId = await triggerImmediateCorrectionAggregation(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

### Scheduled Jobs

Jobs are automatically scheduled on worker startup:

- **Daily Correction Aggregation**: Runs every day at 1:00 AM
  - Cron: `0 1 * * *`
  - Aggregates previous day's corrections
  - Generates training data for ML pipeline

To modify schedule, edit `src/lib/queue/scheduler.ts`:

```typescript
await queue.add(
  'daily-aggregation',
  { type: 'daily' },
  {
    repeat: {
      pattern: '0 1 * * *', // Cron pattern
    },
  }
);
```

## Available Queues

| Queue Name | Purpose | Priority |
|------------|---------|----------|
| `correction-aggregation` | RLHF correction processing | Medium |
| `patient-reminders` | Appointment/medication reminders | High |
| `lab-results` | Lab result processing | High |
| `prescription-refills` | Refill notifications | Medium |
| `email-notifications` | Email delivery | Low |
| `sms-notifications` | SMS delivery | Low |
| `whatsapp-messages` | WhatsApp delivery | Low |

## Monitoring

### Job Status API

```bash
# Get queue status and recent jobs
GET /api/admin/jobs/correction-aggregation

# Response:
{
  "counts": {
    "completed": 150,
    "failed": 2,
    "active": 1,
    "waiting": 5
  },
  "recent": {
    "completed": [...],
    "failed": [...],
    "active": [...]
  },
  "scheduled": [
    {
      "key": "correction-aggregation:daily-aggregation",
      "pattern": "0 1 * * *",
      "next": 1735171200000
    }
  ]
}
```

### Logs

All job events are logged via the application logger:

```typescript
// Worker started
{ event: 'worker_started', queue: 'correction-aggregation' }

// Job started
{ event: 'correction_aggregation_job_start', jobId: 'job-123' }

// Job completed
{ event: 'correction_aggregation_job_complete', jobId: 'job-123', processed: true }

// Job failed
{ event: 'correction_aggregation_job_error', jobId: 'job-123', error: '...' }
```

## Adding New Jobs

### 1. Add Queue Name

Edit `src/lib/queue/config.ts`:

```typescript
export enum QueueName {
  // ...
  MY_NEW_JOB = 'my-new-job',
}
```

### 2. Create Queue Getter

Edit `src/lib/queue/queues.ts`:

```typescript
let myNewJobQueue: Queue | null = null;

export function getMyNewJobQueue(): Queue {
  if (!myNewJobQueue) {
    myNewJobQueue = new Queue(QueueName.MY_NEW_JOB, defaultQueueOptions);
    logger.info({ event: 'queue_initialized', queueName: QueueName.MY_NEW_JOB });
  }
  return myNewJobQueue;
}
```

### 3. Create Worker

Create `src/lib/queue/workers/my-new-job.worker.ts`:

```typescript
import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions, QueueName } from '../config';
import logger from '@/lib/logger';

export interface MyJobData {
  foo: string;
  bar: number;
}

export interface MyJobResult {
  success: boolean;
  message: string;
}

async function processMyJob(job: Job<MyJobData, MyJobResult>): Promise<MyJobResult> {
  const { foo, bar } = job.data;

  logger.info({ event: 'my_job_start', jobId: job.id, foo, bar });

  try {
    // Your job logic here
    await someAsyncOperation(foo, bar);

    return { success: true, message: 'Job completed' };
  } catch (error) {
    logger.error({ event: 'my_job_error', jobId: job.id, error });
    throw error;
  }
}

export function startMyNewJobWorker(): Worker {
  const worker = new Worker<MyJobData, MyJobResult>(
    QueueName.MY_NEW_JOB,
    processMyJob,
    defaultWorkerOptions
  );

  worker.on('completed', (job, result) => {
    logger.info({ event: 'worker_job_completed', jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error({ event: 'worker_job_failed', jobId: job?.id, error: err.message });
  });

  return worker;
}
```

### 4. Register Worker

Edit `src/lib/queue/workers/index.ts`:

```typescript
import { startMyNewJobWorker } from './my-new-job.worker';

export function startAllWorkers(): void {
  // ...
  const myWorker = startMyNewJobWorker();
  activeWorkers.push(myWorker);
}
```

## Production Considerations

### Scaling

- **Horizontal scaling**: Run multiple worker processes across servers
- **Queue isolation**: Use separate Redis instances for different queue priorities
- **Concurrency tuning**: Adjust `QUEUE_CONCURRENCY` based on resource availability

### Monitoring

Consider adding external monitoring:

- **Bull Board** (dashboard UI) - requires Express adapter workaround for Next.js
- **Datadog** - APM monitoring for queues
- **Sentry** - Error tracking for failed jobs

### High Availability

- Use **Redis Sentinel** or **Redis Cluster** for HA
- Implement **circuit breakers** for external service calls
- Set appropriate **timeout** and **retry** strategies

## Troubleshooting

### Worker not processing jobs

1. Check Redis connection:
   ```bash
   redis-cli ping  # Should return PONG
   ```

2. Check worker logs:
   ```bash
   tail -f logs/workers.log
   ```

3. Verify queue has jobs:
   ```bash
   GET /api/admin/jobs/correction-aggregation
   ```

### Jobs stuck in "active" state

This usually means a worker crashed mid-job. BullMQ will automatically retry after a timeout.

To manually clean up:

```typescript
const queue = getCorrectionAggregationQueue();
await queue.clean(0, 1000, 'active'); // Clean active jobs older than 0ms
```

### Memory leaks

If workers consume increasing memory:

1. Check for unclosed database connections
2. Review job data size (avoid storing large payloads)
3. Ensure `removeOnComplete` is configured

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [BullMQ GitHub](https://github.com/taskforcesh/bullmq)
- [Redis Documentation](https://redis.io/documentation)
