import { RMQPipeClass } from '../classes/rmq-pipe.class';
import { RMQIntercepterClass } from '../classes/rmq-intercepter.class';
import { RMQErrorHandler } from '../classes/rmq-error-handler.class';
import { LoggerService } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { Channel, Options } from 'amqplib';

export interface IRMQServiceBaseOptions {
	exchangeName: string;
	connections: IRMQConnection[];
	queueName?: string;
	queueArguments?: {
		[key: string]: string;
	};
	prefetchCount?: number;
	isGlobalPrefetchCount?: boolean;
	isQueueDurable?: boolean;
	isQueueExclusive?: boolean;
	isExchangeDurable?: boolean;
	assertExchangeType?: Parameters<Channel['assertExchange']>[1];
	exchangeOptions?: Options.AssertExchange;
	reconnectTimeInSeconds?: number;
	heartbeatIntervalInSeconds?: number;
	messagesTimeout?: number;
	logMessages?: boolean;
	logger?: LoggerService;
	middleware?: typeof RMQPipeClass[];
	intercepters?: typeof RMQIntercepterClass[];
	errorHandler?: typeof RMQErrorHandler;
	serviceName?: string;
}

export interface IRMQServiceOptions extends IRMQServiceBaseOptions {
	name?: string;
}

export interface IRMQConnection {
	login: string;
	password: string;
	host: string;
	port?: number;
	vhost?: string;
}

export interface IRMQServiceAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	name?: string;
	useFactory?: (...args: any[]) => Promise<IRMQServiceBaseOptions> | IRMQServiceBaseOptions;
	inject?: any[];
}
