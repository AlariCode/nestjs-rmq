import { RMQ_ROUTES_META } from '../constants';
import { moduleStateEmmiter, ModuleState } from '../emmiters/module-state.emmiter';
import { IQueueMeta } from '../interfaces/queue-meta.interface';
import { requestEmitter, responseEmitter, ResponseEmmiterResult } from '../emmiters/router.emmiter';
import { RMQService } from '../rmq.service';

export function RQMController(): ClassDecorator {
	return function(target: any) {
		let topics: IQueueMeta[] = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
		topics = topics.filter(topic => topic.target === target.prototype);
		target = class extends (target as { new (...args): any }) {
			constructor(...args) {
				super(...args);
				moduleStateEmmiter.on(ModuleState.ready, async () => {
					topics.forEach(async topic => {
						requestEmitter.on(topic.topic, async msg => {
							const { content } = msg;
							try {
								const result = await this[topic.methodName](JSON.parse(content.toString()));
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
				});
			}
		};
		return target;
	};
}
