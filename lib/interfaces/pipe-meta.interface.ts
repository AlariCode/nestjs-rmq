import { RMQPipeClass } from '../classes/rmq-pipe.class';

export interface IPipeMeta {
	pipe: typeof RMQPipeClass;
	methodName: string;
	target: any;
}
