import { applyDecorators, SetMetadata } from '@nestjs/common';
import { RMQ_ROUTES_VALIDATE } from '../constants';

export const RMQValidate = (): MethodDecorator => {
	return applyDecorators(SetMetadata(RMQ_ROUTES_VALIDATE, true));
};

/** @depreceated */
export const Validate = RMQValidate;
