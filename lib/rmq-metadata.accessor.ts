import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
	RMQ_ROUTES_PATH,
	RMQ_ROUTES_OPTIONS,
	RMQ_ROUTES_META,
	RMQ_MESSAGE_META
} from './constants';
import { IRouteOptions } from './interfaces/queue-meta.interface';
import { RMQService } from './rmq.service';

@Injectable()
export class RMQMetadataAccessor {
	constructor(private readonly reflector: Reflector) {}

	getRMQPath(target: Function): string | undefined {
		return this.reflector.get(RMQ_ROUTES_PATH, target);
	}

	getAllRMQPaths(): string[] {
		return Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
	}

	addRMQPath(path: string): void {
		const paths: string[] = Reflect.getMetadata(RMQ_ROUTES_META, RMQService) ?? [];
		paths.push(path);
		Reflect.defineMetadata(RMQ_ROUTES_META, paths, RMQService);
	}

	getRMQOptions(target: Function): IRouteOptions | undefined {
		return this.reflector.get(RMQ_ROUTES_OPTIONS, target);
	}

	getRMQMessageIndexes(target: any, method: string): number[] {
		return Reflect.getOwnMetadata(RMQ_MESSAGE_META, target, method) ?? [];
	}
}