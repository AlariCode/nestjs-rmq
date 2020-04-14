import { Message } from 'amqplib';
import { LoggerService } from '@nestjs/common';

// tslint:disable-next-line: interface-name
export class RMQPipeClass {
	protected logger: LoggerService;

	constructor(logger: LoggerService = console) {
		this.logger = logger;
	}

	async transform(msg: Message): Promise<Message> {
		return msg;
	}
}
