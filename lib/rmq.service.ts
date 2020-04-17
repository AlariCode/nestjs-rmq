import { Injectable, LoggerService } from '@nestjs/common';
import {
	CONNECTED_MESSAGE,
	CONNECTING_MESSAGE,
	CUSTOM_LOGS, DEFAULT_PREFETCH_COUNT,
	DEFAULT_RECONNECT_TIME,
	DEFAULT_TIMEOUT,
	DISCONNECT_EVENT,
	DISCONNECT_MESSAGE,
	ERROR_NO_ROUTE,
	ERROR_NONE_RPC,
	ERROR_TIMEOUT,
	ERROR_TYPE,
	EXCHANGE_TYPE,
	REPLY_QUEUE,
	RMQ_ROUTES_META,
} from './constants';
import { EventEmitter } from 'events';
import { Channel, Message } from 'amqplib';
import { Signale } from 'signale';
import * as amqp from 'amqp-connection-manager';
// tslint:disable-next-line:no-duplicate-imports
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { IRMQConnection, IRMQServiceOptions } from './interfaces/rmq-options.interface';
import { requestEmitter, responseEmitter, ResponseEmmiterResult } from './emmiters/router.emmiter';
import 'reflect-metadata';
import { IQueueMeta } from './interfaces/queue-meta.interface';
import { RMQError } from './classes/rmq-error.class';
import { RMQErrorHandler } from './classes/rmq-error-handler.class';
import { hostname } from 'os';

@Injectable()
export class RMQService {
	private server: AmqpConnectionManager = null;
	private channel: ChannelWrapper = null;
	private options: IRMQServiceOptions;
	private sendResponseEmitter: EventEmitter = new EventEmitter();
	private replyQueue: string = REPLY_QUEUE;
	private queueMeta: IQueueMeta[];
	private logger: LoggerService;

	constructor(options: IRMQServiceOptions) {
		this.options = options;
		this.logger = options.logger ? options.logger : new Signale({
			config: {
				displayTimestamp: true,
				displayDate: true,
			},
			logLevel: this.options.logMessages ? 'info' : 'error',
			types: CUSTOM_LOGS,
		});
		this.init();
	}

	public async init(): Promise<void> {
		this.logger.log(CONNECTING_MESSAGE);
		const connectionURLs: string[] = this.options.connections.map((connection: IRMQConnection) => {
			return `amqp://${connection.login}:${connection.password}@${connection.host}`;
		});
		const connectionOptions = {
			reconnectTimeInSeconds: this.options.reconnectTimeInSeconds ?? DEFAULT_RECONNECT_TIME
		};
		this.server = amqp.connect(connectionURLs, connectionOptions);
		this.channel = this.server.createChannel({
			json: false,
			setup: async (channel: Channel) => {
				await channel.assertExchange(this.options.exchangeName, EXCHANGE_TYPE, {
					durable: this.options.isExchangeDurable ?? true,
				});
				await channel.prefetch(
					this.options.prefetchCount ?? DEFAULT_PREFETCH_COUNT,
					this.options.isGlobalPrefetchCount ?? false
				);
				await channel.consume(
					this.replyQueue,
					(msg: Message) => {
						this.sendResponseEmitter.emit(msg.properties.correlationId, msg);
					},
					{ noAck: true }
				);
				this.waitForReply();
				if (this.options.queueName) {
					this.listen(channel);
				}
				this.logger.log(CONNECTED_MESSAGE);
			},
		});

		this.server.on(DISCONNECT_EVENT, err => {
			this.logger.error(DISCONNECT_MESSAGE);
			this.logger.error(err.err);
		});
	}

	public async send<IMessage, IReply>(topic: string, message: IMessage): Promise<IReply> {
		return new Promise<IReply>(async (resolve, reject) => {
			const correlationId = this.getUniqId();
			const timeout = this.options.messagesTimeout ?? DEFAULT_TIMEOUT;
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
					this.logger.debug(`[${topic}] ${content.toString()}`);
					resolve(JSON.parse(content.toString()));
				} else {
					reject(new RMQError(ERROR_NONE_RPC, ERROR_TYPE.TRANSPORT));
				}
			});
			await this.channel.publish(this.options.exchangeName, topic, Buffer.from(JSON.stringify(message)), {
				replyTo: this.replyQueue,
				correlationId,
			});
			this.logger.debug(`[${topic}] ${JSON.stringify(message)}`);
		});
	}

	public async notify<IMessage>(topic: string, message: IMessage): Promise<void> {
		await this.channel.publish(this.options.exchangeName, topic, Buffer.from(JSON.stringify(message)));
		this.logger.debug(`[${topic}] ${JSON.stringify(message)}`);
	}

	public async disconnect() {
		responseEmitter.removeAllListeners();
		requestEmitter.removeAllListeners();
		this.sendResponseEmitter.removeAllListeners();
		await this.channel.close();
		await this.server.close();
	}

	private async listen(channel: Channel) {
		await channel.assertQueue(this.options.queueName, {
			durable: this.options.isQueueDurable ?? true,
			arguments: this.options.queueArguments ?? {},
		});
		this.queueMeta = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
		this.queueMeta = this.queueMeta ?? [];
		if (this.queueMeta.length > 0) {
			this.queueMeta.map(async meta => {
				await channel.bindQueue(this.options.queueName, this.options.exchangeName, meta.topic);
			});
		}
		await channel.consume(
			this.options.queueName,
			async (msg: Message) => {
				this.logger.log(`[${msg.fields.routingKey}] ${msg.content}`);
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

	private async waitForReply(): Promise<void> {
		responseEmitter.on(ResponseEmmiterResult.success, async (msg, result) => {
			this.reply(result, msg);
		});
		responseEmitter.on(ResponseEmmiterResult.error, async (msg, err) => {
			this.reply('', msg, err);
		});
		responseEmitter.on(ResponseEmmiterResult.ack, async (msg) => {
			this.channel.ack(msg);
		});
	}

	private async reply(res: any, msg: Message, error: Error | RMQError = null) {
		this.channel.ack(msg);
		res = await this.intercept(res, msg, error);
		await this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(res)), {
			correlationId: msg.properties.correlationId,
			headers: {
				...this.buildError(error),
			},
		});
		this.logger.debug(`[${msg.fields.routingKey}] ${JSON.stringify(res)}`);
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
		return !!this.queueMeta.find(x => x.topic === topic);
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
