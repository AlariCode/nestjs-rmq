import { Channel, Connection, Options } from 'amqplib';
import { ClientProxy } from '@nestjs/microservices';
import { ClientOptions } from './client.interface';
import { EventEmitter } from 'events';
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
        this.url = this.options.url || 'amqp://localhost';
        this.queue = this.options.queue || 'default';
        this.prefetchCount = this.options.prefetchCount || 0;
        this.isGlobalPrefetchCount = this.options.isGlobalPrefetchCount || false;
        this.queueOptions = this.options.queueOptions || {};
        this.connect();
    }

    protected publish(messageObj, callback: (err, result, disposed?: boolean) => void) {
        try {
            let correlationId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            this.responseEmitter.once(correlationId, msg => {
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
                return callback({
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