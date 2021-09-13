import { Inject, Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { Channel, Message } from 'amqplib';
import { IPublishOptions, IRMQServiceOptions, RMQError } from '.';
import { CONNECTED_MESSAGE, ERROR_NO_ROUTE, ERROR_TYPE, RMQ_MODULE_OPTIONS } from './constants';
import { RQMColorLogger } from './helpers/logger';
import { IRMQService } from './interfaces/rmq-service.interface';
import { RMQMetadataAccessor } from './rmq-metadata.accessor';
import { requestEmitter, responseEmitter, ResponseEmitterResult } from './emmiters/router.emmiter';
import { validateOptions } from './option.validator';
import { getUniqId } from './utils/get-uniq-id';

@Injectable()
export class RMQTestService implements OnModuleInit, IRMQService {
	private options: IRMQServiceOptions;
	private routes: string[];
	private logger: LoggerService;
	private isInitialized: boolean = false;
	private replyStack = new Map<string, { resolve: Function, reject: Function }>();
	private mockStack = new Map<string, any>();
	private mockErrorStack = new Map<string, any>();

	constructor(@Inject(RMQ_MODULE_OPTIONS) options: IRMQServiceOptions, private readonly metadataAccessor: RMQMetadataAccessor) {
		this.options = options;
		this.logger = options.logger ? options.logger : new RQMColorLogger(this.options.logMessages);
		validateOptions(this.options, this.logger);
	}

	async onModuleInit() {
		await this.init();
		this.isInitialized = true;
	}

	public mockReply<T>(topic: string, reply: T) {
		this.mockStack.set(topic, reply);
	}

	public mockError<T>(topic: string, error: T) {
		this.mockErrorStack.set(topic, error);
	}

	public async triggerRoute<T, R>(path: string, data: T): Promise<R> {
		return new Promise(async (resolve, reject) => {
			const correlationId = getUniqId();
			let msg: Message = {
				content: Buffer.from(JSON.stringify(data)),
				fields: {
					deliveryTag: 1,
					redelivered: false,
					exchange: 'mock',
					routingKey: path,
				},
				properties: {
					messageId: 1,
					timestamp: new Date(),
					appId: this.options.serviceName,
					clusterId: 1,
					userId: 1,
					type: '',
					contentType: JSON,
					contentEncoding: undefined,
					headers: [],
					deliveryMode: '',
					priority: 0,
					correlationId,
					expiration: 0,
					replyTo: 'mock'
				}
			}
			const route = this.getRouteByTopic(path);
			if (route) {
				msg = await this.useMiddleware(msg);
				this.replyStack.set(correlationId, { resolve, reject });
				requestEmitter.emit(route, msg);
			} else {
				throw new RMQError(ERROR_NO_ROUTE, ERROR_TYPE.TRANSPORT);
			}
		})
	}

	public async init(): Promise<void> {
		this.bindRMQRoutes();
		this.logConnected();
		this.attachEmitters();
	}

	public ack(...params: Parameters<Channel['ack']>): ReturnType<Channel['ack']> {
	}

	public nack(...params: Parameters<Channel['nack']>): ReturnType<Channel['nack']> {
	}

	public async send<IMessage, IReply>(topic: string, message: IMessage, options?: IPublishOptions): Promise<IReply> {
		const error = this.mockErrorStack.get(topic);
		if (error) {
			throw error;
		}
		return this.mockStack.get(topic) as IReply;
	}

	public async notify<IMessage>(topic: string, message: IMessage, options?: IPublishOptions): Promise<void> {

	}

	public healthCheck() {
		return true;
	}

	public async disconnect() {
		responseEmitter.removeAllListeners();
	}

	private attachEmitters(): void {
		responseEmitter.on(ResponseEmitterResult.success, async (msg: Message, result) => {
			const { resolve } = this.replyStack.get(msg.properties.correlationId);
			result = await this.intercept(result, msg);
			resolve(result);
		});
		responseEmitter.on(ResponseEmitterResult.error, async (msg: Message, err) => {
			const { reject } = this.replyStack.get(msg.properties.correlationId);
			await this.intercept('', msg, err);
			reject(err);
		});
		responseEmitter.on(ResponseEmitterResult.ack, async (msg: Message) => {
			this.ack(msg);
		});
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

	private async bindRMQRoutes(): Promise<void> {
		this.routes = this.metadataAccessor.getAllRMQPaths();
		if (this.routes.length > 0) {
			this.routes.map(async (r) => {
				this.logger.log(`Mapped ${r}`, 'RMQRoute');
			});
		}
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

	private getRouteByTopic(topic: string): string {
		return this.routes.find((route) => {
			if (route === topic) {
				return true;
			}
			const regexString = '^' + route.replace(/\*/g, '([^.]+)').replace(/#/g, '([^.]+\.?)+') + '$';
			return topic.search(regexString) !== -1;
		});
	}

	private logConnected() {
		this.logger.log(CONNECTED_MESSAGE, 'RMQModule');
	}

}