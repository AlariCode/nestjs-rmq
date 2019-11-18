import { RMQPipeClass } from '../classes/rmq-pipe.class';

export const RMQPipe = (pipe: typeof RMQPipeClass) => {
	return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
		const method = descriptor.value;
		descriptor.value = async function() {
			arguments[0] = await new pipe().transform(arguments[0]);
			return method.apply(this, arguments);
		};
	};
};
