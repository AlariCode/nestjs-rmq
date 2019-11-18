import { Injectable } from '@nestjs/common';
import {
	DISCONNECT_EVENT,
	DISCONNECT_MESSAGE,
	REPLY_QUEUE,
	CONNECTING_MESSAGE,
	CONNECTED_MESSAGE,
	EXCHANGE_TYPE,
	DEFAULT_RECONNECT_TIME,
	ERROR_NONE_RPC,
	ERROR_NO_ROUTE,
	ERROR_TIMEOUT,
	DEFAULT_TIMEOUT,
	CUSTOM_LOGS,
	RMQ_ROUTES_META,
} from './constants';
import { EventEmitter } from 'events';
import { Message, Channel } from 'amqplib';
import { Signale } from 'signale';
import { ChannelWrapper, AmqpConnectionManager } from 'amqp-connection-manager';
import { IRMQServiceOptions, IRMQConnection } from './interfaces/rmq-options.interface';
import { responseEmitter, requestEmitter, ResponseEmmiterResult } from './emmiters/router.emmiter';
// tslint:disable-next-line: no-duplicate-imports
import * as amqp from 'amqp-connection-manager';
import 'reflect-metadata';
import { IQueueMeta } from './interfaces/queue-meta.interface';

@Injectable()
export class RMQService {
	private server: AmqpConnectionManager = null;
	private channel: ChannelWrapper = null;
	private options: IRMQServiceOptions;
	private sendResponseEmitter: EventEmitter = new EventEmitter();
	private replyQueue: string = REPLY_QUEUE;
	private topics: IQueueMeta[];
	private logger: any;

	constructor(options: IRMQServiceOptions) {
		this.options = options;
		this.logger = new Signale({
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
		this.logger.watch(CONNECTING_MESSAGE);
		const connectionURLs: string[] = this.options.connections.map((connection: IRMQConnection) => {
			return `amqp://${connection.login}:${connection.password}@${connection.host}`;
		});
		const connectionOptins = {
			reconnectTimeInSeconds: this.options.reconnectTimeInSeconds
				? this.options.reconnectTimeInSeconds
				: DEFAULT_RECONNECT_TIME,
		};
		this.server = amqp.connect(connectionURLs, connectionOptins);
		this.channel = this.server.createChannel({
			json: false,
			setup: async (channel: Channel) => {
				await channel.assertExchange(this.options.exchangeName, EXCHANGE_TYPE, {
					durable: this.options.isExchangeDurable ? this.options.isExchangeDurable : true,
				});
				if (this.options.queueName) {
					this.listen(channel);
				}
				await channel.prefetch(
					this.options.prefetchCount ? this.options.prefetchCount : 0,
					this.options.isGlobalPrefetchCount ? this.options.isGlobalPrefetchCount : false
				);
				channel.consume(
					this.replyQueue,
					(msg: Message) => {
						this.sendResponseEmitter.emit(msg.properties.correlationId, msg);
					},
					{ noAck: true }
				);
				this.listenReply();
				this.logger.success(CONNECTED_MESSAGE);
			},
		});

		this.server.on(DISCONNECT_EVENT, err => {
			this.logger.error(DISCONNECT_MESSAGE);
			this.logger.error(err.err);
		});
	}

	public async send<IMessage, IReply>(topic: string, message: IMessage): Promise<IReply> {
		return new Promise<IReply>(async (resolve, reject) => {
			if (!this.server || !this.server.isConnected()) {
				await this.init();
			}
			const correlationId = this.getUniqId();
			const timeout = this.options.messagesTimeout ? this.options.messagesTimeout : DEFAULT_TIMEOUT;
			const timerId = setTimeout(() => {
				reject(new Error(`${ERROR_TIMEOUT}: ${timeout}`));
			}, timeout);
			this.sendResponseEmitter.once(correlationId, (msg: Message) => {
				clearTimeout(timerId);
				const { content } = msg;
				if (msg.properties.headers['-x-error']) {
					reject(new Error(msg.properties.headers['-x-error']));
				}
				if (content.toString()) {
					this.logger.recieved(`[${topic}] ${content.toString()}`);
					resolve(JSON.parse(content.toString()));
				} else {
					reject(new Error(ERROR_NONE_RPC));
				}
			});
			this.channel.publish(this.options.exchangeName, topic, Buffer.from(JSON.stringify(message)), {
				replyTo: this.replyQueue,
				correlationId,
			});
			this.logger.sent(`[${topic}] ${JSON.stringify(message)}`);
		});
	}

	public async notify<IMessage>(topic: string, message: IMessage): Promise<void> {
		if (!this.server || !this.server.isConnected()) {
			await this.init();
		}
		await this.channel.publish(this.options.exchangeName, topic, Buffer.from(JSON.stringify(message)));
		this.logger.sent(`[${topic}] ${JSON.stringify(message)}`);
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
			durable: this.options.isQueueDurable ? this.options.isQueueDurable : true,
			arguments: this.options.queueArguments ? this.options.queueArguments : {},
		});
		channel.consume(
			this.options.queueName,
			async (msg: Message) => {
				if (this.isTopicExists(msg.fields.routingKey)) {
					msg = await this.useMiddleware(msg);
					requestEmitter.emit(msg.fields.routingKey, msg);
				} else {
					this.reply('', msg, new Error(ERROR_NO_ROUTE));
				}
			},
			{ noAck: true }
		);
		this.topics = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
		this.topics = this.topics ? this.topics : [];
		if (this.topics.length > 0) {
			this.topics.map(async topic => {
				await channel.bindQueue(this.options.queueName, this.options.exchangeName, topic.topic);
			});
		}
	}

	private async listenReply(): Promise<void> {
		responseEmitter.on(ResponseEmmiterResult.success, async (msg, result) => {
			this.reply(result, msg);
		});
		responseEmitter.on(ResponseEmmiterResult.error, async (msg, err) => {
			this.reply('', msg, err);
		});
	}

	private async reply(res: any, msg: Message, error: Error = null) {
		this.logger.recieved(`[${msg.fields.routingKey}] ${msg.content}`);
		res = await this.intercept(res, msg, error);
		this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(res)), {
			correlationId: msg.properties.correlationId,
			headers: error
				? {
						'-x-error': error.message,
				  }
				: null,
		});
		this.logger.sent(`[${msg.fields.routingKey}] ${JSON.stringify(res)}`);
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
		if (this.topics.find(x => x.topic === topic)) {
			return true;
		}
		return false;
	}

	private async useMiddleware(msg: Message) {
		if (!this.options.middleware || this.options.middleware.length === 0) {
			return msg;
		}
		for (const middleware of this.options.middleware) {
			msg = await new middleware().transform(msg);
		}
		return msg;
	}

	private async intercept(res: any, msg: Message, error?: Error) {
		if (!this.options.intercepters || this.options.intercepters.length === 0) {
			return res;
		}
		for (const intercepter of this.options.intercepters) {
			res = await new intercepter().intercept(res, msg, error);
		}
		return res;
	}
}
