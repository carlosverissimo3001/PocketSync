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
