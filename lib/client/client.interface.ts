import { Options } from 'amqplib';

export interface ClientOptions {
    url?: string;
    queue?: string;
    prefetchCount?: number;
    isGlobalPrefetchCount?: boolean;
    queueOptions?: Options.AssertQueue;
}