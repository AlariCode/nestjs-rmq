import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { RMQMetadataAccessor } from './rmq-metadata.accessor';
import { Message } from 'amqplib';
import { requestEmitter, responseEmitter, ResponseEmitterResult } from './emmiters/router.emmiter';
import { ERROR_TYPE, ERROR_UNDEFINED_FROM_RPC } from './constants';
import { ExtendedMessage } from './classes/rmq-extended-message.class';
import { RMQError } from './classes/rmq-error.class';
import { IRouteOptions } from './interfaces/queue-meta.interface';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class RMQExplorer implements OnModuleInit {
	constructor(
		private readonly discoveryService: DiscoveryService,
		private readonly metadataAccessor: RMQMetadataAccessor,
		private readonly metadataScanner: MetadataScanner
	) {}

	async onModuleInit() {
		this.explore();
	}

	explore() {
		const instanceWrappers: InstanceWrapper[] = [
			...this.discoveryService.getControllers(),
			...this.discoveryService.getProviders(),
		];

		instanceWrappers.forEach((wrapper: InstanceWrapper, i: number) => {
			const { instance } = wrapper;
			if (!instance || !Object.getPrototypeOf(instance)) {
				return;
			}

			if (instanceWrappers.findIndex((w) => w.instance === instance) !== i) {
				return;
			}

			this.metadataScanner.scanFromPrototype(instance, Object.getPrototypeOf(instance), (key: string) =>
				this.lookupRMQRoute(instance, key)
			);
		});
	}

	lookupRMQRoute(instance: Record<string, Function>, key: string) {
		const methodRef = instance[key];
		const options = this.metadataAccessor.getRMQOptions(methodRef);
		const path = this.metadataAccessor.getRMQPath(methodRef);
		if (!path || !options) {
			return;
		}
		this.metadataAccessor.addRMQPath(path);
		this.attachEmitter(path, options, instance, methodRef);
	}

	private attachEmitter(
		path: string,
		options: IRouteOptions,
		instance: Record<string, Function>,
		methodRef: Function
	) {
		requestEmitter.on(path, async (msg: Message) => {
			const messageParams: number[] = this.metadataAccessor.getRMQMessageIndexes(
				Object.getPrototypeOf(instance),
				methodRef.name
			);
			try {
				let funcArgs = options?.msgFactory ? options.msgFactory(msg) : RMQMessageFactory(msg);
				if (messageParams.length > 0) {
					for (const param of messageParams) {
						funcArgs[param] = new ExtendedMessage(msg);
					}
				}
				funcArgs = this.transformRequest(instance, methodRef, funcArgs);
				const error = await this.validateRequest(instance, methodRef, funcArgs);
				if (error) {
					responseEmitter.emit(ResponseEmitterResult.error, msg, new RMQError(error, ERROR_TYPE.RMQ));
					responseEmitter.emit(ResponseEmitterResult.ack, msg);
					return;
				}
				const result = await methodRef.apply(instance, funcArgs);
				if (msg.properties.replyTo && result !== undefined) {
					responseEmitter.emit(ResponseEmitterResult.success, msg, result);
				} else if (msg.properties.replyTo && result === undefined) {
					responseEmitter.emit(
						ResponseEmitterResult.error,
						msg,
						new RMQError(ERROR_UNDEFINED_FROM_RPC, ERROR_TYPE.RMQ)
					);
				}
			} catch (err) {
				if (msg.properties.replyTo) {
					responseEmitter.emit(ResponseEmitterResult.error, msg, err);
				}
			}
			if (!options?.manualAck) {
				responseEmitter.emit(ResponseEmitterResult.ack, msg);
			}
		});
	}

	private transformRequest(instance: Record<string, Function>, methodRef: Function, funcArgs: any[]): any[] {
		const transformMsg = this.metadataAccessor.getRMQTransformation(methodRef);
		if (!transformMsg) {
			return funcArgs;
		}
		const types = Reflect.getMetadata('design:paramtypes', Object.getPrototypeOf(instance), methodRef.name);
		funcArgs[0] = plainToClass(types[0], funcArgs[0]);
		return funcArgs;
	}

	private async validateRequest(
		instance: Record<string, Function>,
		methodRef: Function,
		funcArgs: any[]
	): Promise<string | undefined> {
		const validateMsg = this.metadataAccessor.getRMQValidation(methodRef);
		if (!validateMsg) {
			return;
		}
		const types = Reflect.getMetadata('design:paramtypes', Object.getPrototypeOf(instance), methodRef.name);
		const classData = funcArgs[0];
		const test = Object.assign(new types[0](), classData);
		const errors = await validate(test);
		if (errors.length) {
			const message = errors
				.map((m) => {
					return Object.values(m.constraints).join('; ');
				})
				.join('; ');
			return message;
		}
	}
}

export const RMQMessageFactory = (msg: Message) => {
	return [JSON.parse(msg.content.toString())];
};
