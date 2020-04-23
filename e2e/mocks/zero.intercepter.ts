import { RMQIntercepterClass } from '../../lib';
import { Message } from 'amqplib';
import { DivideContracts } from '../contracts/mock.contracts';

export class ZeroIntercepter extends RMQIntercepterClass {
	async intercept(res: any, msg: Message, error: Error): Promise<Message> {
		if (msg.fields.routingKey === DivideContracts.topic) {
			res.result = 0;
		}
		return res;
	}
}
