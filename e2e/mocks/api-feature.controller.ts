import { Controller } from '@nestjs/common';
import { RMQInjectService, RMQService } from '../../lib';
import {
	NotificationContracts,
	SumContracts,
} from '../contracts/mock.contracts';

@Controller()
export class ApiFeatureController {
	constructor(
		public readonly rmqImplicitInject: RMQService,
		@RMQInjectService("test2") public readonly rmqExplicitInject: RMQService
	) { }

	async sumSuccess(arrayToSum: number[]): Promise<SumContracts.Response> {
		return this.rmqImplicitInject.send<SumContracts.Request, SumContracts.Response>(SumContracts.topic, { arrayToSum });
	}

	async sumSuccess2(arrayToSum: number[]): Promise<SumContracts.Response> {
		return this.rmqExplicitInject.send<SumContracts.Request, SumContracts.Response>(SumContracts.topic, { arrayToSum });
	}

	async sumFailed(arrayToSum: string[]): Promise<SumContracts.Response> {
		return this.rmqImplicitInject.send<any, SumContracts.Response>(SumContracts.topic, { arrayToSum });
	}

	async sumFailed2(arrayToSum: string[]): Promise<SumContracts.Response> {
		return this.rmqExplicitInject.send<any, SumContracts.Response>(SumContracts.topic, { arrayToSum });
	}

	async notificationSuccess(message: string): Promise<void> {
		return this.rmqImplicitInject.notify<NotificationContracts.Request>(NotificationContracts.topic, { message });
	}

	async notificationSuccess2(message: string): Promise<void> {
		return this.rmqExplicitInject.notify<NotificationContracts.Request>(NotificationContracts.topic, { message });
	}

	async notificationFailed(message: number): Promise<void> {
		return this.rmqImplicitInject.notify<any>(NotificationContracts.topic, { message });
	}

	async notificationFailed2(message: number): Promise<void> {
		return this.rmqExplicitInject.notify<any>(NotificationContracts.topic, { message });
	}
}
