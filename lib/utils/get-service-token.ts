import { Type } from '@nestjs/common';
import { RMQService } from '../rmq.service';
import { DEFAULT_SERVICE_NAME } from '../constants';
import { RmqErrorService } from '../rmq-error.service';

export const getErrorServiceToken = (name: string = DEFAULT_SERVICE_NAME): string | Function | Type<RMQService> => {
	if (isDefaultService(name)) {
		return RmqErrorService;
	}

	return `${name}RMQErrorService`;
};

export const getServiceToken = (name: string = DEFAULT_SERVICE_NAME): string | Function | Type<RMQService> => {
	if (isDefaultService(name)) {
		return RMQService;
	}

	return `${name}RMQService`;
};

export const isDefaultService = (name: string = DEFAULT_SERVICE_NAME): boolean => {
	return name === DEFAULT_SERVICE_NAME || !name;
};