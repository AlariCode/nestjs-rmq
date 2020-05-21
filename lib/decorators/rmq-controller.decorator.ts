import { Logger } from '@nestjs/common';

import { ERROR_NO_ROUTE_FOR_CONTROLLER, ERROR_TYPE, ERROR_UNDEFINED_FROM_RPC, RMQ_ROUTES_META } from '../constants';
import { IQueueMeta } from '../interfaces/queue-meta.interface';
import { requestEmitter, responseEmitter, ResponseEmmiterResult } from '../emmiters/router.emmiter';
import { RMQService } from '../rmq.service';
import { Message } from 'amqplib';
import { RMQError } from '..';
import { IRMQControllerOptions } from '../interfaces/rmq-controller-options.interface';

export const RMQMessageFactory = (msg: Message, topic: IQueueMeta) => {
	return [JSON.parse(msg.content.toString())];
};

export function RMQController(options?: IRMQControllerOptions): ClassDecorator {
	return function (target: any) {
		let topics: IQueueMeta[] = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
		topics = topics ? topics.filter((topic) => topic.target === target.prototype) : [];
		if (topics.length === 0) {
			Logger.error(`${ERROR_NO_ROUTE_FOR_CONTROLLER} ${target.prototype.constructor.name}`);
		}
		target = class extends (target as { new (...args): any }) {
			constructor(...args: any) {
				super(...args);
				topics.forEach(async (topic) => {
					requestEmitter.on(topic.topic, async (msg: Message) => {
						try {
							const result = await this[topic.methodName].apply(
								this,
								options?.msgFactory ? options.msgFactory(msg, topic) : RMQMessageFactory(msg, topic)
							);
							if (msg.properties.replyTo && result) {
								responseEmitter.emit(ResponseEmmiterResult.success, msg, result);
							} else if (msg.properties.replyTo && result === undefined) {
								responseEmitter.emit(
									ResponseEmmiterResult.error,
									msg,
									new RMQError(ERROR_UNDEFINED_FROM_RPC, ERROR_TYPE.RMQ)
								);
							} else {
								responseEmitter.emit(ResponseEmmiterResult.ack, msg);
							}
						} catch (err) {
							if (msg.properties.replyTo) {
								responseEmitter.emit(ResponseEmmiterResult.error, msg, err);
							} else {
								responseEmitter.emit(ResponseEmmiterResult.ack, msg);
							}
						}
					});
				});
			}
		};
		return target;
	};
}
