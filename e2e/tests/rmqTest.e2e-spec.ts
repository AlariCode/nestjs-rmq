import { Test } from '@nestjs/testing';
import { RMQModule, RMQService } from '../../lib';
import { INestApplication } from '@nestjs/common';
import { ApiController } from '../mocks/api.controller';
import { MicroserviceController } from '../mocks/microservice.controller';
import { ConfigModule } from '../mocks/config.module';
import { ConfigService } from '../mocks/config.service';
import { IRMQService } from '../../lib/interfaces/rmq-service.interface';
import { DivideContracts } from '../contracts/mock.contracts';

describe('RMQe2e', () => {
	let api: INestApplication;
	let apiController: ApiController;
	let microserviceController: MicroserviceController;
	let rmqService: IRMQService;

	beforeAll(async () => {
		const apiModule = await Test.createTestingModule({
			imports: [
				ConfigModule,
				RMQModule.forTest({})
			],
			controllers: [MicroserviceController],
		}).compile();
		api = apiModule.createNestApplication();
		await api.init();

		rmqService = apiModule.get<IRMQService>(RMQService);
	});

	describe('Running methods', () => {
		it('triggerRoute', async () => {
			const res = rmqService.triggerRoute<DivideContracts.Request, DivideContracts.Response>(DivideContracts.topic, {
				first: 10,
				second: 2
			}, 1);
			expect(res).toEqual(5);
		});
	});

	afterAll(async () => {
		await api.close();
	});
});
