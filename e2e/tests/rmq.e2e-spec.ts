import { Test } from '@nestjs/testing';
import { RMQModule, RMQService } from '../../lib';
import { INestApplication } from '@nestjs/common';
import { ApiController } from '../mocks/api.controller';
import { MicroserviceController } from '../mocks/microservice.controller';
import { ERROR_UNDEFINED_FROM_RPC } from '../../lib/constants';
import { DoublePipe } from '../mocks/double.pipe';
import { ZeroIntercepter } from '../mocks/zero.intercepter';
import { ErrorHostHandler } from '../mocks/error-host.handler';

describe('RMQe2e', () => {
	let api: INestApplication;
	let apiController: ApiController;
	let microserviceController: MicroserviceController;
	let rmqService: RMQService;

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
					heartbeatIntervalInSeconds: 10,
					prefetchCount: 10,
					middleware: [DoublePipe],
					intercepters: [ZeroIntercepter],
					errorHandler: ErrorHostHandler,
					serviceName: 'test-service',
					messagesTimeout: 2000,
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
		it('check connection', async () => {
			const isConnected = rmqService.healthCheck();
			expect(isConnected).toBe(true);
		});
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
				const { result } = await apiController.sumSuccess([0, 0, 0]);
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
				const { result } = await apiController.sumSuccess([-1, 0, 0]);
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
				const { result } = await apiController.sumSuccess([-11, 0, 0]);
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
		it('long message timeout', async () => {
			try {
				const num = await apiController.timeOutMessage(10);
				expect(num).toBe(10);
			} catch(e) {
				expect(e.message).toBeNull();
			}
		});

	});

	describe('none', () => {
		it('successful notify()', async () => {
			const res = await apiController.notificationSuccess('test');
			expect(console.log).toBeCalledTimes(1);
			expect(console.log).toHaveBeenCalledWith('test');
			expect(res).toBeUndefined();
		});
		it('notify validation failed', async () => {
			const res = await apiController.notificationFailed(0);
			expect(console.log).toBeCalledTimes(1);
			expect(res).toBeUndefined();
		});
	});

	describe('middleware', () => {
		it('doublePipe', async () => {
			const { result } = await apiController.multiply([1, 2]);
			expect(result).toBe(8);
		});
	});

	describe('interceptor', () => {
		it('zeroInterceptor', async () => {
			const { result } = await apiController.divide(10, 5);
			expect(result).toBe(0);
		});
	});

	describe('errorHandler', () => {
		it('error host change', async () => {
			try {
				const { result } = await apiController.sumSuccess([0, 0, 0]);
				expect(result).not.toBe(0);
			} catch (error) {
				expect(error.host).toBe('handler');
			}
		});
	});

	afterAll(async () => {
		await delay(500);
		await rmqService.disconnect();
		await api.close();
	});
});

async function delay(time: number) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, time);
	});
}
