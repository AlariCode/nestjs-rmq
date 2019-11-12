import { RMQ_ROUTES_META, RMQ_PIPE_META } from '../constants';
import { IQueueMeta } from '../interfaces/queue-meta.interface';
import { requestEmitter, responseEmitter, ResponseEmmiterResult } from '../emmiters/router.emmiter';
import { RMQService } from '../rmq.service';
import { IPipeMeta } from '../interfaces/pipe-meta.interface';
import { Message } from 'amqplib';

export function RQMController(): ClassDecorator {
	return function(target: any) {
		let topics: IQueueMeta[] = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
		const pipes: IPipeMeta[] = Reflect.getMetadata(RMQ_PIPE_META, target.prototype);
		topics = topics.filter(topic => topic.target === target.prototype);
		target = class extends (target as { new (...args): any }) {
			constructor(...args: any) {
				super(...args);
				topics.forEach(async topic => {
					requestEmitter.on(topic.topic, async (msg: Message) => {
						msg = await pipeTransform(pipes, msg, topic);
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

async function pipeTransform(pipes: IPipeMeta[], msg: Message, topic: IQueueMeta): Promise<Message> {
	if (!pipes) {
		return msg;
	}
	const pipe = pipes.find(mw => mw.methodName === topic.methodName);
	if (!pipe) {
		return msg;
	}
	return new pipe.pipe().transform(msg);
}
