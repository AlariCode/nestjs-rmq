import { ERROR_TYPE } from '../constants';
import { RMQTransportError } from './rmq-transport-error.class';
import { RMQError } from './rmq-error.class';

export class RMQErrorHandler {
	public static handle(headers: any): any {
		switch (headers['-x-type']) {
			case ERROR_TYPE.TRANSPORT:
				return new RMQTransportError(
					headers['-x-error'],
					headers['-x-status-code'],
					headers['-x-data'],
					headers['-x-service'],
					headers['-x-host']
				);
				break;
			case ERROR_TYPE.RMQ:
				return new RMQError(
					headers['-x-error'],
					headers['-x-status-code'],
					headers['-x-data'],
					headers['-x-service'],
					headers['-x-host']
				);
				break;
		}
	}
}
