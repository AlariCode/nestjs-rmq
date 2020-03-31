import { Controller, Get } from '@nestjs/common';
import { RMQService } from '../../lib';
import { NotificationContracts, SumContracts } from '../contracts/mock.contracts';

@Controller()
export class ApiController {
	constructor(private readonly rmq: RMQService) {}

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
}
