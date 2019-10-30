import { RMQService } from './rmq.service';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { IRMQServiceOptions } from './interfaces/rmq-options.interface';

@Global()
@Module({})
export class RMQModule {
	static forRoot(options: IRMQServiceOptions): DynamicModule {
		const rmqServiceProvider = {
			provide: RMQService,
			useFactory: async (): Promise<RMQService> => {
				return new RMQService(options);
			},
		};
		return {
			module: RMQModule,
			providers: [rmqServiceProvider],
			exports: [rmqServiceProvider],
		};
	}
}
