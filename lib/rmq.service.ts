import { Inject, Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
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
	DEFAULT_HEARTBEAT_TIME,
	RMQ_MODULE_OPTIONS,
	INITIALIZATION_STEP_DELAY,
	ERROR_NO_QUEUE,
	RMQ_PROTOCOL,
	CONNECT_FAILED_MESSAGE,
	WRONG_CREDENTIALS_MESSAGE,
	CONNECT_FAILED,
} from './constants';
import { EventEmitter } from 'events';
import { Channel, Message } from 'amqplib';
import * as amqp from 'amqp-connection-manager';
// tslint:disable-next-line:no-duplicate-imports
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { IRMQConnection, IRMQServiceOptions } from './interfaces/rmq-options.interface';
import { requestEmitter, responseEmitter, ResponseEmitterResult } from './emmiters/router.emmiter';
import { IPublishOptions } from './interfaces/rmq-publish-options.interface';
import { RMQError } from './classes/rmq-error.class';
import { RQMColorLogger } from './helpers/logger';
import { validateOptions } from './option.validator';
import { RMQMetadataAccessor } from './rmq-metadata.accessor';
import { RmqErrorService } from './rmq-error.service';
import { getUniqId } from './utils/get-uniq-id';
import { IRMQService } from './interfaces/rmq-service.interface';

@Injectable()
export class RMQService implements OnModuleInit, IRMQService {
	private server: AmqpConnectionManager = null;
	private clientChannel: ChannelWrapper = null;
	private subscriptionChannel: ChannelWrapper = null;
	private options: IRMQServiceOptions;
	private sendResponseEmitter: EventEmitter = new EventEmitter();
	private replyQueue: string = REPLY_QUEUE;
	private routes: string[];
	private logger: LoggerService;

	private isConnected = false;
	private isInitialized = false;

	constructor(
		@Inject(RMQ_MODULE_OPTIONS) options: IRMQServiceOptions,
		private readonly metadataAccessor: RMQMetadataAccessor,
		private readonly errorService: RmqErrorService
	) {
		this.options = options;
		this.logger = options.logger ? options.logger : new RQMColorLogger(this.options.logMessages);
		validateOptions(this.options, this.logger);
	}

	async onModuleInit() {
		await this.init();
		this.isInitialized = true;
	}

	public async init(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const connectionURLs: string[] = this.options.connections.map((connection: IRMQConnection) => {
				return this.createConnectionUri(connection);
			});
			const AMQPConnectionOptions: amqp.AmqpConnectionManagerOptions = {
				reconnectTimeInSeconds: this.options.reconnectTimeInSeconds ?? DEFAULT_RECONNECT_TIME,
				heartbeatIntervalInSeconds: this.options.heartbeatIntervalInSeconds ?? DEFAULT_HEARTBEAT_TIME,
				connectionOptions: this.options.connectionOptions ?? {},
			};
			this.server = amqp.connect(connectionURLs, AMQPConnectionOptions);

			this.server.on(CONNECT_EVENT, (connection) => {
				this.isConnected = true;
				this.attachEmitters();
			});
			this.server.on(DISCONNECT_EVENT, (err) => {
				this.isConnected = false;
				this.detachEmitters();
				this.logger.error(DISCONNECT_MESSAGE);
				this.logger.error(err.err);
			});
			this.server.on(CONNECT_FAILED, (err) => {
				this.logger.error(CONNECT_FAILED_MESSAGE);
				this.logger.error(err.err);
				if (err.err.message.includes('ACCESS-REFUSED') || err.err.message.includes('403')) {
					this.logger.error(WRONG_CREDENTIALS_MESSAGE);
					reject(err);
				}
			});

			await Promise.all([this.createClientChannel(), this.createSubscriptionChannel()]);
			resolve();
		});
	}

	public ack(...params: Parameters<Channel['ack']>): ReturnType<Channel['ack']> {
		return this.subscriptionChannel.ack(...params);
	}

	public nack(...params: Parameters<Channel['nack']>): ReturnType<Channel['nack']> {
		return this.subscriptionChannel.nack(...params);
	}

	public async send<IMessage, IReply>(topic: string, message: IMessage, options?: IPublishOptions): Promise<IReply> {
		return new Promise<IReply>(async (resolve, reject) => {
			await this.initializationCheck();
			const correlationId = getUniqId();
			const timeout = options?.timeout ?? this.options.messagesTimeout ?? DEFAULT_TIMEOUT;
			const timerId = setTimeout(() => {
				reject(new RMQError(`${ERROR_TIMEOUT}: ${timeout} while sending to ${topic}`, ERROR_TYPE.TRANSPORT));
			}, timeout);
			this.sendResponseEmitter.once(correlationId, (msg: Message) => {
				clearTimeout(timerId);
				if (msg.properties?.headers?.['-x-error']) {
					reject(this.errorService.errorHandler(msg));
				}
				const { content } = msg;
				if (content.toString()) {
					this.logger.debug(content, `Received ▼,${topic}`);
					resolve(JSON.parse(content.toString()));
				} else {
					reject(new RMQError(ERROR_NONE_RPC, ERROR_TYPE.TRANSPORT));
				}
			});
			await this.clientChannel.publish(this.options.exchangeName, topic, Buffer.from(JSON.stringify(message)), {
				replyTo: this.replyQueue,
				appId: this.options.serviceName,
				timestamp: new Date().getTime(),
				correlationId,
				...options,
			});
			this.logger.debug(message, `Sent ▲,${topic}`);
		});
	}

	public async notify<IMessage>(topic: string, message: IMessage, options?: IPublishOptions): Promise<void> {
		await this.initializationCheck();
		await this.clientChannel.publish(this.options.exchangeName, topic, Buffer.from(JSON.stringify(message)), {
			appId: this.options.serviceName,
			timestamp: new Date().getTime(),
			...options,
		});
		this.logger.debug(message, `Notify ▲,${topic}`);
	}

	public healthCheck() {
		return this.isConnected;
	}

	public async disconnect() {
		this.detachEmitters();
		this.sendResponseEmitter.removeAllListeners();
		await this.clientChannel.close();
		await this.subscriptionChannel.close();
		await this.server.close();
	}

	private createConnectionUri(connection: IRMQConnection): string {
		let uri = `${connection.protocol ?? RMQ_PROTOCOL.AMQP}://${connection.login}:${connection.password}@${
			connection.host
		}`;
		if (connection.port) {
			uri += `:${connection.port}`;
		}
		if (connection.vhost) {
			uri += `/${connection.vhost}`;
		}
		return uri;
	}

	private async createSubscriptionChannel() {
		return new Promise<void>((resolve) => {
			this.subscriptionChannel = this.server.createChannel({
				json: false,
				setup: async (channel: Channel) => {
					await channel.assertExchange(
						this.options.exchangeName,
						this.options.assertExchangeType ? this.options.assertExchangeType : 'topic',
						{
							durable: this.options.isExchangeDurable ?? true,
							...this.options.exchangeOptions,
						}
					);
					await channel.prefetch(
						this.options.prefetchCount ?? DEFAULT_PREFETCH_COUNT,
						this.options.isGlobalPrefetchCount ?? false
					);
					if (typeof this.options.queueName === 'string') {
						this.listen(channel);
					}
					this.logConnected();
					resolve();
				},
			});
		});
	}

	private async createClientChannel() {
		return new Promise<void>((resolve) => {
			this.clientChannel = this.server.createChannel({
				json: false,
				setup: async (channel: Channel) => {
					await channel.consume(
						this.replyQueue,
						(msg: Message) => {
							this.sendResponseEmitter.emit(msg.properties.correlationId, msg);
						},
						{
							noAck: true,
						}
					);
					resolve();
				},
			});
		});
	}

	private async listen(channel: Channel) {
		const queue = await channel.assertQueue(this.options.queueName, {
			durable: this.options.isQueueDurable ?? true,
			arguments: this.options.queueArguments ?? {},
			...this.options.queueOptions,
		});
		this.options.queueName = queue.queue;
		this.routes = this.metadataAccessor.getAllRMQPaths();

		if (this.options.autoBindingRoutes ?? true) {
			await this.bindRMQRoutes(channel);
		}

		await channel.consume(
			this.options.queueName,
			async (msg: Message) => {
				this.logger.debug(msg.content, `Received ▼,${msg.fields.routingKey}`);
				const route = this.getRouteByTopic(msg.fields.routingKey);
				if (route) {
					msg = await this.useMiddleware(msg);
					requestEmitter.emit(route, msg);
				} else {
					this.reply('', msg, new RMQError(ERROR_NO_ROUTE, ERROR_TYPE.TRANSPORT));
					this.ack(msg);
				}
			},
			{ noAck: false }
		);
	}

	private async bindRMQRoutes(channel: Channel): Promise<void> {
		if (this.routes.length > 0) {
			this.routes.map(async (r) => {
				this.logger.log(`Mapped ${r}`, 'RMQRoute');
				await channel.bindQueue(this.options.queueName, this.options.exchangeName, r);
			});
		}
	}

	private detachEmitters(): void {
		responseEmitter.removeAllListeners();
	}

	private attachEmitters(): void {
		responseEmitter.on(ResponseEmitterResult.success, async (msg, result) => {
			this.reply(result, msg);
		});
		responseEmitter.on(ResponseEmitterResult.error, async (msg, err) => {
			this.reply('', msg, err);
		});
		responseEmitter.on(ResponseEmitterResult.ack, async (msg) => {
			this.ack(msg);
		});
	}

	private async reply(res: any, msg: Message, error: Error | RMQError = null) {
		try {
			res = await this.intercept(res, msg, error);
		} catch (e) {
			error = e
		}
		await this.subscriptionChannel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(res)), {
			correlationId: msg.properties.correlationId,
			headers: {
				...this.errorService.buildError(error),
			},
		});
		this.logger.debug(res, `Sent ▲,${msg.fields.routingKey}`);
	}

	private getRouteByTopic(topic: string): string {
		return this.routes.find((route) => {
			if (route === topic) {
				return true;
			}
			const regexString = '^' + route.replace(/\*/g, '([^.]+)').replace(/#/g, '([^.]+.?)+') + '$';
			return topic.search(regexString) !== -1;
		});
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

	private async initializationCheck() {
		if (this.isInitialized) {
			return;
		}
		await new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, INITIALIZATION_STEP_DELAY);
		});
		await this.initializationCheck();
	}

	private logConnected() {
		this.logger.log(CONNECTED_MESSAGE, 'RMQModule');
		if (!this.options.queueName && this.metadataAccessor.getAllRMQPaths().length > 0) {
			this.logger.warn(ERROR_NO_QUEUE, 'RMQModule');
		}
	}
}
