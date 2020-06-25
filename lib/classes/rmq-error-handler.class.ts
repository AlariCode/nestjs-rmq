import { RMQError } from './rmq-error.class';
import { IRmqErrorHeaders } from '../interfaces/rmq-error-headers.interface';
import { MessagePropertyHeaders } from 'amqplib';

export class RMQErrorHandler {
	public static handle(headers: IRmqErrorHeaders | MessagePropertyHeaders): RMQError | any {
		return new RMQError(
			headers['-x-error'],
			headers['-x-type'],
			headers['-x-status-code'],
			headers['-x-data'],
			headers['-x-service'],
			headers['-x-host'],
			headers['-x-custom-code']
		);
	}
}
