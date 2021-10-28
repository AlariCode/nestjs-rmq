import { RMQPipeClass } from '../classes/rmq-pipe.class';

export const RMQPipe = (pipe: typeof RMQPipeClass) => {
	return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
		const method = descriptor.value;
		descriptor.value = async function (...args) {
			args[0] = await new pipe().transform(args[0]);
			return method.apply(this, args);
		};
	};
};
