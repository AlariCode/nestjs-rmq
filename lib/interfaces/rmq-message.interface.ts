import { Message } from 'amqplib';

export interface IRMQMessage extends Message {
   serviceName: string;
}