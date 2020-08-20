export const RMQ_ROUTES_META: string = 'RMQ_ROUTES_META';
export const DISCONNECT_EVENT: string = 'disconnect';
export const CONNECT_EVENT: string = 'connect';
export const DISCONNECT_MESSAGE: string = 'Disconnected from RMQ. Trying to reconnect';
export const CONNECTED_MESSAGE: string = 'Successfully connected to RMQ';
export const REPLY_QUEUE: string = 'amq.rabbitmq.reply-to';
export const EXCHANGE_TYPE: string = 'topic';
export const ERROR_NONE_RPC: string = 'This is none RPC queue. Use notify() method instead';
// tslint:disable-next-line: quotemark
export const ERROR_NO_ROUTE: string = "Requested service doesn't have RMQRoute with this path";
export const ERROR_NO_ROUTE_FOR_CONTROLLER: string = 'No RMQRoute specified for controller';
export const ERROR_UNDEFINED_FROM_RPC: string = 'RPC method returned undefined';
export const ERROR_TIMEOUT: string = 'Response timeout error';

export const DEFAULT_RECONNECT_TIME: number = 5;
export const DEFAULT_HEARTBEAT_TIME: number = 5;
export const DEFAULT_TIMEOUT: number = 30000;
export const DEFAULT_PREFETCH_COUNT: number = 0;

export enum ERROR_TYPE {
	TRANSPORT = 'TRANSPORT',
	RMQ = 'RMQ'
}
