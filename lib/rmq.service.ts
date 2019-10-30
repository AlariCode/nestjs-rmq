import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleState, moduleStateEmmiter } from './emmiters/module-state.emmiter';
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
import { IRMQRouter } from './interfaces/rmq-router.interface';
import { responseEmitter, requestEmitter, ResponseEmmiterResult } from './emmiters/router.emmiter';
// tslint:disable-next-line: no-duplicate-imports
import * as amqp from 'amqp-connection-manager';
import 'reflect-metadata';
import { IQueueMeta } from './interfaces/queue-meta.interface';

@Injectable()
export class RMQService implements OnModuleInit {
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

	onModuleInit() {
		return RMQService;
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
					await channel.assertQueue(this.options.queueName, {
						durable: this.options.isQueueDurable ? this.options.isQueueDurable : true,
						arguments: this.options.queueArguments ? this.options.queueArguments : {},
					});
					channel.consume(
						this.options.queueName,
						(msg: Message) => {
							if (this.isTopicExists(msg.fields.routingKey)) {
								requestEmitter.emit(msg.fields.routingKey, msg);
							} else {
								this.replyInvalidRoute(msg);
							}
						},
						{ noAck: true },
					);
					this.topics = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
					this.topics = this.topics ? this.topics : [];
					if (this.topics.length > 0) {
						this.topics.map(async topic => {
							await channel.bindQueue(this.options.queueName, this.options.exchangeName, topic.topic);
						});
					}
				}
				await channel.prefetch(
					this.options.prefetchCount ? this.options.prefetchCount : 0,
					this.options.isGlobalPrefetchCount ? this.options.isGlobalPrefetchCount : false,
				);
				channel.consume(
					this.replyQueue,
					(msg: Message) => {
						this.sendResponseEmitter.emit(msg.properties.correlationId, msg);
					},
					{ noAck: true },
				);
				moduleStateEmmiter.emit(ModuleState.ready);
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
			const correlationId = this.generateGuid();
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

	private async listenReply(): Promise<void> {
		responseEmitter.on(ResponseEmmiterResult.success, (msg, result) => {
			this.logger.recieved(`[${msg.fields.routingKey}] ${msg.content}`);
			this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(result)), {
				correlationId: msg.properties.correlationId,
			});
			this.logger.sent(`[${msg.fields.routingKey}] ${JSON.stringify(result)}`);
		});
		responseEmitter.on(ResponseEmmiterResult.error, (msg, err) => {
			this.logger.recieved(`[${msg.fields.routingKey}] ${msg.content}`);
			this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(''), {
				correlationId: msg.properties.correlationId,
				headers: {
					'-x-error': err.message,
				},
			});
			this.logger.error(`[${msg.fields.routingKey}] ${JSON.stringify(err.message)}`);
		});
	}

	private replyInvalidRoute(msg: Message) {
		if (msg.properties.replyTo) {
			this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify({ error: ERROR_NO_ROUTE })), {
				correlationId: msg.properties.correlationId,
			});
			this.logger.sent(`[${msg.fields.routingKey}] ${JSON.stringify({ error: ERROR_NO_ROUTE })}`);
		}
	}

	private generateGuid(): string {
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
}
