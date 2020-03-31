import { Test } from '@nestjs/testing';
import { RMQModule, RMQService } from '../../lib';
import { INestApplication } from '@nestjs/common';
import { ApiController } from '../controllers/api.controller';
import { MicroserviceController } from '../controllers/microservice.controller';
import { ERROR_UNDEFINED_FROM_RPC } from '../../lib/constants';

describe('TestController', () => {
	let api: INestApplication;
	let apiController: ApiController;
	let microserviceController: MicroserviceController;
	let rmqService: RMQService;
	let spyNotificationNone;

	beforeAll(async () => {
		const apiModule = await Test.createTestingModule({
			imports: [
				RMQModule.forRoot({
					exchangeName: 'test',
					connections: [
						{
							login: 'guest',
							password: 'guest',
							host: 'localhost',
						},
					],
					queueName: 'test',
					prefetchCount: 10,
					serviceName: 'test-service'
				}),
			],
			controllers: [ApiController, MicroserviceController],
		}).compile();
		api = apiModule.createNestApplication();
		await api.init();

		apiController = apiModule.get<ApiController>(ApiController);
		microserviceController = apiModule.get<MicroserviceController>(MicroserviceController);
		rmqService = apiModule.get<RMQService>(RMQService);
		spyNotificationNone = jest.spyOn(microserviceController, 'notificationNone');
		console.warn = jest.fn();
		console.log = jest.fn();
	});

	describe('rpc', () => {
		it('successful send()', async () => {
			const { result } = await apiController.sumSuccess([1, 2, 3]);
			expect(result).toBe(6);
		});
		it('request validation failed', async () => {
			try {
				const { result } = await apiController.sumFailed(['1', '2', '3']);
				expect(result).not.toBe(6);
			} catch (error) {
				expect(error.message).toBe('each value in arrayToSum must be a number conforming to the specified constraints');
				expect(error.type).toBeUndefined();
				expect(error.code).toBeUndefined();
				expect(error.data).toBeUndefined();
				expect(error.service).toBe('test-service');
				expect(error.host).not.toBeNull();
			}
		});
		it('get common Error from method', async () => {
			try {
				const { result } = await apiController.sumSuccess([0,0,0]);
				expect(result).not.toBe(0);
			} catch (error) {
				expect(error.message).toBe('My error from method');
				expect(error.type).toBeUndefined();
				expect(error.code).toBeUndefined();
				expect(error.data).toBeUndefined();
				expect(error.service).toBe('test-service');
				expect(error.host).not.toBeNull();
			}
		});
		it('get RMQError from method', async () => {
			try {
				const { result } = await apiController.sumSuccess([-1,0,0]);
				expect(result).not.toBe(-1);
			} catch (error) {
				expect(error.message).toBe('My RMQError from method');
				expect(error.type).toBe('RMQ');
				expect(error.code).toBe(0);
				expect(error.data).toBe('data');
				expect(error.service).toBe('test-service');
				expect(error.host).not.toBeNull();
			}
		});
		it('get undefined return Error', async () => {
			try {
				const { result } = await apiController.sumSuccess([-11,0,0]);
				expect(result).not.toBe(-11);
			} catch (error) {
				expect(error.message).toBe(ERROR_UNDEFINED_FROM_RPC);
				expect(error.type).toBeUndefined();
				expect(error.code).toBeUndefined();
				expect(error.data).toBeUndefined();
				expect(error.service).toBe('test-service');
				expect(error.host).not.toBeNull();
			}
		});
	});

	describe('none', () => {
		it('successful notify()', async () => {
			const res = await apiController.notificationSuccess('test');
			expect(spyNotificationNone).toBeCalledTimes(1);
			expect(console.log).toBeCalledTimes(1);
			expect(console.log).toHaveBeenCalledWith('test');
			expect(res).toBeUndefined();
		});
		it('notify validation failed', async () => {
			const res = await apiController.notificationFailed(0);
			expect(spyNotificationNone).toBeCalledTimes(2);
			expect(console.log).toBeCalledTimes(1);
			expect(res).toBeUndefined();
		});
	});

	afterAll(async () => {
		await delay(500);
		await rmqService.disconnect();
		await api.close();
	});
});

function delay(time: number) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, time);
	});
}
