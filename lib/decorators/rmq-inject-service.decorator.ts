import { Inject } from '@nestjs/common';
import { DEFAULT_SERVICE_NAME } from '../constants';
import { getServiceToken } from '../utils/get-service-token';

export const RMQInjectService = (serviceName: string = DEFAULT_SERVICE_NAME) => Inject(getServiceToken(serviceName));