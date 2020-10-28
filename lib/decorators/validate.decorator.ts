import { validate, isObject, Validator } from 'class-validator';

export const Validate = () => {
	return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
		const types = Reflect.getMetadata('design:paramtypes', target, methodName);
		const method = descriptor.value;
		descriptor.value = async function () {
			const classData = arguments['0'];
			const isObj = isObject(classData);
			if (!isObj) {
				return method.apply(this, arguments);
			}
			const instance = Object.assign(new types[0](), classData);
			const errors = await validate(instance);
			if (errors.length) {
				const message = errors
					.map((m) => {
						return Object.values(m.constraints).join('; ');
					})
					.join('; ');
				throw new Error(message);
			}
			return method.apply(this, arguments);
		};
	};
};
