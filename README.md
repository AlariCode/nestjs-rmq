# NestJS - RabbitMQ custom strategy

![alt cover](https://github.com/AlariCode/nestjs-rmq/raw/master/img/logo.jpg)

[![npm version](https://badgen.net/npm/v/nestjs-rmq)](https://www.npmjs.com/package/nestjs-rmq)
[![npm version](https://badgen.net/npm/license/nestjs-rmq)](https://www.npmjs.com/package/nestjs-rmq)
[![npm version](https://badgen.net/github/open-issues/AlariCode/nestjs-rmq)](https://github.com/AlariCode/nestjs-rmq/issues)
[![npm version](https://badgen.net/github/prs/AlariCode/nestjs-rmq)](https://github.com/AlariCode/nestjs-rmq/pulls)

This library will take care of RPC requests and messaging between microservices. It is easy to bind to our existing controllers to RMQ routes. This version is only for NestJS. If you want a framework agnostic library you can use [rabbitmq-messages](https://github.com/AlariCode/rabbitmq-messages)

## Start

First, install the package:

```bash
npm i nestjs-rmq
```

Setup your connection in root module:

```javascript
import { RMQModule } from 'nestjs-rmq';

@Module({
	imports: [
		RMQModule.forRoot({
			exchangeName: configService.get('AMQP_EXCHANGE'),
			connections: [
				{
					login: configService.get('AMQP_LOGIN'),
					password: configService.get('AMQP_PASSWORD'),
					host: configService.get('AMQP_HOST'),
				},
			],
		}),
	],
})
export class AppModule {}
```

In forRoot() you pass connection options =:

-   **exchangeName** (string) - Exchange that will be used to send messages to.
-   **connections** (Object[]) - Array of connection parameters. You can use RQM cluster by using multiple connections.

Additionally, you can use optional parameters:

-   **queueName** (string) - Queue name which your microservice would listen and bind topics specified in '@RMQRoute' decorator to this queue. If this parameter is not specified, your microservice could send messages and listen to reply or send notifications, but it couldn't get messages or notifications from other services.
    Example:

```javascript
{
	exchangeName: 'my_exchange',
	connections: [
		{
			login: 'admin',
			password: 'admin',
			host: 'localhost',
		},
	],
	queueName: 'my-service-queue',
}
```

-   **prefetchCount** (boolean) - You can read more [here](https://github.com/postwait/node-amqp).
-   **isGlobalPrefetchCount** (boolean) - You can read more [here](https://github.com/postwait/node-amqp).
-   **reconnectTimeInSeconds** (number) - Time in seconds before reconnection retry. Default is 5 seconds.
-   **queueArguments** (object) - You can read more about queue parameters [here](https://www.rabbitmq.com/parameters.html).
-   **messagesTimeout** (number) - Number of milliseconds 'post' method will wait for the response before a timeout error. Default is 30 000.
-   **isQueueDurable** (boolean) - Makes created queue durable. Default is true.
-   **isExchangeDurable** (boolean) - Makes created exchange durable. Default is true.
-   **logMessages** (boolean) - Enable printing all sent and recieved messages in console with its route and content. Default is false.

## Sending messages

To send message with RPC topic use send() method in your controller or service:

```javascript
@Injectable()
export class ProxyUpdaterService {
    constructor(
        private readonly rmqService: RMQService,
	) {}

	myMethod() {
		this.rmqService.send<number[], number>('sum.rpc', [1, 2, 3]);
	}
}
```

This method returns a Promise. First type - is a type you send, and the second - you recive.

-   'sum.rpc' - name of subscription topic that you are sending to.
-   [1, 2, 3] - data payload.
    To get a reply:

```javascript
this.rmqService.send<number[], number>('sum.rpc', [1, 2, 3]).then(reply => {
	//...
});
```

If you want to just notify services:

```javascript
this.rmqService.notify < string > ('info.none', 'My data');
```

This method returns a Promise.

-   'info.none' - name of subscription topic that you are notifying.
-   'My data' - data payload.

## Recieving messages

To listen for messages bind your controller methods to subscription topics with **RMQRoute()** decorator and you controller to **@RQMController()**:

```javascript
@RQMController()
export class AppController {
	//...

	@RMQRoute('sum.rpc')
	sum(numbers: number[]): number {
		return numbers.reduce((a, b) => a + b, 0);
	}

	@RMQRoute('info.none')
	info(data: string) {
		console.log(data);
	}
}
```

Return value will be send back as a reply in RPC topic. In 'sum.rpc' example it will send sum of array values. And sender will get `6`:

```javascript
this.rmqService.send('sum.rpc', [1, 2, 3]).then(reply => {
	// reply: 6
});
```

Each '@RMQRoute' topic will be automatically bound to queue specified in 'queueName' option. If you want to return an Error just throw it in your method:

```javascript
@RMQRoute('my.rpc')
myMethod(numbers: number[]): number {
	//...
	throw new Error('Error message')
	//...
}
```

## Disconnecting

If you want to close connection, for example, if you are using RMQ in testing tools, use `disconnect()` method;
