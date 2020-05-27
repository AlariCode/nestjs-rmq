import { Message } from 'amqplib';
import { IQueueMeta } from './queue-meta.interface';

export interface IRMQControllerOptions {
	msgFactory?: (msg: Message, topic: IQueueMeta) => any[];
}