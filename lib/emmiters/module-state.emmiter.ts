import { EventEmitter } from 'events';

export const moduleStateEmmiter = new EventEmitter();

export enum ModuleState {
	ready = 'ready',
}
