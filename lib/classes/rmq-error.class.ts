import { ERROR_TYPE } from '../constants';

export class RMQError extends Error {
	/**
	 * @summary Error message
	 */
	message: string;

	/**
	 * @summary Error code
	 */
	code?: number;

	/**
	 * @summary Error custom data
	 */
	data?: any;

	/**
	 * @summary Service name
	 */
	service?: string;

	/**
	 * @summary Host name
	 */
	host?: string;

	/**
	 * @summary Host name
	 */
	type?: ERROR_TYPE;

	constructor(message: string, type: ERROR_TYPE, code?: number, data?: any, service?: string, host?: string) {
		super();
		Object.setPrototypeOf(this, new.target.prototype);
		this.message = message;
		this.type = type;
		this.code = code;
		this.data = data;
		this.service = service;
		this.host = host;
	}
}
