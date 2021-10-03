import { IRMQMessage } from './rmq-message.interface';

export interface IRouteMeta {
	topic: string;
	methodName: string;
	target: any;
	options?: IRouteOptions;
}

export interface IRouteOptions {
	name?: string | string[];
	manualAck?: boolean;
	msgFactory?: (msg: IRMQMessage) => any[];
}
