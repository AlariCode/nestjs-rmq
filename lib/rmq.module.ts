import { RMQService } from './rmq.service';
import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { IRMQServiceAsyncOptions, IRMQServiceOptions } from './interfaces/rmq-options.interface';
import { RMQMetadataAccessor } from './rmq-metadata.accessor';
import { RMQExplorer } from './rmq.explorer';
import { DiscoveryModule } from '@nestjs/core';
import { RMQ_MODULE_OPTIONS } from './constants';
import { RmqErrorService } from './rmq-error.service';
import { RMQTestService } from './rmq-test.service';

@Global()
@Module({
	imports: [DiscoveryModule],
	providers: [RMQMetadataAccessor, RMQExplorer, RmqErrorService]
})
export class RMQModule {
	static forRoot(options: IRMQServiceOptions): DynamicModule {
		return {
			module: RMQModule,
			providers: [RMQService, { provide: RMQ_MODULE_OPTIONS, useValue: options }],
			exports: [RMQService],
		};
	}

	static forRootAsync(options: IRMQServiceAsyncOptions): DynamicModule {
		const asyncOptions = this.createAsyncOptionsProvider(options);
		return {
			module: RMQModule,
			imports: options.imports,
			providers: [RMQService, RMQMetadataAccessor, RMQExplorer, asyncOptions],
			exports: [RMQService],
		};
	}

	static forTest(options: Partial<IRMQServiceOptions>) {
		return {
			module: RMQModule,
			providers: [{
				provide: RMQService,
				useClass: RMQTestService
			}, { provide: RMQ_MODULE_OPTIONS, useValue: options }],
			exports: [RMQService],
		};
	}

	private static createAsyncOptionsProvider<T>(options: IRMQServiceAsyncOptions): Provider {
		return {
			provide: RMQ_MODULE_OPTIONS,
			useFactory: async (...args: any[]) => {
				const config = await options.useFactory(...args);
				return config;
			},
			inject: options.inject || [],
		};
	}
}
