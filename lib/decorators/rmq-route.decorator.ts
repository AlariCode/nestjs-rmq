import { RMQ_ROUTES_OPTIONS, RMQ_ROUTES_PATH } from '../constants';
import { IRouteOptions } from '../interfaces/queue-meta.interface';
import { applyDecorators, SetMetadata } from '@nestjs/common';

export const RMQRoute = (topic: string, options?: IRouteOptions): MethodDecorator => {
	return applyDecorators(
		SetMetadata(RMQ_ROUTES_OPTIONS, {
			...options,
		}),
		SetMetadata(RMQ_ROUTES_PATH, topic)
	);
};
