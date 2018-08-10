import { Options } from 'amqplib';

export interface ServerOptions {
    url?: string;
    queue?: string;
    prefetchCount?: number;
    isGlobalPrefetchCount?: boolean;
    queueOptions?: Options.AssertQueue;
}