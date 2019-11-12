import { Message } from 'amqplib';

// tslint:disable-next-line: interface-name
export class RMQPipeClass {
	async transform(msg: Message): Promise<Message> {
		return msg;
	}
}
