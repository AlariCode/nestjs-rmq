import { MessageFields, MessageProperties, Message } from 'amqplib';

export class ExtendedMessage implements Message {
	content: Buffer;
	fields: MessageFields;
	properties: MessageProperties;

	constructor(msg: Message) {
		this.content = msg.content;
		this.fields = msg.fields;
		this.properties = msg.properties;
	}

	public getDebugString(): string {
		try {
			const content = JSON.parse(this.content.toString());
			const debugMsg = {
				fields: this.fields,
				properties: this.properties,
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
