import { RMQ_PIPE_META } from '../constants';
import { RMQPipeClass } from '../classes/rmq-pipe.class';
import { IPipeMeta } from '../interfaces/pipe-meta.interface';

export const RMQPipe = (middleware: typeof RMQPipeClass) => {
	return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
		let middlewares: IPipeMeta[] = Reflect.getMetadata(RMQ_PIPE_META, target);
		if (!middlewares) {
			middlewares = [];
		}
		middlewares.push({ pipe: middleware, methodName, target });
		Reflect.defineMetadata(RMQ_PIPE_META, middlewares, target);
	};
};
