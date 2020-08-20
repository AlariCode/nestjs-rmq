# Change log

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
