import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
	getHost() {
		return 'localhost';
	}
}
