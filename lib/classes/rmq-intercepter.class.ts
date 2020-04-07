import { Message } from 'amqplib';
import { LoggerService } from '@nestjs/common';

export class RMQIntercepterClass {
	constructor(protected logger?: LoggerService) {}

	async intercept(res: any, msg: Message, error?: Error): Promise<any> {
		return res;
	}
}
