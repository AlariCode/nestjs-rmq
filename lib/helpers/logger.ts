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
		if(!this.logMessages) {
			return;
		}
		const split = new RegExp(/(.*?)(\[.*?])(.*)/g).exec(message);
		if(split[3]) {
			Logger.log(`${blueBright(split[1])} ${yellow(split[2])} ${white(split[3])}`);
		} else {
			Logger.log(message, context);
		}
	}
	warn(message: any, context?: string): any {
		Logger.warn(message, context);
	}
}
