import { RMQService } from './rmq.service';
import { RMQMetadataAccessor } from './rmq-metadata.accessor';
import { Reflector } from '@nestjs/core';
import { RmqErrorService } from './rmq-error.service';

describe('RMQService', () => {
	let rmqService: RMQService;

	beforeEach(async () => {
		const accessor = new RMQMetadataAccessor(new Reflector());
		const errorService = new RmqErrorService({
			exchangeName: 'test',
			connections: [],
		});
		rmqService = new RMQService(
			{
				exchangeName: 'test',
				serviceName: '',
				connections: [],
			},
			accessor,
			errorService
		);
		rmqService['routes'] = ['exect.match.rpc', '*.*.star', '#.hash', 'pattent.#'];
	});

	describe('Test regex', () => {
		it('Matching', async () => {
			const res = rmqService['getRouteByTopic']('exect.match.rpc');
			expect(res).toBe(rmqService['routes'][0]);
		});

		it('Pattern * - success', async () => {
			const res = rmqService['getRouteByTopic']('oh.thisis.star');
			expect(res).toBe(rmqService['routes'][1]);
		});

		it('Pattern * - fail', async () => {
			const res = rmqService['getRouteByTopic']('oh.this.is.star');
			expect(res).toBe(undefined);
		});

		it('Pattern # - success start', async () => {
			const res = rmqService['getRouteByTopic']('this.is.real.hash');
			expect(res).toBe(rmqService['routes'][2]);
		});

		it('Pattern # - success end', async () => {
			const res = rmqService['getRouteByTopic']('pattent.topic');
			expect(res).toBe(rmqService['routes'][3]);
		});

		it('Pattern # - fail', async () => {
			const res = rmqService['getRouteByTopic']('this.pattent.topic');
			expect(res).toBe(undefined);
		});
	});
});
