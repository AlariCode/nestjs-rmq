import { EventEmitter } from 'events';

export const requestEmitter = new EventEmitter();
export const responseEmitter = new EventEmitter();

requestEmitter.setMaxListeners(0);
responseEmitter.setMaxListeners(0);

export enum ResponseEmitterResult {
	success = 'success',
	error = 'error',
	ack = 'ack',
}
