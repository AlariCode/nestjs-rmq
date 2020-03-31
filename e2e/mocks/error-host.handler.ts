import { IRmqErrorHeaders, RMQError, RMQErrorHandler } from '../../lib';

export class ErrorHostHandler implements RMQErrorHandler {
	public static handle(headers: IRmqErrorHeaders): Error | RMQError {
		headers['-x-host'] = 'handler';
		return new RMQError(
			headers['-x-error'],
			headers['-x-type'],
			headers['-x-status-code'],
			headers['-x-data'],
			headers['-x-service'],
			headers['-x-host'],
		);
	}
}
