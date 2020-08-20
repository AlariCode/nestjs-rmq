import { RMQService } from './rmq.service';
import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { IRMQServiceAsyncOptions, IRMQServiceOptions } from './interfaces/rmq-options.interface';

@Global()
@Module({})
export class RMQModule {
	static forRoot(options: IRMQServiceOptions): DynamicModule {
		const rmqServiceProvider = {
			provide: RMQService,
			useFactory: async (): Promise<RMQService> => {
				const RMQInstance = new RMQService(options);
				await RMQInstance.init();
				return RMQInstance;
			},
		};
		return {
			module: RMQModule,
			providers: [rmqServiceProvider],
			exports: [rmqServiceProvider],
		};
	}

	static forRootAsync(options: IRMQServiceAsyncOptions): DynamicModule {
		const rmqServiceProvider = this.createAsyncOptionsProvider(options);
		return {
			module: RMQModule,
			imports: options.imports,
			providers: [rmqServiceProvider],
			exports:[rmqServiceProvider]
		};
	}

	private static createAsyncOptionsProvider<T>(
		options: IRMQServiceAsyncOptions,
	): Provider {
		return {
			provide: RMQService,
			useFactory: async (...args: any[]) => {
				const config = await options.useFactory(...args);
				const RMQInstance = new RMQService(config);
				await RMQInstance.init();
				return RMQInstance;
			},
			inject: options.inject || [],
		};
	}
}
