import { Logger, LoggerService } from '@nestjs/common';
import { blueBright, white, yellow } from 'chalk';

export class RQMColorLogger implements LoggerService {
	logMessages: boolean;

	constructor(logMessages: boolean) {
		this.logMessages = logMessages ?? false;
	}
	log(message: any, context?: string): any {
		Logger.log(message, context);
	}
	error(message: any, trace?: string, context?: string): any {
		Logger.error(message, trace, context);
	}
	debug(message: any, context?: string): any {
		if (!this.logMessages) {
			return;
		}
		const msg = JSON.stringify(message);
		const action = context.split(',')[0];
		const topic = context.split(',')[1];
		Logger.log(`${blueBright(action)} [${yellow(topic)}] ${white(msg)}`);
		console.warn(`${blueBright(action)} [${yellow(topic)}] ${white(msg)}`)
	}
	warn(message: any, context?: string): any {
		Logger.warn(message, context);
	}
}
