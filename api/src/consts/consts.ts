import { JobOptions } from 'bull';

export const JOB_SETTINGS: JobOptions = {
  delay: 5000,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 500,
  },
};
