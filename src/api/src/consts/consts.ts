import { JobOptions } from 'bull';

export const JOB_SETTINGS: JobOptions = {
  delay: 5000,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 500,
  },
};

export const BUFFER_CLEANUP_CRON = '0 * * * *';
export const CRDT_QUEUE = 'crdt';
export const LIST_CACHE_TTL = 60 * 60 * 1000;
