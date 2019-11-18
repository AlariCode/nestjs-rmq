import { RMQ_ROUTES_META } from '../constants';
import { IQueueMeta } from '../interfaces/queue-meta.interface';
import { requestEmitter, responseEmitter, ResponseEmmiterResult } from '../emmiters/router.emmiter';
import { RMQService } from '../rmq.service';
import { Message } from 'amqplib';

export function RMQController(): ClassDecorator {
	return function(target: any) {
		let topics: IQueueMeta[] = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
		topics = topics.filter(topic => topic.target === target.prototype);
		target = class extends (target as { new (...args): any }) {
			constructor(...args: any) {
				super(...args);
				topics.forEach(async topic => {
					requestEmitter.on(topic.topic, async (msg: Message) => {
						try {
							const result = await this[topic.methodName](JSON.parse(msg.content.toString()));
							if (msg.properties.replyTo) {
								responseEmitter.emit(ResponseEmmiterResult.success, msg, result);
							}
						} catch (err) {
							if (msg.properties.replyTo) {
								responseEmitter.emit(ResponseEmmiterResult.error, msg, err);
							}
						}
					});
				});
			}
		};
		return target;
	};
}
