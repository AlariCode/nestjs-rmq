import { Channel } from 'amqplib';
import { IPublishOptions } from '..';

export interface IRMQService {
	init: () => Promise<void>;
	ack: (...params: Parameters<Channel['ack']>) => ReturnType<Channel['ack']>;
	nack: (...params: Parameters<Channel['nack']>) => ReturnType<Channel['nack']>;
	send: <IMessage, IReply>(topic: string, message: IMessage, options?: IPublishOptions) => Promise<IReply>;
	notify: <IMessage>(topic: string, message: IMessage, options?: IPublishOptions) => Promise<void>;
	healthCheck: () => boolean;
	disconnect: () => Promise<void>;
	mockReply?: <T>(topic: string, reply: T) => void;
	mockError?: <T>(topic: string, error: T) => void;
	triggerRoute?: <T, R>(path: string, data: T) => Promise<R>;
}
