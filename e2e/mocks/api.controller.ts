import { Controller } from '@nestjs/common';
import { RMQService } from '../../lib';
import { DivideContracts, MultiplyContracts, NotificationContracts, SumContracts, TimeOutContracts } from '../contracts/mock.contracts';

@Controller()
export class ApiController {
	constructor(private readonly rmq: RMQService) {
	}

	async sumSuccess(arrayToSum: number[]): Promise<SumContracts.Response> {
		return this.rmq.send<SumContracts.Request, SumContracts.Response>(SumContracts.topic, { arrayToSum });
	}

	async sumFailed(arrayToSum: string[]): Promise<SumContracts.Response> {
		return this.rmq.send<any, SumContracts.Response>(SumContracts.topic, { arrayToSum });
	}

	async notificationSuccess(message: string): Promise<void> {
		return this.rmq.notify<NotificationContracts.Request>(NotificationContracts.topic, { message });
	}

	async notificationFailed(message: number): Promise<void> {
		return this.rmq.notify<any>(NotificationContracts.topic, { message });
	}

	async multiply(arrayToMultiply: number[]): Promise<MultiplyContracts.Response> {
		return this.rmq.send<MultiplyContracts.Request, MultiplyContracts.Response>(
			MultiplyContracts.topic,
			{ arrayToMultiply },
		);
	}

    async timeOutMessage(num: number): Promise<number> {
       return this.rmq.send<number, number>(
            TimeOutContracts.topic,
            num,
            { timeout: 4000 },
       )
    }

	async divide(first: number, second: number): Promise<DivideContracts.Response> {
		return this.rmq.send<DivideContracts.Request, DivideContracts.Response>(
			DivideContracts.topic,
			{ first, second },
		);
	}
}
