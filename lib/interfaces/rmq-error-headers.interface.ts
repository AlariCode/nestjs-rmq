import { ERROR_TYPE } from '../constants';

export interface IRmqErrorHeaders {
	'-x-error': string;
	'-x-type': ERROR_TYPE;
	'-x-status-code': number;
	'-x-data': string;
	'-x-service': string;
	'-x-host': string;
}
