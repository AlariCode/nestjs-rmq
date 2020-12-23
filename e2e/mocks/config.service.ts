import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
	getHost() {
		return '192.168.1.35';
	}
}
