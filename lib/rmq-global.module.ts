import { RMQService } from './rmq.service';
import { DynamicModule, Global, Inject, Module, Provider } from '@nestjs/common';
import { IRMQServiceAsyncOptions, IRMQServiceOptions } from './interfaces/rmq-options.interface';
import { RMQMetadataAccessor } from './rmq-metadata.accessor';
import { RMQ_MODULE_OPTIONS } from './constants';
import { RmqErrorService } from './rmq-error.service';
import { RMQTestService } from './rmq-test.service';
import { getErrorServiceToken, getServiceToken } from './utils/get-service-token';
import { RMQExplorerModule } from './rmq-explorer.module';
import { DiscoveryModule } from '@nestjs/core';

@Global()
@Module(
	{
		imports: [DiscoveryModule]
	}
)
export class RMQGlobalModule {
	static forRoot(options: IRMQServiceOptions): DynamicModule {
		const optionsProvider: Provider = {
			provide: RMQ_MODULE_OPTIONS,
			useValue: options,
		};

		const errorServiceProvider: Provider = {
			provide: getErrorServiceToken(options.name),
			useValue: new RmqErrorService(options),
		};

		const serviceProvider: Provider = {
			provide: getServiceToken(options.name),
			useFactory: async (
				metadataAccessor: RMQMetadataAccessor,
				errorService: RmqErrorService
			) => new RMQService(options, metadataAccessor, errorService),
			inject: [RMQMetadataAccessor, getErrorServiceToken(options.name)]
		};

		return {
			module: RMQGlobalModule,
			providers: [
				errorServiceProvider,
				serviceProvider,
				optionsProvider,
			],
			exports: [serviceProvider],
			imports: [RMQExplorerModule]
		};
	}

	static forRootAsync(asyncOptions: IRMQServiceAsyncOptions): DynamicModule {
		const errorServiceProvider = {
			provide: getErrorServiceToken(asyncOptions.name),
			useFactory: async (options: IRMQServiceOptions,) => new RmqErrorService(options),
			inject: [RMQ_MODULE_OPTIONS]
		};

		const serviceProvider = {
			provide: getServiceToken(asyncOptions.name),
			useFactory: async (
				options: IRMQServiceOptions,
				metadataAccessor: RMQMetadataAccessor,
				errorService: RmqErrorService
			) => new RMQService(options, metadataAccessor, errorService),
			inject: [RMQ_MODULE_OPTIONS, RMQMetadataAccessor, getErrorServiceToken(asyncOptions.name)],
		};

		const asyncProvider = RMQGlobalModule.createAsyncOptionsProvider(asyncOptions);
		return {
			module: RMQGlobalModule,
			providers: [
				asyncProvider,
				errorServiceProvider,
				serviceProvider
			],
			exports: [serviceProvider],
			imports: [RMQExplorerModule, ...(asyncOptions.imports ?? [])]
		};
	}

	static forTest(options: Partial<IRMQServiceOptions>): DynamicModule {
		const optionsProvider = {
			provide: RMQ_MODULE_OPTIONS,
			useValue: options,
		};

		const serviceProvider = {
			provide: getServiceToken(options.name),
			useFactory: async (
				metadataAccessor: RMQMetadataAccessor
			) => new RMQTestService(options as IRMQServiceOptions, metadataAccessor),
			inject: [RMQMetadataAccessor]
		};

		return {
			module: RMQGlobalModule,
			providers: [
				serviceProvider,
				optionsProvider
			],
			exports: [serviceProvider],
			imports: [RMQExplorerModule]
		};
	}

	private static createAsyncOptionsProvider<T>(options: IRMQServiceAsyncOptions): Provider {
		return {
			provide: RMQ_MODULE_OPTIONS,
			useFactory: async (...args: any[]): Promise<IRMQServiceOptions> => {
				const config = await options.useFactory(...args);
				return {
					...config,
					name: options.name,
				};
			},
			inject: options.inject || [],
		};
	}
}
