export function RMQController(): ClassDecorator {
	return function (target: any) {
		console.warn('@RMQController is deprecated. Use just @RMQRoute. You can use it with msgFactory inside if needed', 'RMQModule');
		target = class extends (target as { new (...args): any }) {
			constructor(...args: any) {
				super(...args);
			}
		};
		return target;
	};
}
