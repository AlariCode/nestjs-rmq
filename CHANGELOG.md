# Change log

## 2.0.5
-   Fixed ack on validation error
-   Added warning message on RMQRoute without queue

## 2.0.4
-   Fixed validation stom request

## 2.0.3
-   Added RMQRoute mapping log on start
-   Added topic name in timeout error

## 2.0.2
-   Fix race condition on send() after start

## 2.0.1
-   Fix validate decoration order

## 2.0.0
-   Moved to NestJS DI system
-   Removed @RMQController (deprecation warning)
-   Initialization refactor.
-   Added msgFactory to @RMQRoute
-   Changed msgFactory interface.
-   MsgFactory e2e test

## 1.16.0

-   Added warning message if service name is not specified (thx @milovidov983)
-   Client and subscription channels splitted for performance (thx @milovidov983)

## 1.15.0

-   Added nack method (thx @mikelavigne)
-   Added more publish options (thx @mikelavigne)
-   Added exchange options (thx @mikelavigne)

## 1.14.0

-   Added Extended message and debug method
-   Added types to package

## 1.13.2

-   Added timestamp to message
-   Added appId and timestamp to notify

## 1.13.0

-   Added manual message acknowledgement
-   Added `@RMQMessage` decorator to get message metadata
-   Updated dependencies

## 1.12.0

-   Added healthCheck method

## 1.11.0

-   Added forRootAsync method

## 1.10.1

-   Added heartbeat option.

## 1.9.0

-   Custom message factory inside controller decorator (thx to mjarmoc)

## 1.8.0

-   Messages publishing options exposed (thx to mjarmoc)

## 1.7.1

-   Fixed event emmitor leak (thx to mjarmoc)

## 1.7.0

-   Fixed reconnection bug
-   Async init all modules loaded (thx to mjarmoc)

## 1.6.0

-   Custom logger injection (thx to @minenkom)

## 1.5.2

-   Fixed double logging

## 1.5.1

-   Fixed ack race condition
-   Added tests

## 1.5.0

-   Added error handler (thx to @mjarmoc)
-   Added more debug info to error message (thx to @mjarmoc)
-   Refactoring
-   Fixed error message ack with notify command

## 1.4.6

-   Fixed ack none RPC messages
-   Fixed logs
-   Fixed connection with messages already in queue
-   Added error if RPC method returns undefined

## 1.4.4

-   Fix await consuming replyQueue

## 1.4.3

-   Added message ack

## 1.4.0

-   Added -x-status-code and RMQError class

## 1.3.3

-   Fixed no RMQRoute issue, added error message

## 1.3.0

-   Added validation decorator.

## 1.2.0

-   Added global intercepters to deal with responses and errors

## 1.1.0

-   Added @RMQPipe to transform messages
-   Added global middleware option

## 1.0.0

-   Changed for new pattern

## 0.1.2

-   Added additional check for callback() function
-   Moved events to constants

## 0.1.1

-   Added reconnection in client and server, if your RabbitMQ instanse is down.
-   Support for multiple urls for cluster usage.

## 0.1.0

-   First stable version of the package
