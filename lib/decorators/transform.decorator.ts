import { applyDecorators, SetMetadata } from '@nestjs/common';
import { RMQ_ROUTES_TRANSFORM } from '../constants';

export const RMQTransform = (): MethodDecorator => {
	return applyDecorators(SetMetadata(RMQ_ROUTES_TRANSFORM, true));
};
