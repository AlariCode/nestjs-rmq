import { DEFAULT_SERVICE_NAME } from '../constants';

export const getRouteKey = (pathOrTopic: string, serviceName: string = DEFAULT_SERVICE_NAME): string => {
	return `${serviceName}:${pathOrTopic}`;
};

export const getTopic = (routeKey: string): string => {
	const index = routeKey.indexOf(':');
	if (index < 0) {
		return routeKey;
	}

	return routeKey.substr(index + 1);
};