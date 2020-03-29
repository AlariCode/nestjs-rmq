import { EventEmitter } from 'events';

export const requestEmitter = new EventEmitter();
export const responseEmitter = new EventEmitter();

requestEmitter.setMaxListeners(0);
responseEmitter.setMaxListeners(0);

export enum ResponseEmmiterResult {
	success = 'success',
	error = 'error',
	ack = 'ack'
}
