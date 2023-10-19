import { randomUUID } from 'node:crypto';

export const getUniqId = (): string => randomUUID();
