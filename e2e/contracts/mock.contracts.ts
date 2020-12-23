import { IsNumber, IsString } from 'class-validator';

export namespace SumContracts {
	export const topic: string = 'sum.rpc';
	export class Request {
		@IsNumber(
			{},
			{
				each: true,
			}
		)
		arrayToSum: number[];
	}
	export class Response {
		result: number;
	}
}

export namespace MultiplyContracts {
	export const topic: string = 'multiply.rpc';
	export class Request {
		@IsNumber(
			{},
			{
				each: true,
			}
		)
		arrayToMultiply: number[];
	}
	export class Response {
		result: number;
	}
}

export namespace DivideContracts {
	export const topic: string = 'divide.rpc';
	export class Request {
		@IsNumber()
		first: number;

		@IsNumber()
		second: number;
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

export namespace TimeOutContracts {
	export const topic: string = 'timeout.rpc';
}

export namespace AppIdContracts {
	export const topic: string = 'appid.rpc';
	export class Response {
		appId: string;
	}
}

export namespace ManualAckContracts {
	export const topic: string = 'manualAck.rpc';
	export class Response {
		appId: string;
	}
}

export namespace DebugContracts {
	export const topic: string = 'debug.rpc';
	export class Request {
		prop1: number[];
		prop2: Buffer;
	}
	export class Response {
		debugString: string;
	}
}

export namespace CustomMessageFactoryContracts {
	export const topic: string = 'custom-message-factory.rpc';
	export class Request {
		num: number;
	}
	export class Response {
		num: number;
		appId: string;
	}
}
