import { Test } from '@nestjs/testing';
import { RMQModule, RMQService } from '../../lib';
import { INestApplication } from '@nestjs/common';
import { MicroserviceController } from '../mocks/microservice.controller';
import {
	AppIdContracts,
	CustomMessageFactoryContracts,
	DivideContracts,
	MultiplyContracts,
	PatternHashContracts,
	PatternStarContracts,
	SumContracts
} from '../contracts/mock.contracts';
import { ERROR_UNDEFINED_FROM_RPC } from '../../lib/constants';
import { DoublePipe } from '../mocks/double.pipe';
import { ZeroIntercepter } from '../mocks/zero.intercepter';
import { RMQTestService } from '../../lib/rmq-test.service';

describe('RMQe2e forTest()', () => {
	let api: INestApplication;
	let rmqService: RMQTestService;

	beforeAll(async () => {
		const apiModule = await Test.createTestingModule({
			imports: [
				RMQModule.forTest({
					serviceName: 'test-service',
					middleware: [DoublePipe],
					intercepters: [ZeroIntercepter],
				})
			],
			controllers: [MicroserviceController],
		}).compile();
		api = apiModule.createNestApplication();
		await api.init();

		rmqService = apiModule.get(RMQService);
	});

	describe('Running methods', () => {
		it('successful send()', async () => {
			const { result } = await rmqService.triggerRoute<SumContracts.Request, SumContracts.Response>(SumContracts.topic, {
				arrayToSum: [1, 2, 3]
			});
			expect(result).toEqual(6);
		});
		it('successful appId from message', async () => {
			const { appId } = await rmqService.triggerRoute<null, AppIdContracts.Response>(AppIdContracts.topic, null);
			expect(appId).toBe('test-service');
		});
		it('request validation failed', async () => {
			try {
				await rmqService.triggerRoute<any, SumContracts.Response>(SumContracts.topic, {
					arrayToSum: ['a', 'b', 'c']
				});
				expect(true).toBe(false);
			} catch (error) {
				expect(error.message).toBe(
					'each value in arrayToSum must be a number conforming to the specified constraints',
				);
			}
		});
		it('get common Error from method', async () => {
			try {
				const { result } = await rmqService.triggerRoute<any, SumContracts.Response>(SumContracts.topic, {
					arrayToSum: [0, 0, 0]
				});
				expect(result).not.toBe(0);
			} catch (error) {
				expect(error.message).toBe('My error from method');
			}
		});
		it('get RMQError from method', async () => {
			try {
				const { result } = await rmqService.triggerRoute<any, SumContracts.Response>(SumContracts.topic, {
					arrayToSum: [-1, 0, 0]
				});
				expect(result).not.toBe(-1);
			} catch (error) {
				expect(error.message).toBe('My RMQError from method');
				expect(error.type).toBe('RMQ');
				expect(error.code).toBe(0);
				expect(error.data).toBe('data');
			}
		});
		it('get undefined return Error', async () => {
			try {
				const { result } = await rmqService.triggerRoute<any, SumContracts.Response>(SumContracts.topic, {
					arrayToSum: [-11, 0, 0]
				});
				expect(result).not.toBe(-11);
			} catch (error) {
				expect(error.message).toBe(ERROR_UNDEFINED_FROM_RPC);
				expect(error.code).toBeUndefined();
				expect(error.data).toBeUndefined();
			}
		});
	});

	describe('Mock results', () => {
		it('Mock reply', async () => {
			const res = { a: 1 };
			const topic = 'a';
			rmqService.mockReply(topic, res);
			const data = await rmqService.send(topic, '');
			expect(data).toEqual(res);
		});

		it('Mock error', async () => {
			const error = new Error('error');
			const topic = 'a';
			rmqService.mockError(topic, error);
			try {
				const data = await rmqService.send(topic, '');
				expect(true).toBeFalsy();
			} catch (e) {
				expect(e.message).toEqual('error');
			}
		});
	});

	describe('middleware', () => {
		it('doublePipe', async () => {
			const { result } = await rmqService.triggerRoute<
				MultiplyContracts.Request,
				MultiplyContracts.Response
				>(
					MultiplyContracts.topic,
					{
				arrayToMultiply: [1, 2]
					}
				);
			expect(result).toBe(8);
		});
	});

	describe('interceptor', () => {
		it('zeroInterceptor', async () => {
			const { result } = await rmqService.triggerRoute<
				DivideContracts.Request,
				DivideContracts.Response
				>(
					DivideContracts.topic,
					{
				first: 10,
				second: 5
				}
				);
			expect(result).toBe(0);
		});
	});

	describe('msgFactory', () => {
		it('customMessageFactory', async () => {
			const { num, appId } = await rmqService.triggerRoute<
				CustomMessageFactoryContracts.Request,
				CustomMessageFactoryContracts.Response
			>(
				CustomMessageFactoryContracts.topic,
				{
				num: 1
				}
			);
			expect(num).toBe(2);
			expect(appId).toBe('test-service');
		});
	});

	describe('msgPattent', () => {
		it('* pattern', async () => {
			const { num } = await rmqService.triggerRoute<
				PatternStarContracts.Request,
				PatternStarContracts.Response
			>(
				PatternStarContracts.topic,
				{
				num: 1
				}
			);
			expect(num).toBe(1);
		});

		it('# pattern', async () => {
			const { num } = await rmqService.triggerRoute<
				PatternHashContracts.Request,
				PatternHashContracts.Response
			>(
				PatternHashContracts.topic,
				{
					num: 1
				}
			);
			expect(num).toBe(1);
		});
	});

	afterAll(async () => {
		await api.close();
	});
});
