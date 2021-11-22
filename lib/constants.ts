export const RMQ_ROUTES_META = 'RMQ_ROUTES_META';
export const RMQ_MESSAGE_META = 'RMQ_MESSAGE_META';
export const RMQ_ROUTES_OPTIONS = 'RMQ_ROUTES_OPTIONS';
export const RMQ_ROUTES_PATH = 'RMQ_ROUTES_PATH';
export const RMQ_ROUTES_VALIDATE = 'RMQ_ROUTES_VALIDATE';
export const RMQ_ROUTES_TRANSFORM = 'RMQ_ROUTES_TRANSFORM';
export const RMQ_MODULE_OPTIONS = 'RMQ_MODULE_OPTIONS';

export const DISCONNECT_EVENT = 'disconnect';
export const CONNECT_EVENT = 'connect';
export const DISCONNECT_MESSAGE = 'Disconnected from RMQ. Trying to reconnect';
export const CONNECTED_MESSAGE = 'Successfully connected to RMQ';
export const REPLY_QUEUE = 'amq.rabbitmq.reply-to';
export const ERROR_NONE_RPC = 'This is none RPC queue. Use notify() method instead';
export const ERROR_NO_ROUTE = "Requested service doesn't have RMQRoute with this path";
export const ERROR_NO_QUEUE = 'No queueName specified! You will not recieve messages in RMQRoute';
export const ERROR_UNDEFINED_FROM_RPC = 'RPC method returned undefined';
export const ERROR_TIMEOUT = 'Response timeout error';

export const DEFAULT_RECONNECT_TIME = 5;
export const DEFAULT_HEARTBEAT_TIME = 5;
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_PREFETCH_COUNT = 0;
export const INITIALIZATION_STEP_DELAY = 300;

export enum ERROR_TYPE {
	TRANSPORT = 'TRANSPORT',
	RMQ = 'RMQ',
}

export enum RMQ_PROTOCOL {
	AMQP = 'amqp',
	AMQPS = 'amqps',
}
