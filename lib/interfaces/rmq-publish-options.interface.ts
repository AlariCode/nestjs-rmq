import { Options } from 'amqplib';
export interface IPublishOptions extends Options.Publish {
	timeout?: number;
}
