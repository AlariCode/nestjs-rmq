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
}

export interface IRMQConnection {
	login: string;
	password: string;
	host: string;
}
