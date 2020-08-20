import { RMQPipeClass } from '../classes/rmq-pipe.class';
import { RMQIntercepterClass } from '../classes/rmq-intercepter.class';
import { RMQErrorHandler } from '../classes/rmq-error-handler.class';
import { LoggerService } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';

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
}

export interface IRMQServiceAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	useFactory?: (...args: any[]) => Promise<IRMQServiceOptions> | IRMQServiceOptions;
	inject?: any[];
}
