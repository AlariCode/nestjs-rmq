import { Controller } from '@nestjs/common';
import { RMQMessage, RMQError, RMQRoute, Validate, ExtendedMessage, RMQService } from '../../lib';
import {
	DivideContracts,
	MultiplyContracts,
	NotificationContracts,
	SumContracts,
	TimeOutContracts,
	AppIdContracts,
	ManualAckContracts,
	DebugContracts, CustomMessageFactoryContracts, PatternStarContracts, PatternHashContracts,
} from '../contracts/mock.contracts';
import { DEFAULT_SERVICE_NAME, ERROR_TYPE } from '../../lib/constants';
import { Message } from 'amqplib';

@Controller()
export class MicroserviceController {
	constructor(private readonly rmqService: RMQService) { }

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

	@RMQRoute(SumContracts.topic, { name: 'test2' })
	@Validate()
	sumRpc2({ arrayToSum }: SumContracts.Request): SumContracts.Response {
		const result = arrayToSum.reduce((prev, cur) => prev + cur);
		return { result };
	}

	@RMQRoute(SumContracts.topic, { name: 'test3' })
	@Validate()
	sumRpc3({ arrayToSum }: SumContracts.Request): SumContracts.Response {
		const result = arrayToSum.reduce((prev, cur) => prev + cur);
		if (result !== 2) {
			throw new Error('Do I look like a calculator to you?');
		}

		return { result };
	}

	@RMQRoute(NotificationContracts.topic)
	@Validate()
	notificationNone({ message }: NotificationContracts.Request): void {
		console.log(message);
		return;
	}

	@RMQRoute(NotificationContracts.topic, { name: ['test2', 'test3'] })
	@Validate()
	notificationNone2({ message }: NotificationContracts.Request, @RMQMessage msg: ExtendedMessage): void {
		console.log(message);
		console.log(msg.serviceName);
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
		return { result: first / second };
	}

	@RMQRoute(TimeOutContracts.topic)
	timeOut(num: number): Promise<number> {
		return new Promise((resolve, reject) => {
			setTimeout(function () {
				resolve(num);
			}, 3000);
		});
	}

	@RMQRoute(AppIdContracts.topic)
	appId(@RMQMessage msg: ExtendedMessage): AppIdContracts.Response {
		return { appId: msg.properties.appId };
	}

	@RMQRoute(ManualAckContracts.topic, { manualAck: true })
	manualAck(@RMQMessage msg: ExtendedMessage): ManualAckContracts.Response {
		this.rmqService.ack(msg);
		return { appId: msg.properties.appId };
	}

	@RMQRoute(DebugContracts.topic)
	debugMessage(@RMQMessage msg: ExtendedMessage): DebugContracts.Response {
		return { debugString: msg.getDebugString() };
	}

	@RMQRoute(CustomMessageFactoryContracts.topic, {
		msgFactory: (msg: Message) => {
			const content: CustomMessageFactoryContracts.Request = JSON.parse(msg.content.toString());
			content.num = content.num * 2;
			return [content, msg.properties.appId];
		}
	})
	customMessageFactory(
		{ num }: CustomMessageFactoryContracts.Request, appId: string
	): CustomMessageFactoryContracts.Response {
		return { num, appId };
	}

	@RMQRoute(PatternStarContracts.topic)
	starPattern({ num }: PatternStarContracts.Request): PatternStarContracts.Response {
		return { num };
	}

	@RMQRoute(PatternHashContracts.topic)
	hashPattern({ num }: PatternHashContracts.Request): PatternHashContracts.Response {
		return { num };
	}
}
