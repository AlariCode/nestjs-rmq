import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { Options } from 'amqplib';
import { IServerOptions } from './server.interface';
import { Observable } from 'rxjs';
import {
    DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
    DEFAULT_PREFETCH_COUNT,
    DEFAULT_QUEUE,
    DEFAULT_QUEUE_OPTIONS,
    DEFAULT_URL,
    CONNECT_EVENT,
    DISCONNECT_EVENT,
    DISCONNECT_MESSAGE,
} from '../constants';
import * as amqp from 'amqp-connection-manager';

export class ServerRMQ extends Server implements CustomTransportStrategy {
    private server: any = null;
    private channel: any = null;
    private urls: string[];
    private queue: string;
    private prefetchCount: number;
    private queueOptions: Options.AssertQueue;
    private isGlobalPrefetchCount: boolean;

    constructor(private readonly options: IServerOptions) {
        super();
        this.urls = this.options.urls || [DEFAULT_URL];
        this.queue = this.options.queue || DEFAULT_QUEUE;
        this.prefetchCount = this.options.prefetchCount || DEFAULT_PREFETCH_COUNT;
        this.isGlobalPrefetchCount = this.options.isGlobalPrefetchCount || DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
        this.queueOptions = this.options.queueOptions || DEFAULT_QUEUE_OPTIONS;
    }

    public async listen(callback?: () => void): Promise<void> {
        await this.start(callback);
    }

    public close(): void {
        this.channel && this.channel.close();
        this.server && this.server.close();
    }

    private async start(callback?: () => void) {
        this.server = amqp.connect(this.urls);
        this.server.on(CONNECT_EVENT, () => {
            this.channel = this.server.createChannel({
                json: false,
                setup: async (channel) => {
                    await channel.assertQueue(this.queue, this.queueOptions);
                    await channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
                    channel.consume(this.queue, (msg) => this.handleMessage(msg), { noAck: true });
                    if (callback instanceof Function) {
                      callback();
                    }
                },
            });
        });

        this.server.on(DISCONNECT_EVENT, err => {
            this.logger.error(DISCONNECT_MESSAGE);
        });
    }

    private async handleMessage(message): Promise<void> {
        const { content, properties } = message;
        const messageObj = JSON.parse(content.toString());
        const handlers = this.getHandlers();
        const pattern = JSON.stringify(messageObj.pattern);
        if (!this.messageHandlers[pattern]) {
            return;
        }
        const handler = this.messageHandlers[pattern];
        const response$ = this.transformToObservable(await handler(messageObj.data)) as Observable<any>;
        response$ && this.send(response$, (data) => this.sendMessage(data, properties.replyTo, properties.correlationId));
    }

    private sendMessage(message, replyTo, correlationId): void {
        const buffer = Buffer.from(JSON.stringify(message));
        this.channel.sendToQueue(replyTo, buffer, { correlationId });
    }
}
