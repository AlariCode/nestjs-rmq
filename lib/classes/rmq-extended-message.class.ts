import { MessageFields, MessageProperties, Message } from 'amqplib';
import { IRMQMessage } from '../interfaces/rmq-message.interface';

export class ExtendedMessage implements IRMQMessage {
   content: Buffer;
   fields: MessageFields;
   properties: MessageProperties;
   serviceName: string;

   constructor(msg: IRMQMessage) {
		this.content = msg.content;
		this.fields = msg.fields;
		this.properties = msg.properties;
		this.serviceName = msg.serviceName;
   }

   public getDebugString(): string {
		try {
			const content = JSON.parse(this.content.toString());
			const debugMsg = {
			fields: this.fields,
			properties: this.properties,
			serviceName: this.serviceName,
			message: this.maskBuffers(content),
			};
			return JSON.stringify(debugMsg);
		} catch (e) {
			return e.message;
		}
   }

   private maskBuffers(obj: any) {
		const result: any = {};
		for (const prop in obj) {
			if (obj[prop].type === 'Buffer') {
			result[prop] = 'Buffer - length ' + (obj[prop].data as Buffer).length;
			} else {
			result[prop] = obj[prop];
			}
		}
		return result;
   }
}