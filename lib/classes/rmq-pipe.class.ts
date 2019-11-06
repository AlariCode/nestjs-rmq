import { Message } from 'amqplib';

export class RMQPipeClass {
	async transfrom(msg: Message): Promise<Message> {
		return msg;
	}
}
