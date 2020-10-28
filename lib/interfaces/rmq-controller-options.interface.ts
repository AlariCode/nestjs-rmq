import { Message } from 'amqplib';
import { IRouteMeta } from './queue-meta.interface';

export interface IRMQControllerOptions {
	msgFactory?: (msg: Message, topic: IRouteMeta) => any[];
}
