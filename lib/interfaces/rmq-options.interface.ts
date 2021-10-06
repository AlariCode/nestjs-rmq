import { RMQPipeClass } from '../classes/rmq-pipe.class';
import { RMQIntercepterClass } from '../classes/rmq-intercepter.class';
import { RMQErrorHandler } from '../classes/rmq-error-handler.class';
import { LoggerService } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { Channel, Options } from 'amqplib';
import { RMQ_PROTOCOL } from '../constants';
import { ConnectionOptions } from 'tls';

export interface IRMQServiceOptions {
	exchangeName: string;
	connections: IRMQConnection[];
	queueName?: string;
	queueArguments?: {
		[key: string]: string;
	};
	connectionOptions?: ConnectionOptions & {
		noDelay?: boolean;
		timeout?: number;
		keepAlive?: boolean;
		keepAliveDelay?: number;
		clientProperties?: any;
		credentials?: {
			mechanism: string;
			username: string;
			password: string;
			response: () => Buffer;
		};
	},
	prefetchCount?: number;
	isGlobalPrefetchCount?: boolean;
	isQueueDurable?: boolean;
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

export interface IRMQConnection {
	login: string;
	password: string;
	host: string;
	protocol?: RMQ_PROTOCOL,
	port?: number;
	vhost?: string;
}

export interface IRMQServiceAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	useFactory?: (...args: any[]) => Promise<IRMQServiceOptions> | IRMQServiceOptions;
	inject?: any[];
}
