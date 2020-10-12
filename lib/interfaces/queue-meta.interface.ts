export interface IQueueMeta {
	topic: string;
	methodName: string;
	target: any;
	ackOnRead: boolean;
}
