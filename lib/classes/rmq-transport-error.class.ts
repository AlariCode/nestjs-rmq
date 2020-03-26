export class RMQTransportError extends Error {
	message: string;

	/* Your custom error code */
	code?: number;

	/* Error custom data */
	data?: any;

	/* Service custon name */
	service?: string;

	/* Host name */
	host?: string;

	constructor(message: string, code?: number, data?: any, service?: string, host?: string) {
		super();
		Object.setPrototypeOf(this, new.target.prototype);
		this.code = code;
		this.data = data;
		this.message = message;
		this.service = service;
		this.host = host;
	}
}
