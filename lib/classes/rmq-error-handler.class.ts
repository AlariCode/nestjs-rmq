import { ERROR_TYPE } from '../constants';
import { RMQTransportError } from './rmq-transport-error.class';
import { RMQError } from './rmq-error.class';

export class RMQErrorHandler {
	public static handle(headers: any): any {
		switch (headers['-x-error-type']) {
			case ERROR_TYPE.TRANSPORT:
				return new RMQTransportError(
					headers['-x-error-message'],
					headers['-x-error-code'],
					headers['-x-error-data'],
					headers['-x-error-service'],
					headers['-x-error-host']
				);
				break;
			case ERROR_TYPE.RMQ:
				return new RMQError(
					headers['-x-error-message'],
					headers['-x-error-code'],
					headers['-x-error-data'],
					headers['-x-error-service'],
					headers['-x-error-host']
				);
				break;
		}
	}
}
