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
		instanceWrappers.forEach((wrapper: InstanceWrapper) => {
			const { instance } = wrapper;
			if (!instance || !Object.getPrototypeOf(instance)) {
				return;
			}
			this.metadataScanner.scanFromPrototype(
				instance,
				Object.getPrototypeOf(instance),
				(key: string) => this.lookupRMQRoute(instance, key),
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

	private attachEmitter(path: string, options: IRouteOptions, instance: Record<string, Function>, methodRef: Function) {
		requestEmitter.on(path, async (msg: Message) => {
			const messageParams: number[] =
				this.metadataAccessor.getRMQMessageIndexes(Object.getPrototypeOf(instance), methodRef.name);
			try {
				const funcArgs = options?.msgFactory
					? options.msgFactory(msg)
					: RMQMessageFactory(msg);
				if (messageParams.length > 0) {
					for (const param of messageParams) {
						funcArgs[param] = new ExtendedMessage(msg);
					}
				}
				const result = await methodRef.apply(instance, funcArgs);

				if (msg.properties.replyTo && result) {
					responseEmitter.emit(ResponseEmitterResult.success, msg, result);
				} else if (msg.properties.replyTo && result === undefined) {
					responseEmitter.emit(
						ResponseEmitterResult.error,
						msg,
						new RMQError(ERROR_UNDEFINED_FROM_RPC, ERROR_TYPE.RMQ),
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
}

export const RMQMessageFactory = (msg: Message) => {
	return [JSON.parse(msg.content.toString())];
};