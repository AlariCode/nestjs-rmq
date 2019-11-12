import { RMQPipeClass } from '../classes/rmq-pipe.class';

export interface IRMQServiceOptions {
	exchangeName: string;
	connections: IRMQConnection[];
	queueName?: string;
	queueArguments?: {
		[key: string]: string;
	};
	prefetchCount?: number;
	isGlobalPrefetchCount?: boolean;
	isQueueDurable?: boolean;
	isExchangeDurable?: boolean;
	reconnectTimeInSeconds?: number;
	messagesTimeout?: number;
	logMessages?: boolean;
	middleware?: (typeof RMQPipeClass)[];
}

export interface IRMQConnection {
	login: string;
	password: string;
	host: string;
}
