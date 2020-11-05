import { Injectable, LoggerService } from '@nestjs/common';
import {
	CONNECT_EVENT,
	CONNECTED_MESSAGE,
	DEFAULT_PREFETCH_COUNT,
	DEFAULT_RECONNECT_TIME,
	DEFAULT_TIMEOUT,
	DISCONNECT_EVENT,
	DISCONNECT_MESSAGE,
	ERROR_NO_ROUTE,
	ERROR_NONE_RPC,
	ERROR_TIMEOUT,
	ERROR_TYPE,
	REPLY_QUEUE,
	RMQ_ROUTES_META,
	DEFAULT_HEARTBEAT_TIME,
} from './constants';
import { EventEmitter } from 'events';
import { Channel, Message } from 'amqplib';
import * as amqp from 'amqp-connection-manager';
// tslint:disable-next-line:no-duplicate-imports
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { IRMQConnection, IRMQServiceOptions } from './interfaces/rmq-options.interface';
import { requestEmitter, responseEmitter, ResponseEmmiterResult } from './emmiters/router.emmiter';
import 'reflect-metadata';
import { IRouteMeta } from './interfaces/queue-meta.interface';
import { IPublishOptions } from './interfaces/rmq-publish-options.interface';
import { RMQError } from './classes/rmq-error.class';
import { RMQErrorHandler } from './classes/rmq-error-handler.class';
import { hostname } from 'os';
import { RQMColorLogger } from './helpers/logger';

@Injectable()
export class RMQService {
	private server: AmqpConnectionManager = null;
	private channel: ChannelWrapper = null;
	private options: IRMQServiceOptions;
	private sendResponseEmitter: EventEmitter = new EventEmitter();
	private replyQueue: string = REPLY_QUEUE;
	private routeMeta: IRouteMeta[];
	private logger: LoggerService;
	private isConnected: boolean = false;

	constructor(options: IRMQServiceOptions) {
		this.options = options;
		this.logger = options.logger ? options.logger : new RQMColorLogger(this.options.logMessages);
	}

	public async init(): Promise<void> {
		return new Promise((resolve) => {
			const connectionURLs: string[] = this.options.connections.map((connection: IRMQConnection) => {
				return `amqp://${connection.login}:${connection.password}@${connection.host}`;
			});
			const connectionOptions = {
				reconnectTimeInSeconds: this.options.reconnectTimeInSeconds ?? DEFAULT_RECONNECT_TIME,
				heartbeatIntervalInSeconds: this.options.heartbeatIntervalInSeconds ?? DEFAULT_HEARTBEAT_TIME,
			};
			this.server = amqp.connect(connectionURLs, connectionOptions);
			this.channel = this.server.createChannel({
				json: false,
				setup: async (channel: Channel) => {
					await channel.assertExchange(
						this.options.exchangeName,
						this.options.assertExchangeType ? this.options.assertExchangeType : 'topic',
						{
							...this.options.exchangeOptions,
							durable: this.options.isExchangeDurable ?? true,
						}
					);
					await channel.prefetch(
						this.options.prefetchCount ?? DEFAULT_PREFETCH_COUNT,
						this.options.isGlobalPrefetchCount ?? false
					);
					await channel.consume(
						this.replyQueue,
						(msg: Message) => {
							this.sendResponseEmitter.emit(msg.properties.correlationId, msg);
						},
						{
							noAck: true,
						}
					);
					if (this.options.queueName) {
						this.listen(channel);
					}
					this.logger.log(CONNECTED_MESSAGE);
					resolve();
				},
			});
			this.server.on(CONNECT_EVENT, (connection) => {
				this.isConnected = true;
				this.attachEmmitters();
			});
			this.server.on(DISCONNECT_EVENT, (err) => {
				this.isConnected = false;
				this.detachEmitters();
				this.logger.error(DISCONNECT_MESSAGE);
				this.logger.error(err.err);
			});
		});
	}

	public ack(msg: Message): void {
		this.channel.ack(msg);
	}

	public async send<IMessage, IReply>(topic: string, message: IMessage, options?: IPublishOptions): Promise<IReply> {
		return new Promise<IReply>(async (resolve, reject) => {
			const correlationId = this.getUniqId();
			const timeout = options?.timeout ?? this.options.messagesTimeout ?? DEFAULT_TIMEOUT;
			const timerId = setTimeout(() => {
				reject(new RMQError(`${ERROR_TIMEOUT}: ${timeout}`, ERROR_TYPE.TRANSPORT));
			}, timeout);
			this.sendResponseEmitter.once(correlationId, (msg: Message) => {
				clearTimeout(timerId);
				if (msg.properties.headers['-x-error']) {
					reject(this.errorHandler(msg));
				}
				const { content } = msg;
				if (content.toString()) {
					this.logger.debug(`Received ▼ [${topic}] ${content.toString()}`);
					resolve(JSON.parse(content.toString()));
				} else {
					reject(new RMQError(ERROR_NONE_RPC, ERROR_TYPE.TRANSPORT));
				}
			});
			await this.channel.publish(this.options.exchangeName, topic, Buffer.from(JSON.stringify(message)), {
				replyTo: this.replyQueue,
				appId: this.options.serviceName,
				timestamp: new Date().getTime(),
				correlationId,
				...options,
			});
			this.logger.debug(`Sent ▲ [${topic}] ${JSON.stringify(message)}`);
		});
	}

	public async notify<IMessage>(topic: string, message: IMessage, options?: IPublishOptions): Promise<void> {
		await this.channel.publish(this.options.exchangeName, topic, Buffer.from(JSON.stringify(message)), {
			appId: this.options.serviceName,
			timestamp: new Date().getTime(),
			...options,
		});
		this.logger.debug(`[${topic}] ${JSON.stringify(message)}`);
	}

	public healthCheck() {
		return this.isConnected;
	}

	public async disconnect() {
		this.detachEmitters();
		this.sendResponseEmitter.removeAllListeners();
		await this.channel.close();
		await this.server.close();
	}

	private async listen(channel: Channel) {
		await channel.assertQueue(this.options.queueName, {
			durable: this.options.isQueueDurable ?? true,
			arguments: this.options.queueArguments ?? {},
		});
		this.routeMeta = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
		this.routeMeta = this.routeMeta ?? [];
		if (this.routeMeta.length > 0) {
			this.routeMeta.map(async (meta) => {
				await channel.bindQueue(this.options.queueName, this.options.exchangeName, meta.topic);
			});
		}
		await channel.consume(
			this.options.queueName,
			async (msg: Message) => {
				this.logger.debug(`Received ▼ [${msg.fields.routingKey}] ${msg.content}`);
				if (this.isTopicExists(msg.fields.routingKey)) {
					msg = await this.useMiddleware(msg);
					requestEmitter.emit(msg.fields.routingKey, msg);
				} else {
					this.reply('', msg, new RMQError(ERROR_NO_ROUTE, ERROR_TYPE.TRANSPORT));
				}
			},
			{ noAck: false }
		);
	}

	private detachEmitters(): void {
		responseEmitter.removeAllListeners();
	}

	private attachEmmitters(): void {
		responseEmitter.on(ResponseEmmiterResult.success, async (msg, result) => {
			this.reply(result, msg);
		});
		responseEmitter.on(ResponseEmmiterResult.error, async (msg, err) => {
			this.reply('', msg, err);
		});
		responseEmitter.on(ResponseEmmiterResult.ack, async (msg) => {
			this.ack(msg);
		});
	}

	private async reply(res: any, msg: Message, error: Error | RMQError = null) {
		res = await this.intercept(res, msg, error);
		await this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(res)), {
			correlationId: msg.properties.correlationId,
			headers: {
				...this.buildError(error),
			},
		});
		this.logger.debug(`Sent ▲ [${msg.fields.routingKey}] ${JSON.stringify(res)}`);
	}

	private getUniqId(): string {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}
		return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
	}

	private isTopicExists(topic: string): boolean {
		return !!this.routeMeta.find((x) => x.topic === topic);
	}

	private async useMiddleware(msg: Message) {
		if (!this.options.middleware || this.options.middleware.length === 0) {
			return msg;
		}
		for (const middleware of this.options.middleware) {
			msg = await new middleware(this.logger).transform(msg);
		}
		return msg;
	}

	private async intercept(res: any, msg: Message, error?: Error) {
		if (!this.options.intercepters || this.options.intercepters.length === 0) {
			return res;
		}
		for (const intercepter of this.options.intercepters) {
			res = await new intercepter(this.logger).intercept(res, msg, error);
		}
		return res;
	}

	private isRMQError(error: Error | RMQError): error is RMQError {
		return (error as RMQError).code !== undefined;
	}

	private buildError(error: Error | RMQError) {
		if (!error) {
			return null;
		}
		let errorHeaders = {};
		errorHeaders['-x-error'] = error.message;
		errorHeaders['-x-host'] = hostname();
		errorHeaders['-x-service'] = this.options.serviceName;
		if (this.isRMQError(error)) {
			errorHeaders = {
				...errorHeaders,
				'-x-status-code': (error as RMQError).code,
				'-x-data': (error as RMQError).data,
				'-x-type': (error as RMQError).type,
			};
		}
		return errorHeaders;
	}

	private errorHandler(msg: Message): any {
		const { headers } = msg.properties;
		if (this.options.errorHandler) {
			return this.options.errorHandler.handle(headers);
		}
		return RMQErrorHandler.handle(headers);
	}
}
