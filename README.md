# NestJS - RabbitMQ custom strategy

![alt cover](https://github.com/AlariCode/nestjs-rmq/raw/master/img/new-logo.jpg)

**More NestJS libs on [alariblog.ru](https://alariblog.ru)**

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
import { RMQModule } from 'nestjs-tests';

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

In forRoot() you pass connection options:

-   **exchangeName** (string) - Exchange that will be used to send messages to.
-   **connections** (Object[]) - Array of connection parameters. You can use RMQ cluster by using multiple connections.

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
-   **heartbeatIntervalInSeconds** (number) - Interval to send heartbeats to broker. Defaults to 5 seconds.
-   **queueArguments** (object) - You can read more about queue parameters [here](https://www.rabbitmq.com/parameters.html).
-   **messagesTimeout** (number) - Number of milliseconds 'post' method will wait for the response before a timeout error. Default is 30 000.
-   **isQueueDurable** (boolean) - Makes created queue durable. Default is true.
-   **isExchangeDurable** (boolean) - Makes created exchange durable. Default is true.
-   **logMessages** (boolean) - Enable printing all sent and recieved messages in console with its route and content. Default is false.
-   **logger** (LoggerService) - Your custom logger service that implements `LoggerService` interface. Compatible with Winston and other loggers.
-   **middleware** (array) - Array of middleware functions that extends `RMQPipeClass` with one method `transform`. They will be triggered right after recieving message, before pipes and controller method. Trigger order is equal to array order.
-   **errorHandler** (class) - custom error handler for dealing with errors from replies, use `errorHandler` in module options and pass  class that extends `RMQErrorHandler`.
-   **serviceName** (string) - service name for debugging.

```javascript
class LogMiddleware extends RMQPipeClass {
	async transfrom(msg: Message): Promise<Message> {
		console.log(msg);
		return msg;
	}
}
```

-   **intercepters** (array) - Array of intercepter functions that extends `RMQIntercepterClass` with one method `intercept`. They will be triggered before replying on any message. Trigger order is equal to array order.

```javascript
export class MyIntercepter extends RMQIntercepterClass {
	async intercept(res: any, msg: Message, error: Error): Promise<any> {
		// res - response body
		// msg - initial message we are replying to
		// error - error if exists or null
		return res;
	}
}
```

Config example with middleware and intercepters:

```javascript
import { RMQModule } from 'nestjs-tests';

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
			middleware: [LogMiddleware],
			intercepters: [MyIntercepter],
		}),
	],
})
export class AppModule {}
```

## Async initialization

If you want to inject dependency into RMQ initialization like Configuration service, use `forRootAsync`:

```javascript
import { RMQModule } from 'nestjs-tests';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';

@Module({
	imports: [
		RMQModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return {
                    exchangeName: 'test',
                    connections: [
                        {
                            login: 'guest',
                            password: 'guest',
                            host: configService.getHost(),
                        },
                    ],
                    queueName: 'test',
                }
            }
        }),
	],
})
export class AppModule {}
```
- **useFactory** - returns `IRMQServiceOptions`.
- **imports** - additional modules for configuration.
- **inject** - additional services for usage inside useFactory.

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
this.rmqService.send<number[], number>('sum.rpc', [1, 2, 3])
    .then(reply => {
        //...
    })
    .catch(error: RMQError => {
        //...
    });
```
Also you can use send options:

```javascript
this.rmqService.send<number[], number>('sum.rpc', [1, 2, 3], {
    expiration: 1000,
    priority: 1,
    persistent: true,
    timeout: 30000
})
```
-   **expiration** - if supplied, the message will be discarded from a queue once it’s been there longer than the given number of milliseconds.
-   **priority** - a priority for the message.
-   **persistent** - if truthy, the message will survive broker restarts provided it’s in a queue that also survives restarts.
-   **timeout** - if supplied, the message will have its own timeout.

If you want to just notify services:

```javascript
this.rmqService.notify < string > ('info.none', 'My data');
```

This method returns a Promise.

-   'info.none' - name of subscription topic that you are notifying.
-   'My data' - data payload.

## Recieving messages

To listen for messages bind your controller methods to subscription topics with **RMQRoute()** decorator and you controller to **@RMQController()**:

```javascript
@RMQController()
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

Each '@RMQRoute' topic will be automatically bound to queue specified in 'queueName' option. If you want to return an Error just throw it in your method. To set '-x-status-code' use custom RMQError class.

```javascript
@RMQRoute('my.rpc')
myMethod(numbers: number[]): number {
	//...
    throw new RMQError('Error message', 2);
	throw new Error('Error message');
	//...
}
```

`@RMQRoute` handlers accepts a single parameter `msg` which is a ampq `message.content` parsed as a JSON. You may want to add additional custom layer to that message and change the way handler is called. For example you may want to structure your message with two different parts: payload (containing actual data) and context (containing request metadata) and process them explicitly in your handler. You can also decorate params passed to the handler. This is the same thing Nest does with `Request` object and decorators like `Param` or `Body`.

To do that, you may pass a param to the `RMQController` a custom message factory `msgFactory?: (msg: Message, topic: IQueueMeta) => any[];`.

The default msgFactory:

```javascript
@RMQCOntroller({
  msgFactory: (msg: Message, topic: IQueueMeta) => [JSON.parse(msg.content.toString())]
})
```

Custom msgFactory using @Payload and @Context decorators: 

```javascript
@RMQCOntroller({
  msgFactory: (msg: Message, topic: IQueueMeta) => {
    const parsed = JSON.parse(msg.content.toString());
    const contextIndex = topic.target[METADATA_KEYS.CONTEXT + topic.methodName]?.[0];
    const payloadIndex = topic.target[METADATA_KEYS.PAYLOAD + topic.methodName]?.[0];
    const response = [];
    if (payloadIndex !== undefined) {
      response[payloadIndex] = parsed.payload;
    }
    if (contextIndex !== undefined) {
      response[contextIndex] = parsed.context;
    }
    return response;
  };
})
```


## Validating data

NestJS-rmq uses [class-validator](https://github.com/typestack/class-validator) to validate incoming data. To use it, decorate your route method with `Validate`:

```javascript
import { RMQController, RMQRoute, Validate } from 'nestjs-tests';

@Validate()
@RMQRoute('my.rpc')
myMethod(data: myClass): number {
	//...
}
```

Where `myClass` is data class with validation decorators:

```javascript
import { IsString, MinLength, IsNumber } from 'class-validator';

export class myClass {
	@MinLength(2)
	@IsString()
	name: string;

	@IsNumber()
	age: string;
}
```

If your input data will be invalid, the library will send back an error without even entering your method. This will prevent you from manually validating your data inside route. You can check all available validators [here](https://github.com/typestack/class-validator).

## Using pipes

To intercept any message to any route, you can use `@RMQPipe` decorator:

```javascript
import { RMQController, RMQRoute, RMQPipe } from 'nestjs-tests';

@RMQPipe(MyPipeClass)
@RMQRoute('my.rpc')
myMethod(numbers: number[]): number {
	//...
}
```

where `MyPipeClass` extends `RMQPipeClass` with one method `transform`:

```javascript
class MyPipeClass extends RMQPipeClass {
	async transfrom(msg: Message): Promise<Message> {
		// do something
		return msg;
	}
}
```

## Using RMQErrorHandler
If you want to use custom error handler for dealing with errors from replies, use `errorHandler` in module options and pass  class that extends `RMQErrorHandler`:

```javascript
class MyErrorHandler extends RMQErrorHandler {
    public static handle(headers: IRmqErrorHeaders): Error | RMQError {
    // do something
        return new RMQError(
            headers['-x-error'],
            headers['-x-type'],
            headers['-x-status-code'],
            headers['-x-data'],
            headers['-x-service'],
            headers['-x-host']
        );
    }
}
```

## HealthCheck

RQMService provides additional method to check if you are still connected to RMQ. Although reconnection is automatic, you can provide wrong credentials and reconnection will not help. So to check connection for Docker healthCheck use:

``` javascript

const isConnected = this.rmqService.healthCheck();

```

If `isConnected` equals `true`, you are successfully connected.

## Disconnecting

If you want to close connection, for example, if you are using RMQ in testing tools, use `disconnect()` method;

## Running test
For e2e tests you need to install Docker in your machine and start RabbitMQ docker image with `docker-compose.yml` in `e2e` folder:
```
docker-compose up -d
```
Then run tests with
```
npm run test
```
![alt cover](https://github.com/AlariCode/nestjs-rmq/raw/master/img/tests.png)
