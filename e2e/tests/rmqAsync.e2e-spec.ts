import { Test } from '@nestjs/testing';
import { RMQModule, RMQService } from '../../lib';
import { INestApplication } from '@nestjs/common';
import { ApiController } from '../mocks/api.controller';
import { MicroserviceController } from '../mocks/microservice.controller';
import { ConfigModule } from '../mocks/config.module';
import { ConfigService } from '../mocks/config.service';

describe('RMQe2e', () => {
	let api: INestApplication;
	let apiController: ApiController;
	let microserviceController: MicroserviceController;
	let rmqService: RMQService;

	beforeAll(async () => {
		const apiModule = await Test.createTestingModule({
			imports: [
				ConfigModule,
				RMQModule.forRootAsync({
					imports: [ConfigModule],
					inject: [ConfigService],
					useFactory: (configService: ConfigService) => {
						return {
							exchangeName: 'test',
							connections: [
								{
									login: 'guest',
									password: 'guest',
									host: configService.getHost(),
								},
							],
							serviceName: 'test-service',
							queueName: 'test',
						};
					},
				}),
			],
			controllers: [ApiController, MicroserviceController],
		}).compile();
		api = apiModule.createNestApplication();
		await api.init();

		apiController = apiModule.get<ApiController>(ApiController);
		microserviceController = apiModule.get<MicroserviceController>(MicroserviceController);
		rmqService = apiModule.get<RMQService>(RMQService);
		console.warn = jest.fn();
		console.log = jest.fn();
	});

	describe('rpc', () => {
		it('successful send()', async () => {
			const { result } = await apiController.sumSuccess([1, 2, 3]);
			expect(result).toBe(6);
		});
	});

	afterAll(async () => {
		await delay(500);
		await rmqService.disconnect();
		await api.close();
	});
});

async function delay(time: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, time);
	});
}
