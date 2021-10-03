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
			connections: []
		});
		rmqService = new RMQService({
			exchangeName: 'test',
			serviceName: '',
			connections: []
		}, accessor, errorService);
		rmqService['routeKeys'] = [
			'Default:exect.match.rpc',
			'Default:*.*.star',
			'Default:#.hash',
			'Default:pattent.#',
		];
	});


	describe('Test regex', () => {
		it('Matching', async () => {
			const res = rmqService['getRouteKeyByTopic']('exect.match.rpc');
			expect(res).toBe(rmqService['routeKeys'][0]);
		});

		it('Pattern * - success', async () => {
			const res = rmqService['getRouteKeyByTopic']('oh.thisis.star');
			expect(res).toBe(rmqService['routeKeys'][1]);
		});

		it('Pattern * - fail', async () => {
			const res = rmqService['getRouteKeyByTopic']('oh.this.is.star');
			expect(res).toBe(undefined);
		});

		it('Pattern # - success start', async () => {
			const res = rmqService['getRouteKeyByTopic']('this.is.real.hash');
			expect(res).toBe(rmqService['routeKeys'][2]);
		});

		it('Pattern # - success end', async () => {
			const res = rmqService['getRouteKeyByTopic']('pattent.topic');
			expect(res).toBe(rmqService['routeKeys'][3]);
		});

		it('Pattern # - fail', async () => {
			const res = rmqService['getRouteKeyByTopic']('this.pattent.topic');
			expect(res).toBe(undefined);
		});
	});
});