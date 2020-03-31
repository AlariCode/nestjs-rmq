import { IsNumber, IsString } from 'class-validator';

export namespace SumContracts {
	export const topic: string = 'sum.rpc';
	export class Request {
		@IsNumber({},{
			each: true
		})
		arrayToSum: number[];
	}
	export class Response {
		result: number;
	}
}

export namespace NotificationContracts {
	export const topic: string = 'notification.none';
	export class Request {
		@IsString()
		message: string;
	}
}
