import { Message } from 'amqplib';

export class RMQIntercepterClass {
	async intercept(res: any, msg: Message, error?: Error): Promise<any> {
		return res;
	}
}
