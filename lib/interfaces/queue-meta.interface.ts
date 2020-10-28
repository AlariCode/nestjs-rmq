export interface IRouteMeta {
	topic: string;
	methodName: string;
	target: any;
	options?: IRouteOptions;
}

export interface IRouteOptions {
	manualAck: boolean;
}
