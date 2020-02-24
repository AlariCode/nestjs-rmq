import { Message } from 'amqplib';

/** For client controllers that need to handle errors on their own */
export class IRMQErrorHandler {
	async onError(msg: Message, error: Error) {}
}
