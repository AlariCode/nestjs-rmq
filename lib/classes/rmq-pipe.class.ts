import { LoggerService } from '@nestjs/common';
import { Message } from 'amqplib';
import { IRMQMessage } from '../interfaces/rmq-message.interface';

// tslint:disable-next-line: interface-name
export class RMQPipeClass {
	protected logger: LoggerService;

	constructor(logger: LoggerService = console) {
		this.logger = logger;
	}

	async transform(msg: IRMQMessage): Promise<IRMQMessage | Message> {
		return msg;
	}
}
