import { RMQPipeClass } from '../../lib';
import { Message } from 'amqplib';
import { MultiplyContracts } from '../contracts/mock.contracts';

export class DoublePipe extends RMQPipeClass {
	async transform(msg: Message): Promise<Message> {
			if (msg.fields.routingKey === MultiplyContracts.topic) {
				let { arrayToMultiply }: MultiplyContracts.Request = JSON.parse(msg.content.toString());
				arrayToMultiply = arrayToMultiply.map(x => x*2);
				msg.content = Buffer.from(JSON.stringify({ arrayToMultiply }));
			}
		return msg;
	}
}
