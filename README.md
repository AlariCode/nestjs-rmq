# NestJS - RabbitMQ custom stratagy

This module is a custom strategy for NestJS microservice library. It allows you to use RabbitMQ as a transport for microservice messages. Learn about NestJS [here](https://nestjs.com).

To generate your microservice, just use @nestjs/cli:

``` bash
nest new my-microservice
```
Each one of your services can be a server and/or a client. To start server, change `bootstrap()` function in `main.ts`

``` javascript
import { ServerRMQ } from 'nestjs-rmq';

//...

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    strategy: new ServerRMQ({
      url: `amqp://${config.default.localhost.amqp.login}:${config.default.localhost.amqp.password}@${config.default.localhost.amqp.host}`,
      queue: 'test',
      queueOptions: { durable: false }
    })
  });
  app.listen(() => console.log('Server is listening'));
}
```
Options are:
option | type | description
--- | --- | ---
url | string | Connection url to your RabbitMQ instance. It contains user, password and host.
queue | string | Name of queue, your server will lusten to.
prefetchCount | number | Number of prefetched messages. You can read more [here](https://github.com/postwait/node-amqp).
isGlobalPrefetchCount | boolean | You can read more [here](https://github.com/postwait/node-amqp).
queueOptions | object | Additional queue options. You can read more [here](https://github.com/postwait/node-amqp).

After initializing server you can use `@MessagePattern` in controllers as described in NestJS docs.

``` javascript
@MessagePattern({ cmd: 'test' })
test(data: string): string {
    console.log('Server got: ' + data);
    return 'test' + data;
}
```
As for the clients, they have the same options:

``` javascript
import { ClientRMQ } from 'nestjs-rmq';

//...

client = new ClientRMQ({
    url: `amqp://login:password@host`,
    queue: 'test',
    queueOptions: { durable: false }
});
```
To send a message simply use `send()` function, which returns an Observable:
``` javascript
@Get('a')
a(): Observable<string> {
    let msg = 'test ' + Math.random();
    console.log('Client sent: ' + msg);
    return this.client.send<string, string>({ cmd: 'test' }, msg);
}
```