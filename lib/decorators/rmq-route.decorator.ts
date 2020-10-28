import { RMQ_ROUTES_META } from '../constants';
import { IRouteMeta, IRouteOptions } from '../interfaces/queue-meta.interface';
import { RMQService } from '../rmq.service';

export const RMQRoute = (topic: string, options?: IRouteOptions) => {
	return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
		let routes: IRouteMeta[] = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
		if (!routes) {
			routes = [];
		}
		routes.push({ topic, methodName, target, options });
		Reflect.defineMetadata(RMQ_ROUTES_META, routes, RMQService);
	};
};
