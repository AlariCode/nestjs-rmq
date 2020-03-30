import { RMQPipeClass } from '../classes/rmq-pipe.class';
import { RMQIntercepterClass } from '../classes/rmq-intercepter.class';
import { RMQErrorHandler } from '../classes/rmq-error-handler.class';

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
	middleware?: typeof RMQPipeClass[];
	intercepters?: typeof RMQIntercepterClass[];
	errorHandler?: typeof RMQErrorHandler;
	serviceName?: string;
}

export interface IRMQConnection {
	login: string;
	password: string;
	host: string;
}
