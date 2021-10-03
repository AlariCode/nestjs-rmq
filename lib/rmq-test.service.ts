import { Inject, Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { Channel, Message } from 'amqplib';
import { IPublishOptions, IRMQServiceOptions, RMQError } from '.';
import { CONNECTED_MESSAGE, DEFAULT_SERVICE_NAME, ERROR_NO_ROUTE, ERROR_TYPE, RMQ_MODULE_OPTIONS } from './constants';
import { RQMColorLogger } from './helpers/logger';
import { IRMQService } from './interfaces/rmq-service.interface';
import { RMQMetadataAccessor } from './rmq-metadata.accessor';
import { requestEmitter, responseEmitter, ResponseEmitterResult } from './emmiters/router.emmiter';
import { validateOptions } from './option.validator';
import { getUniqId } from './utils/get-uniq-id';
import { IRMQMessage } from './interfaces/rmq-message.interface';
import { getRouteKey } from './utils/get-route-key';

@Injectable()
export class RMQTestService implements OnModuleInit, IRMQService {
	private options: IRMQServiceOptions;
	private routeKeys: string[];
	private logger: LoggerService;
	private replyStack = new Map<string, { resolve: Function, reject: Function }>();
	private mockStack = new Map<string, any>();
	private mockErrorStack = new Map<string, any>();
	private isInitialized = false;
	public readonly name: string;

	constructor(
		@Inject(RMQ_MODULE_OPTIONS) options: IRMQServiceOptions,
		private readonly metadataAccessor: RMQMetadataAccessor
	) {
		this.options = options;
		this.name = options.name ?? DEFAULT_SERVICE_NAME;
		this.logger = options.logger ? options.logger : new RQMColorLogger(this.options.logMessages, this.name);
		validateOptions(this.options, this.logger);
	}

	async onModuleInit() {
		if (this.isInitialized) {
			return;
		}

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
			let msg: IRMQMessage = {
				serviceName: this.name,
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
			};

			const route = this.getRouteKeyByTopic(path);
			if (route) {
				msg = await this.useMiddleware(msg);
				this.replyStack.set(correlationId, { resolve, reject });
				requestEmitter.emit(route, msg);
			} else {
				throw new RMQError(ERROR_NO_ROUTE, ERROR_TYPE.TRANSPORT);
			}
		});
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
		this.detachEmitters();
	}

	private detachEmitters(): void {
		responseEmitter.removeListener(getRouteKey(ResponseEmitterResult.success, this.name), this.onSuccessResponse);
		responseEmitter.removeListener(getRouteKey(ResponseEmitterResult.error, this.name), this.onErrorResponse);
		responseEmitter.removeListener(getRouteKey(ResponseEmitterResult.ack, this.name), this.onAcknowledgeResponse);
	}

	private attachEmitters(): void {
		this.detachEmitters();
		responseEmitter.on(getRouteKey(ResponseEmitterResult.success, this.name), this.onSuccessResponse);
		responseEmitter.on(getRouteKey(ResponseEmitterResult.error, this.name), this.onErrorResponse);
		responseEmitter.on(getRouteKey(ResponseEmitterResult.ack, this.name), this.onAcknowledgeResponse);
	}

	private onSuccessResponse = async (msg: Message, result: any): Promise<void> => {
		const { resolve } = this.replyStack.get(msg.properties.correlationId);
		result = await this.intercept(result, msg);
		resolve(result);
	}

	private onErrorResponse = async (msg: Message, err: Error | RMQError): Promise<void> => {
		const { reject } = this.replyStack.get(msg.properties.correlationId);
		await this.intercept('', msg, err);
		reject(err);
	}

	private onAcknowledgeResponse = (msg: Message): void => {
		this.ack(msg);
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
		this.routeKeys = this.metadataAccessor.getAllRMQRouteKeys(this.name);
		if (this.routeKeys.length > 0) {
			this.routeKeys.map(async (r) => {
				this.logger.log(`Mapped ${r}`, 'RMQRoute');
			});
		}
	}

	private async useMiddleware(msg: IRMQMessage) {
		if (!this.options.middleware || this.options.middleware.length === 0) {
			return msg;
		}
		for (const middleware of this.options.middleware) {
			// to be backward compatible
			msg = (await new middleware(this.logger).transform(msg)) as IRMQMessage;
			msg.serviceName = this.name;
		}
		return msg;
	}

	private getRouteKeyByTopic(topic: string): string {
		const routeKey = getRouteKey(topic, this.name);

		return this.routeKeys.find((route) => {
			if (route === routeKey) {
				return true;
			}
			const regexString = '^' + route.replace(/\*/g, '([^.]+)').replace(/#/g, '([^.]+\.?)+') + '$';
			return routeKey.search(regexString) !== -1;
		});
	}

	private logConnected() {
		this.logger.log(CONNECTED_MESSAGE, 'RMQModule');
	}

}