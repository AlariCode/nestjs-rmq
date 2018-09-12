export const DEFAULT_URL: string = 'amqp://localhost';
export const DEFAULT_QUEUE: string = 'default';
export const DEFAULT_PREFETCH_COUNT: number = 0;
export const DEFAULT_IS_GLOBAL_PREFETCH_COUNT: boolean = false;
export const DEFAULT_QUEUE_OPTIONS: object = {};

export const CONNECT_EVENT: string = 'connect';
export const DISCONNECT_EVENT: string = 'disconnect';
export const DISCONNECT_MESSAGE: string = 'Disconnected from RMQ. Trying to reconnect';