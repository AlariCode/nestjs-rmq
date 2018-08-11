import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { Channel, Connection, Options } from 'amqplib';
import { ServerOptions } from './server.interface';
import { Observable } from 'rxjs';
import { 
    DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
    DEFAULT_PREFETCH_COUNT,
    DEFAULT_QUEUE,
    DEFAULT_QUEUE_OPTIONS,
    DEFAULT_URL
} from '../constants';
import * as rqmPackage from 'amqplib';

export class ServerRMQ extends Server implements CustomTransportStrategy {
    private server: Connection = null;
    private channel: Channel = null;
    private url: string;
    private queue: string;
    private prefetchCount: number;
    private queueOptions: Options.AssertQueue
    private isGlobalPrefetchCount: boolean;

    constructor(private readonly options: ServerOptions) {
        super();
        this.url = this.options.url || DEFAULT_URL;
        this.queue = this.options.queue || DEFAULT_QUEUE;
        this.prefetchCount = this.options.prefetchCount || DEFAULT_PREFETCH_COUNT;
        this.isGlobalPrefetchCount = this.options.isGlobalPrefetchCount || DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
        this.queueOptions = this.options.queueOptions || DEFAULT_QUEUE_OPTIONS;
    }

    public async listen(callback: () => void): Promise<void> {
        await this.start(callback);
        this.channel.consume(this.queue, (msg) => this.handleMessage(msg), {
            noAck: true,
        });
    }

    private async start(callback?: () => void) {
        try {
            this.server = await rqmPackage.connect(this.url);
            this.channel = await this.server.createChannel();
            this.channel.assertQueue(this.queue, this.queueOptions);
            await this.channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
            callback();
        } catch (err) {
            this.logger.error(err);
        }
    }

    public close(): void {
        this.channel && this.channel.close();
        this.server && this.server.close();
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
        this.channel.sendToQueue(replyTo, buffer, { correlationId: correlationId });
    }
}
