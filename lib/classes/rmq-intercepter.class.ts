import { Message } from 'amqplib';
import { LoggerService } from '@nestjs/common';

export class RMQIntercepterClass {
	protected logger: LoggerService;

	constructor(logger: LoggerService = console) {
		this.logger = logger;
	}

	async intercept(res: any, msg: Message, error?: Error): Promise<any> {
		return res;
	}
}
