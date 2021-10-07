import { LoggerService } from '@nestjs/common';
import { IRMQServiceOptions } from './interfaces/rmq-options.interface';

export function validateOptions(options: IRMQServiceOptions, logger: LoggerService) {
	if (options.serviceName === undefined) {
		logger.warn('Check your configuration, RabbitMQ service name not specified! serviceName is undefined.');
	}
	if (options.isQueueDurable) {
		logger.warn('isQueueDurable is deprecated and will be removed in future versions. Use queueOptions instead.');
	}
	if (options.queueArguments) {
		logger.warn('queueArguments is deprecated and will be removed in future versions. Use queueOptions instead.');
	}
	if (options.isExchangeDurable) {
		logger.warn('isExchangeDurable is deprecated and will be removed in future versions. Use exchangeOptions instead.');
	}
}
