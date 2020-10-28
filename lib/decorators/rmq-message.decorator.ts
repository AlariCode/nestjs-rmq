import 'reflect-metadata';

import { RMQ_MESSAGE_META } from '../constants';

export function RMQMessage(target: any, propertyKey: string | symbol, parameterIndex: number) {
	const messageParams: number[] = Reflect.getOwnMetadata(RMQ_MESSAGE_META, target, propertyKey) || [];
	messageParams.push(parameterIndex);
	Reflect.defineMetadata(RMQ_MESSAGE_META, messageParams, target, propertyKey);
}
