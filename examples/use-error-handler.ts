import { Controller } from '@nestjs/common';
import { RMQController, RMQRoute, IRMQErrorHandler } from 'nestjs-rmq';

enum StatusCodes {
	OK = 0,
	InvalidRequest = 1 << 0, // 0001
	NotFound = 1 << 1, // 0010
	ExternalError = 1 << 2, // 0100
	InternalError = 1 << 3, // 1000
}

@Controller()
@RMQController()
export class AppController implements IRMQErrorHandler {
	logger: any;

	onError(msg: any, error: Error) {
		if (error.statusCode == StatusCodes.InvalidRequest) {
			this.logger.Warning(error.message);
		} else {
			this.logger.Error(error.message);
		}
	}

	@RMQRoute(SomeCommand.Topic)
	async getSome(req: SomeCommand.Request): Promise<SomeCommand.Response> {
		return { data: 'some' };
	}
}

export namespace SomeCommand {
	/**  @summary RMQ Topic */
	export const Topic = 'myservice.someCommand.rpc';
	/**  @summary RMQ Request class */
	export interface Request {
		id: number;
	}
	/**  @summary RMQ Response class */
	export interface Response {
		data: string;
	}
}
