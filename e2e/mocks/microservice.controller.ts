import { Controller } from '@nestjs/common';
import { RMQController, RMQError, RMQRoute, Validate } from '../../lib';
import { DivideContracts, MultiplyContracts, NotificationContracts, SumContracts, TimeOutContracts } from '../contracts/mock.contracts';
import { ERROR_TYPE } from '../../lib/constants';

@Controller()
@RMQController()
export class MicroserviceController {
	@RMQRoute(SumContracts.topic)
	@Validate()
	sumRpc({ arrayToSum }: SumContracts.Request): SumContracts.Response {
		const result = arrayToSum.reduce((prev, cur) => prev + cur);
		if (result === 0) {
			throw new Error('My error from method');
		}
		if (result < 0 && result >= -10) {
			throw new RMQError('My RMQError from method', ERROR_TYPE.RMQ, 0, 'data');
		}
		if (result < -10) {
			return;
		}
		return { result: arrayToSum.reduce((prev, cur) => prev + cur) };
	}

	@RMQRoute(NotificationContracts.topic)
	@Validate()
	notificationNone({ message }: NotificationContracts.Request): void {
		console.log(message);
		return;
	}

	@RMQRoute(MultiplyContracts.topic)
	@Validate()
	multiplyRpc({ arrayToMultiply }: MultiplyContracts.Request): MultiplyContracts.Response {
		return { result: arrayToMultiply.reduce((prev, cur) => prev * cur) };
	}

	@RMQRoute(DivideContracts.topic)
	@Validate()
	divide({ first, second }: DivideContracts.Request): DivideContracts.Response {
		return { result: first/second };
	}

	@RMQRoute(TimeOutContracts.topic)
	timeOut(num: number): Promise<number> {
		return new Promise((resolve, reject) => {
			setTimeout(function () {
				resolve(num);
			}, 3000);
		});
	}
}
