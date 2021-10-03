import { Global, Module } from '@nestjs/common';
import { RMQMetadataAccessor } from './rmq-metadata.accessor';
import { RMQExplorer } from './rmq.explorer';
import { DiscoveryModule } from '@nestjs/core';

@Global()
@Module({
	imports: [DiscoveryModule],
	providers: [RMQMetadataAccessor, RMQExplorer],
	exports: [RMQMetadataAccessor, RMQExplorer],
})
export class RMQExplorerModule {}
