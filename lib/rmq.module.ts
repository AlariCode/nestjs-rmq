import { RMQService } from './rmq.service';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { IRMQServiceAsyncOptions, IRMQServiceOptions } from './interfaces/rmq-options.interface';
import { DEFAULT_SERVICE_NAME } from './constants';
import { RMQGlobalModule } from './rmq-global.module';
import { getServiceToken } from './utils/get-service-token';

@Module({})
export class RMQModule {
	static forRoot(options: IRMQServiceOptions): DynamicModule {
		return {
			module: RMQModule,
			imports: [RMQGlobalModule.forRoot(options)],
		};
	}

	static forRootAsync(options: IRMQServiceAsyncOptions): DynamicModule {
		return {
			module: RMQModule,
			imports: [RMQGlobalModule.forRootAsync(options)],
		};
	}

	static forTest(options: Partial<IRMQServiceOptions>): DynamicModule {
		return {
			module: RMQModule,
			imports: [RMQGlobalModule.forTest(options)],
		};
	}

	static forFeature(
		serviceName: string = DEFAULT_SERVICE_NAME
	): DynamicModule {
		// redirect service by overriding the name,
		// might result in competing instances,
		// but is easy for converting codes already in the wild
		// not great, not terrible
		const provider: Provider = {
			provide: RMQService,
			useFactory: (service: RMQService) => service,
			inject: [getServiceToken(serviceName)],
		};

		return {
			module: RMQModule,
			providers: [provider],
			exports: [provider],
		};
	}
}
