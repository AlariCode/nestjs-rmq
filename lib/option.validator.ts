import { LoggerService } from '@nestjs/common';
import { IRMQServiceOptions } from './interfaces/rmq-options.interface';

export function validateOptions(options: IRMQServiceOptions, logger: LoggerService) {
	if (options.serviceName === undefined) {
		logger.warn('Check your configuration, RabbitMQ service name not specified! serviceName is undefined.');
	}
}
