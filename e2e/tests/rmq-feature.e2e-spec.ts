import { Test } from '@nestjs/testing';
import { RMQModule, RMQService } from '../../lib';
import { INestApplication } from '@nestjs/common';
import { ApiController } from '../mocks/api.controller';
import { MicroserviceController } from '../mocks/microservice.controller';
import { DEFAULT_SERVICE_NAME, ERROR_UNDEFINED_FROM_RPC } from '../../lib/constants';
import { DoublePipe } from '../mocks/double.pipe';
import { ZeroIntercepter } from '../mocks/zero.intercepter';
import { ErrorHostHandler } from '../mocks/error-host.handler';
import { getServiceToken } from '../../lib/utils/get-service-token';
import { ApiFeatureController } from '../mocks/api-feature.controller';

class OverrideController extends ApiFeatureController { }

describe('RMQe2e forFeature()', () => {
	let api: INestApplication;
	let apiController: ApiFeatureController;
	let overrideController: OverrideController;
	let microserviceController: MicroserviceController;
	let rmqServiceDefault: RMQService;
	let rmqServiceTest2: RMQService;
	let rmqServiceTest3: RMQService;

	beforeAll(async () => {
		const apiModule = await Test.createTestingModule({
			imports: [
				RMQModule.forRoot({
					exchangeName: 'test1',
					connections: [
						{
							login: 'guest',
							password: 'guest',
							host: 'localhost',
						},
					],
					queueName: 'test-queue1',
					heartbeatIntervalInSeconds: 10,
					prefetchCount: 10,
					middleware: [DoublePipe],
					intercepters: [ZeroIntercepter],
					errorHandler: ErrorHostHandler,
					serviceName: 'test-service',
					messagesTimeout: 2000,
				}),
				RMQModule.forRoot({
					name: 'test2',
					exchangeName: 'test2',
					connections: [
						{
							login: 'guest',
							password: 'guest',
							host: 'localhost',
						},
					],
					queueName: '', // random exclusive
					heartbeatIntervalInSeconds: 10,
					prefetchCount: 10,
					middleware: [DoublePipe],
					intercepters: [ZeroIntercepter],
					errorHandler: ErrorHostHandler,
					serviceName: 'test-service',
					messagesTimeout: 2000,
				}),
				RMQModule.forRootAsync(
					{
						imports: [],
						inject: [],
						name: 'test3',
						useFactory: () => (
							{
								exchangeName: 'test3',
								connections: [
									{
										login: 'guest',
										password: 'guest',
										host: 'localhost',
									},
								],
								queueName: 'test-queue3',
								heartbeatIntervalInSeconds: 10,
								prefetchCount: 10,
								middleware: [DoublePipe],
								intercepters: [ZeroIntercepter],
								errorHandler: ErrorHostHandler,
								serviceName: 'test-service',
								messagesTimeout: 2000,
							}
						)
					}
				),
				{
					// uses test3 implicitly and test2 explicitly
					imports: [
						RMQModule.forFeature('test3')
					],
					controllers: [OverrideController],
					module: class OverrideRMQModule { },
				},
				{
					// uses default implicitly and test2 explicitly
					imports: [],
					controllers: [ApiFeatureController],
					module: class SampleRMQModule { },
				}
			],
			controllers: [MicroserviceController],
		}).compile();
		api = apiModule.createNestApplication();
		await api.init();

		apiController = apiModule.get<ApiFeatureController>(ApiFeatureController);
		overrideController = apiModule.get<ApiFeatureController>(OverrideController);
		microserviceController = apiModule.get<MicroserviceController>(MicroserviceController);
		rmqServiceDefault = apiController.rmqImplicitInject;
		rmqServiceTest2 = apiController.rmqExplicitInject;
		rmqServiceTest3 = overrideController.rmqImplicitInject;
		console.warn = jest.fn();
		console.log = jest.fn();
	});

	describe('rpc', () => {
		it('check name', async () => {
			expect(apiController.rmqImplicitInject.name).toBe(DEFAULT_SERVICE_NAME);
			expect(apiController.rmqExplicitInject.name).toBe('test2');

			expect(overrideController.rmqImplicitInject.name).toBe('test3');
			expect(overrideController.rmqExplicitInject.name).toBe('test2');
		});

		it('check connection', async () => {
			const isConnected = rmqServiceDefault.healthCheck();
			expect(isConnected).toBe(true);

			const isConnected2 = rmqServiceTest2.healthCheck();
			expect(isConnected2).toBe(true);

			const isConnected3 = rmqServiceTest3.healthCheck();
			expect(isConnected3).toBe(true);
		});

		it('default: successful send()', async () => {
			const { result } = await apiController.sumSuccess([1, 2, 3]);
			expect(result).toBe(6);
		});

		it('default: request validation failed', async () => {
			try {
				await apiController.sumFailed(['a', 'b', 'c']);
				expect(true).toBe(false);
			} catch (error) {
				expect(error.message).toBe(
					'each value in arrayToSum must be a number conforming to the specified constraints',
				);
				expect(error.type).toBeUndefined();
				expect(error.code).toBeUndefined();
				expect(error.data).toBeUndefined();
				expect(error.service).toBe('test-service');
				expect(error.host).not.toBeNull();
			}
		});

		it('test2: successful send()', async () => {
			const { result } = await apiController.sumSuccess2([-10, 8, -9, 5]);
			expect(result).toBe(-6);
		});

		it('test2: request validation failed', async () => {
			try {
				await apiController.sumFailed2(['a', 'b', 'c']);
				expect(true).toBe(false);
			} catch (error) {
				expect(error.message).toBe(
					'each value in arrayToSum must be a number conforming to the specified constraints',
				);
				expect(error.type).toBeUndefined();
				expect(error.code).toBeUndefined();
				expect(error.data).toBeUndefined();
				expect(error.service).toBe('test-service');
				expect(error.host).not.toBeNull();
			}
		});

		it('override - test3: successful send()', async () => {
			const { result } = await overrideController.sumSuccess([1, 2, -1]);
			expect(result).toBe(2);
		});

		it('override - test3: error thrown by microservice', async () => {
			try {
				await overrideController.sumSuccess([1, 2, 3]);
				expect(true).toBe(false);
			} catch (error) {
				expect(error.message).toBe(
					'Do I look like a calculator to you?',
				);
				expect(error.type).toBeUndefined();
				expect(error.code).toBeUndefined();
				expect(error.data).toBeUndefined();
				expect(error.service).toBe('test-service');
				expect(error.host).not.toBeNull();
			}
		});

		it('override - test2: successful send()', async () => {
			const { result } = await overrideController.sumSuccess2([-10, 8, -9, 5]);
			expect(result).toBe(-6);
		});

		it('override - test2: request validation failed', async () => {
			try {
				await overrideController.sumFailed2(['a', 'b', 'c']);
				expect(true).toBe(false);
			} catch (error) {
				expect(error.message).toBe(
					'each value in arrayToSum must be a number conforming to the specified constraints',
				);
				expect(error.type).toBeUndefined();
				expect(error.code).toBeUndefined();
				expect(error.data).toBeUndefined();
				expect(error.service).toBe('test-service');
				expect(error.host).not.toBeNull();
			}
		});
	});

	describe('none', () => {
		it('default: successful notify()', async () => {
			const res = await apiController.notificationSuccess('SECRETMESSAGE');
			await delay(1000);
			expect(console.log).toBeCalledTimes(1);
			expect(console.log).toHaveBeenCalledWith('SECRETMESSAGE');
			expect(res).toBeUndefined();
			jest.clearAllMocks();
		});

		it('default: notify validation failed', async () => {
			const res = await apiController.notificationFailed(0);
			expect(console.log).toBeCalledTimes(0);
			expect(res).toBeUndefined();
			expect(res).toBeUndefined();
		});

		it('test2: successful notify()', async () => {
			const res = await apiController.notificationSuccess2('SECRETMESSAGE2');
			await delay(1000);
			expect(console.log).toBeCalledTimes(2);
			expect(console.log).toHaveBeenCalledWith('SECRETMESSAGE2');
			expect(console.log).toHaveBeenCalledWith('test2');
			expect(res).toBeUndefined();
			jest.clearAllMocks();
		});

		it('test2: notify validation failed', async () => {
			const res = await apiController.notificationFailed2(0);
			expect(console.log).toBeCalledTimes(0);
			expect(res).toBeUndefined();
			expect(res).toBeUndefined();
		});

		it('override - test3: successful notify()', async () => {
			const res = await overrideController.notificationSuccess('SECRETMESSAGE3');
			await delay(1000);
			expect(console.log).toBeCalledTimes(2);
			expect(console.log).toHaveBeenCalledWith('SECRETMESSAGE3');
			expect(console.log).toHaveBeenCalledWith('test3');
			expect(res).toBeUndefined();
			jest.clearAllMocks();
		});

		it('override - test2: successful notify()', async () => {
			const res = await overrideController.notificationSuccess2('SECRETMESSAGE4');
			await delay(1000);
			expect(console.log).toBeCalledTimes(2);
			expect(console.log).toHaveBeenCalledWith('SECRETMESSAGE4');
			expect(console.log).toHaveBeenCalledWith('test2');
			expect(res).toBeUndefined();
			jest.clearAllMocks();
		});
	});

	afterAll(async () => {
		await delay(500);
		await rmqServiceDefault.disconnect();
		await rmqServiceTest2.disconnect();
		await rmqServiceTest3.disconnect();
		await api.close();
		await delay(500);
	});
});

async function delay(time: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, time);
	});
}
