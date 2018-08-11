import { Channel, Connection, Options } from 'amqplib';
import { ClientProxy } from '@nestjs/microservices';
import { ClientOptions } from './client.interface';
import { EventEmitter } from 'events';
import { 
    DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
    DEFAULT_PREFETCH_COUNT,
    DEFAULT_QUEUE,
    DEFAULT_QUEUE_OPTIONS,
    DEFAULT_URL
} from '../constants';
import * as rqmPackage from 'amqplib';

export class ClientRMQ extends ClientProxy {
    private client: Connection = null;
    private channel: Channel = null;
    private url: string;
    private queue: string;
    private prefetchCount: number;
    private isGlobalPrefetchCount: boolean;
    private queueOptions: Options.AssertQueue
    private replyQueue: string;
    private responseEmitter: EventEmitter;

    constructor(
        private readonly options: ClientOptions) {
        super();
        this.url = this.options.url || DEFAULT_URL;
        this.queue = this.options.queue || DEFAULT_QUEUE;
        this.prefetchCount = this.options.prefetchCount || DEFAULT_PREFETCH_COUNT;
        this.isGlobalPrefetchCount = this.options.isGlobalPrefetchCount || DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
        this.queueOptions = this.options.queueOptions || DEFAULT_QUEUE_OPTIONS;
        this.connect();
    }

    protected publish(messageObj, callback: (err, result, disposed?: boolean) => void) {
        try {
            let correlationId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            this.responseEmitter.on(correlationId, msg => {
                this.handleMessage(msg, callback);
            });
            this.channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(messageObj)), {
                replyTo: this.replyQueue,
                correlationId: correlationId
            });
        } catch (err) {
            console.log(err);
            callback(err, null);
        }
    }

    private async handleMessage(message, callback): Promise<void> {
        if (message) {
            const { content } = message;
            const { err, response, isDisposed } = JSON.parse(content.toString());
            if (isDisposed || err) {
                callback({
                    err,
                    response: null,
                    isDisposed: true,
                });
            }
            callback({
                err,
                response,
            });
        }
    }

    public close(): void {
        this.channel && this.channel.close();
        this.client && this.client.close();
    }

    public listen() {
        this.channel.consume(this.replyQueue, (msg) => {
            this.responseEmitter.emit(msg.properties.correlationId, msg);
        }, { noAck: true });
    }

    public connect(): Promise<any> {
        if (this.client && this.channel) {
            return Promise.resolve();
        }
        return new Promise(async (resolve, reject) => {
            this.client = await rqmPackage.connect(this.url);
            this.channel = await this.client.createChannel();
            await this.channel.assertQueue(this.queue, this.queueOptions);
            await this.channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
            this.replyQueue = (await this.channel.assertQueue('', { exclusive: true })).queue;
            this.responseEmitter = new EventEmitter();
            this.responseEmitter.setMaxListeners(0);
            this.listen();
            resolve();
        });
    }
}