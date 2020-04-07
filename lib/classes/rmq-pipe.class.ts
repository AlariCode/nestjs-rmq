import { Message } from 'amqplib';
import { LoggerService } from '@nestjs/common';

// tslint:disable-next-line: interface-name
export class RMQPipeClass {
	constructor(protected logger?: LoggerService) {}

	async transform(msg: Message): Promise<Message> {
		return msg;
	}
}
