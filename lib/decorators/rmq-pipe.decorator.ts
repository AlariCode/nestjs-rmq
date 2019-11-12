import { RMQ_PIPE_META } from '../constants';
import { RMQPipeClass } from '../classes/rmq-pipe.class';
import { IPipeMeta } from '../interfaces/pipe-meta.interface';

export const RMQPipe = (pipe: typeof RMQPipeClass) => {
	return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
		let pipes: IPipeMeta[] = Reflect.getMetadata(RMQ_PIPE_META, target);
		if (!pipes) {
			pipes = [];
		}
		pipes.push({ pipe, methodName, target });
		Reflect.defineMetadata(RMQ_PIPE_META, pipes, target);
	};
};
