import { Logger } from '@nestjs/common';

import {
	ERROR_NO_ROUTE_FOR_CONTROLLER,
	ERROR_TYPE,
	ERROR_UNDEFINED_FROM_RPC,
	RMQ_MESSAGE_META,
	RMQ_ROUTES_META,
} from '../constants';
import { IRouteMeta } from '../interfaces/queue-meta.interface';
import { requestEmitter, responseEmitter, ResponseEmitterResult } from '../emmiters/router.emmiter';
import { RMQService } from '../rmq.service';
import { Message } from 'amqplib';
import { RMQError } from '..';
import { IRMQControllerOptions } from '../interfaces/rmq-controller-options.interface';
import { ExtendedMessage } from '../classes/rmq-extended-message.class';

export const RMQMessageFactory = (msg: Message, route: IRouteMeta) => {
	return [JSON.parse(msg.content.toString())];
};

export function RMQController(options?: IRMQControllerOptions): ClassDecorator {
	return function (target: any) {
		let routes: IRouteMeta[] = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
		routes = routes ? routes.filter((route) => route.target === target.prototype) : [];
		if (routes.length === 0) {
			Logger.error(`${ERROR_NO_ROUTE_FOR_CONTROLLER} ${target.prototype.constructor.name}`);
		}
		target = class extends (target as { new (...args): any }) {
			constructor(...args: any) {
				super(...args);
				routes.forEach(async (route) => {
					const messageParams: number[] =
						Reflect.getOwnMetadata(RMQ_MESSAGE_META, route.target, route.methodName) || [];
					requestEmitter.on(route.topic, async (msg: Message) => {
						try {
							const funcArgs = options?.msgFactory
								? options.msgFactory(msg, route)
								: RMQMessageFactory(msg, route);
							if (messageParams.length > 0) {
								for (const param of messageParams) {
									funcArgs[param] = new ExtendedMessage(msg);
								}
							}
							const result = await this[route.methodName].apply(this, funcArgs);
							if (msg.properties.replyTo && result) {
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
						if (!route.options?.manualAck) {
							responseEmitter.emit(ResponseEmitterResult.ack, msg);
						}
					});
				});
			}
		};
		return target;
	};
}
